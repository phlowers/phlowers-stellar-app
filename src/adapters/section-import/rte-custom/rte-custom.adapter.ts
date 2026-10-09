/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { Section, Support } from '@shared/domain';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { adapterErrorCode, ImportError } from '@shared/import/domain/import-contracts';
import {
  SectionImportAdapter,
  SectionImportPayload,
  SectionImportSource
} from '@shared/import/section-adapter/section-import-adapter';
import { parseBooleanOrNull, parseFloatOrNull } from '@shared/import/section-adapter/section-import-parse.helpers';
import { Attachment, SectionImportFile, Span } from './rte-custom.interfaces';
import {
  RTE_CUSTOM_ADAPTER_ID,
  RTE_CUSTOM_ERROR_CODES,
  RTE_CUSTOM_EXTENSIONS,
  RTE_CUSTOM_FORMAT_LABEL,
  RTE_CUSTOM_I18N_KEYS,
  RTE_CUSTOM_MIME_TYPES,
  RTE_CUSTOM_REQUIRED_FIELDS_KEY,
  RTE_CUSTOM_TRANSLOCO_SCOPE
} from './rte-custom.constantes';
import {
  buildSectionName,
  extractAttachmentPosition,
  extractCantonUuid,
  filterMeaningfulSpans,
  findFirstMeaningfulAppartenance,
  hasCantons,
  isRteCantonFormat,
  pickSupportName,
  validateImportedSectionFields
} from './rte-custom.helpers';

/**
 * Adapter for the RTE canton export (`cantons > general + 'portee unitaire'`, RG.CAN.* rules).
 *
 * Validates the raw file and maps it to a `Section` carrying the catalog lookup keys (designations,
 * voltage, support name, attachment set, chain name) and the Lambert93 support foot coordinates.
 * Catalog correction and reprojection are done by the core (`applyCatalogCorrections: true`).
 *
 * This adapter is optional: it is enabled in `section-import-adapters.config.ts`.
 */
@Injectable()
export class RteCustomAdapter implements SectionImportAdapter {
  readonly id = RTE_CUSTOM_ADAPTER_ID;
  readonly formatLabel = RTE_CUSTOM_FORMAT_LABEL;
  readonly extensions = RTE_CUSTOM_EXTENSIONS;
  readonly mimeTypes = RTE_CUSTOM_MIME_TYPES;

  private readonly transloco = inject(TranslocoService);

  canHandle(source: SectionImportSource): boolean {
    return hasCantons(source.json);
  }

  extractUuid(source: SectionImportSource): string | null {
    return extractCantonUuid(source.json);
  }

  async import(source: SectionImportSource): Promise<SectionImportPayload> {
    const json = source.json;
    if (!isRteCantonFormat(json)) {
      throw await this.buildFormatError();
    }

    this.validate(json);

    const { section, lambertX, lambertY } = this.mapToSection(json);

    return {
      section,
      coordinates: { crs: 'LAMBERT93', x: lambertX, y: lambertY },
      applyCatalogCorrections: true
    };
  }

  // ---------------------------------------------------------------------------
  // Private — errors and translations
  // ---------------------------------------------------------------------------

  /** Scoped translation: awaits the adapter's inline translation files before resolving the key. */
  private translateScoped(key: string): Promise<string> {
    return firstValueFrom(this.transloco.selectTranslate<string>(key, {}, RTE_CUSTOM_TRANSLOCO_SCOPE));
  }

  private async buildFormatError(): Promise<ImportError> {
    return {
      code: adapterErrorCode(RTE_CUSTOM_ERROR_CODES.formatError),
      message: await this.translateScoped(RTE_CUSTOM_I18N_KEYS.formatError),
      stage: 'VALIDATION'
    };
  }

  // ---------------------------------------------------------------------------
  // Private — validation
  // ---------------------------------------------------------------------------

  /** Validates on the raw JSON so messages show the original field names and values (e.g. "SUPPORT_NUMERO: null"). */
  private validate(raw: SectionImportFile): void {
    const fieldErrors = validateImportedSectionFields(raw);
    if (fieldErrors.length > 0) {
      const detail = fieldErrors.map((e) => `${e.field}: ${String(e.value)}`).join('; ');
      const error: ImportError = {
        code: adapterErrorCode(RTE_CUSTOM_ERROR_CODES.requiredFields),
        message: `${this.transloco.translate(RTE_CUSTOM_REQUIRED_FIELDS_KEY)}: ${detail}`,
        stage: 'VALIDATION'
      };
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Private — mapping
  // ---------------------------------------------------------------------------

  private mapToSection(raw: SectionImportFile): {
    section: Section;
    lambertX: (number | null)[];
    lambertY: (number | null)[];
  } {
    const external = raw.cantons[0];
    const general = external.general;
    const spans = filterMeaningfulSpans(external['portee unitaire'] ?? []);

    // Sort spans by PORTEE_UNITAIRE_ORDRE (ascending)
    const sortedSpans = [...spans].sort(
      (a, b) => Number.parseFloat(a.PORTEE_UNITAIRE_ORDRE ?? '0') - Number.parseFloat(b.PORTEE_UNITAIRE_ORDRE ?? '0')
    );

    const firstSpan = sortedSpans[0];
    const appartenance = findFirstMeaningfulAppartenance(general);

    const supports = this.mapSpansToSupports(sortedSpans);
    const attachments =
      sortedSpans.length === 0
        ? []
        : [...sortedSpans.map((p) => p['accroche depart']), sortedSpans.at(-1)!['accroche arrivee']];

    const lambertX = attachments.map((a) => parseFloatOrNull(a.PIED_X_LAMBERT93));
    const lambertY = attachments.map((a) => parseFloatOrNull(a.PIED_Y_LAMBERT93));

    return {
      section: {
        ...createEmptySection(),
        uuid: general.CANTON_CUR.trim(),
        name: buildSectionName(
          appartenance?.BRANCHE_IDR ?? null,
          general.CANTON_TYPE,
          general.PHASE_ELECTRIQUE_NUMERO,
          supports
        ),
        cable_name: general.CABLE_ADR ?? undefined,
        type: general.CANTON_TYPE?.toLowerCase() ?? '',
        cables_amount: parseFloatOrNull(general.FAISCEAU_CABLES_NOMBRE) ?? 1,
        electric_phase_number: parseFloatOrNull(general.PHASE_ELECTRIQUE_NUMERO) ?? undefined,
        lit_adr: appartenance?.LIT_ADR ?? undefined,
        lit_idr: appartenance?.LIT_IDR ?? undefined,
        link_idr: appartenance?.LIAISON_IDR ?? undefined,
        link_adr: appartenance?.LIAISON_ADR ?? undefined,
        branch_idr: appartenance?.BRANCHE_IDR ?? undefined,
        branch_adr: appartenance?.BRANCHE_ADR ?? undefined,
        voltage_idr: appartenance?.TENSION_ELECTRIQUE_IDR ?? undefined,
        voltage_adr: appartenance?.TENSION_ELECTRIQUE_ADR ?? undefined,
        cm_designation: firstSpan?.CM_DESIGNATION ?? undefined,
        gmr_designation: firstSpan?.GMR_DESIGNATION ?? undefined,
        eel_designation: firstSpan?.EEL_DESIGNATION ?? undefined,
        initial_conditions: [],
        selected_initial_condition_uuid: undefined,
        start_latitude: null,
        start_longitude: null,
        start_azimuth: null,
        supports,
        mean_reprojection_diff_meters: null
      },
      lambertX,
      lambertY
    };
  }

  private mapSpansToSupports(sortedSpans: Span[]): Support[] {
    if (sortedSpans.length === 0) return [];

    const supports: Support[] = [];

    for (const span of sortedSpans) {
      supports.push(this.mapAttachmentToSupport(span['accroche depart'], span));
    }

    // Last support comes from 'accroche arrivee' of the last span
    // spanLength must be null on the last support (no span after it)
    const lastSpan = sortedSpans.at(-1)!;
    const lastSupport = this.mapAttachmentToSupport(lastSpan['accroche arrivee'], lastSpan);
    lastSupport.spanLength = null;
    supports.push(lastSupport);

    return supports;
  }

  private mapAttachmentToSupport(attachment: Attachment, span: Span): Support {
    return {
      ...createEmptySupport(),
      spanLength: parseFloatOrNull(span.PORTEE_LONGUEUR),
      spanAzimut: parseFloatOrNull(span.PORTEE_AZIMUT),
      spanAngle: parseFloatOrNull(attachment.ANGLE_LIGNE),
      attachmentSet: parseFloatOrNull(attachment.ACCROCHE_SET),
      attachmentHeight: parseFloatOrNull(attachment.ACCROCHE_CABLE_Z_LAMBERT93),
      heightBelowConsole: parseFloatOrNull(attachment.HAUTEUR_SOUS_CONSOLE),
      armLength: parseFloatOrNull(attachment.LONGUEUR_BRAS),
      chainName: attachment.CHAINE_DRN_IDR ?? null,
      chainLength: parseFloatOrNull(attachment.CHAINE_DRN_LONGUEUR),
      chainWeight: parseFloatOrNull(attachment.CHAINE_DRN_POIDS),
      chainV: parseBooleanOrNull(attachment.CHAINE_EN_V),
      counterWeight: parseFloatOrNull(attachment.CONTREPOIDS),
      chainSurface: parseFloatOrNull(attachment.CHAINE_DRN_SURFACE),
      supportFootAltitude: parseFloatOrNull(attachment.PIED_Z_LAMBERT93),
      name: pickSupportName(attachment),
      number: attachment.SUPPORT_NUMERO ?? null,
      towerModel: attachment.SUPPORT_TOWER ?? null,
      attachmentPosition: extractAttachmentPosition(span.PORTEE_UNITAIRE_DESIGNATION)
    };
  }
}
