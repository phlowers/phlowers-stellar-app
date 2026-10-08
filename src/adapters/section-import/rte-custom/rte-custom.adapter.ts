/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '@core/services/logger/logger.service';
import { Section, Support } from '@shared/domain';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { SupportNameEntry } from '@shared/catalog/services/attachment.interfaces';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { adapterErrorCode, ImportError } from '@shared/import/domain/import-contracts';
import {
  SectionImportAdapter,
  SectionImportNotice,
  SectionImportPayload,
  SectionImportSource
} from '@shared/import/section-adapter/section-import-adapter';
import {
  parseBooleanOrNull,
  parseFloatOrNull
} from '@shared/import/section-adapter/section-import-parse.helpers';
import { Appartenance, Attachment, SectionImportFile, Span } from './rte-custom.interfaces';
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
  hasCantons,
  isRteCantonFormat,
  normalizeVoltage,
  validateImportedSectionFields
} from './rte-custom.helpers';

/**
 * Adapter for the RTE canton export (`cantons > general + 'portee unitaire'`, RG.CAN.* rules).
 *
 * Validates the raw file, maps it to a `Section` (resolving maintenance, voltage, attachment and chain
 * catalogs) and hands the Lambert93 support foot coordinates to the core for reprojection.
 *
 * This adapter is optional: it is enabled in `section-import-adapters.config.ts`.
 */
@Injectable()
export class RteCustomAdapter implements SectionImportAdapter {
  readonly id = RTE_CUSTOM_ADAPTER_ID;
  readonly formatLabel = RTE_CUSTOM_FORMAT_LABEL;
  readonly extensions = RTE_CUSTOM_EXTENSIONS;
  readonly mimeTypes = RTE_CUSTOM_MIME_TYPES;

  private readonly maintenanceService = inject(MaintenanceService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly chainsService = inject(ChainsService);
  private readonly linesService = inject(LinesService);
  private readonly logger = inject(LoggerService);
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

    const { section, lambertX, lambertY, hasCatalogFallbackWarnings } = await this.mapToSection(json);

    const notices: SectionImportNotice[] = [];
    if (hasCatalogFallbackWarnings) {
      notices.push({
        severity: 'warning',
        message: await this.translateScoped(RTE_CUSTOM_I18N_KEYS.catalogMissingWarning)
      });
    }

    // Validated on the raw canton fields; catalog-resolved values may legitimately break the section form rules.
    return {
      section,
      coordinates: { crs: 'LAMBERT93', x: lambertX, y: lambertY },
      notices,
      skipSectionValidation: true
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

  private async mapToSection(raw: SectionImportFile): Promise<{
    section: Section;
    lambertX: (number | null)[];
    lambertY: (number | null)[];
    hasCatalogFallbackWarnings: boolean;
  }> {
    const external = raw.cantons[0];
    const general = external.general;
    const spans = external['portee unitaire'] ?? [];

    // Sort spans by PORTEE_UNITAIRE_ORDRE (ascending)
    const sortedSpans = [...spans].sort(
      (a, b) => Number.parseFloat(a.PORTEE_UNITAIRE_ORDRE ?? '0') - Number.parseFloat(b.PORTEE_UNITAIRE_ORDRE ?? '0')
    );

    const firstSpan = sortedSpans[0];
    const appartenance = general.appartenance?.[0];

    // Maintenance lookups (RG.CAN.CEM / RG.CAN.EEL / RG.CAN.GMR)
    const allMaintenance = (await this.maintenanceService.getMaintenance()) ?? [];

    const cmDesignation = firstSpan?.CM_DESIGNATION ?? null;
    const eelDesignation = firstSpan?.EEL_DESIGNATION ?? null;
    const gmrDesignation = firstSpan?.GMR_DESIGNATION ?? null;

    const maintenanceCenterEntry = cmDesignation
      ? allMaintenance.find((m) => m.maintenance_center === cmDesignation)
      : undefined;
    const maintenanceTeamEntry = eelDesignation
      ? allMaintenance.find((m) => m.maintenance_team === eelDesignation)
      : undefined;
    const regionalTeamEntry = gmrDesignation
      ? allMaintenance.find((m) => m.regional_team === gmrDesignation)
      : undefined;

    const supports = this.mapSpansToSupports(sortedSpans);
    const attachments =
      sortedSpans.length === 0
        ? []
        : [...sortedSpans.map((p) => p['accroche depart']), sortedSpans.at(-1)!['accroche arrivee']];
    const { supports: supportsWithCatalogResolution, hasCatalogFallbackWarnings } = await this.resolveCatalogFields(
      supports,
      attachments
    );

    // Persist new support names in the local catalog (RG.CAN.ATT)
    const supportNameEntries: SupportNameEntry[] = attachments
      .map((a) => ({ supportName: a.SUPPORT_IDR || a.SUPPORT_ADR || '', supportTower: a.SUPPORT_TOWER ?? null }))
      .filter((e) => !!e.supportName);
    await this.attachmentService.addSupportNamesIfAbsent(supportNameEntries);

    const lambertX = attachments.map((a) => parseFloatOrNull(a.PIED_X_LAMBERT93));
    const lambertY = attachments.map((a) => parseFloatOrNull(a.PIED_Y_LAMBERT93));

    const voltageIdr = await this.resolveCatalogVoltage(appartenance);

    return {
      section: {
        ...createEmptySection(),
        uuid: general.CANTON_CUR.trim(),
        name: buildSectionName(
          appartenance?.BRANCHE_IDR ?? null,
          general.CANTON_TYPE,
          general.PHASE_ELECTRIQUE_NUMERO,
          supportsWithCatalogResolution
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
        voltage_idr: voltageIdr,
        voltage_adr: appartenance?.TENSION_ELECTRIQUE_ADR ?? undefined,
        maintenance_center_id: maintenanceCenterEntry?.maintenance_center_id ?? undefined,
        maintenance_team_id: maintenanceTeamEntry?.maintenance_team_id ?? undefined,
        regional_team_id: regionalTeamEntry?.regional_team_id ?? undefined,
        cm_designation: cmDesignation ?? undefined,
        gmr_designation: gmrDesignation ?? undefined,
        eel_designation: eelDesignation ?? undefined,
        initial_conditions: [],
        selected_initial_condition_uuid: undefined,
        start_latitude: null,
        start_longitude: null,
        start_azimuth: null,
        supports: supportsWithCatalogResolution,
        mean_reprojection_diff_meters: null
      },
      lambertX,
      lambertY,
      hasCatalogFallbackWarnings
    };
  }

  /**
   * Resolves `voltage_idr` against the line catalog (RG.CAN.TEN).
   *
   * `TENSION_ELECTRIQUE_IDR` and `TENSION_ELECTRIQUE_ADR` are compared, in order, to each
   * catalog line's `voltage_idr` after normalizing both sides (whitespace stripped, uppercased)
   * so formats such as "225kV" and "225 KV" match. The catalog's own `voltage_idr` value is
   * returned (not the raw external section value) so it matches the `branch_idr`-style `p-select`
   * `optionValue` exactly. Returns `undefined` when no candidate matches.
   */
  private async resolveCatalogVoltage(appartenance: Appartenance | undefined): Promise<string | undefined> {
    const candidates = [appartenance?.TENSION_ELECTRIQUE_IDR, appartenance?.TENSION_ELECTRIQUE_ADR].filter(
      (v): v is string => !!v
    );
    if (candidates.length === 0) return undefined;

    let catalogLines: Awaited<ReturnType<LinesService['getLines']>>;
    try {
      catalogLines = await this.linesService.getLines();
    } catch (err) {
      this.logger.warn('Error reading line catalog, cannot resolve voltage_idr', err);
      return undefined;
    }
    if (!catalogLines || catalogLines.length === 0) return undefined;

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeVoltage(candidate);
      const match = catalogLines.find((line) => normalizeVoltage(line.voltage_idr) === normalizedCandidate);
      if (match) return match.voltage_idr;
    }

    this.logger.warn(
      `Voltage candidates "${candidates.join('", "')}" not found in the line catalog, voltage_idr left unresolved`
    );
    return undefined;
  }

  /**
   * Resolves every support field the local catalogs are authoritative for: the attachment fields
   * against the attachment catalog, then the chain details against the chain catalog.
   */
  private async resolveCatalogFields(
    supports: Support[],
    attachments: Attachment[]
  ): Promise<{ supports: Support[]; hasCatalogFallbackWarnings: boolean }> {
    const { supports: supportsWithAttachments, hasCatalogFallbackWarnings } = await this.resolveCatalogSupportFields(
      supports,
      attachments
    );

    return {
      supports: await this.resolveCatalogChainFields(supportsWithAttachments, attachments),
      hasCatalogFallbackWarnings
    };
  }

  /**
   * Overrides each support's chain details with the chain catalog entry matching `CHAINE_DRN_IDR`.
   *
   * The catalog is authoritative whenever it holds the chain: `chainLength`, `chainWeight`,
   * `chainV` and `chainSurface` are all taken from the catalog entry, including when its value is
   * `0`. Chains absent from the catalog keep the external section file values mapped by
   * `mapAttachmentToSupport`. `counterWeight` (`CONTREPOIDS`) has no catalog counterpart and is
   * always kept from the file.
   */
  private async resolveCatalogChainFields(supports: Support[], attachments: Attachment[]): Promise<Support[]> {
    let catalogChains: Awaited<ReturnType<ChainsService['getChains']>>;
    try {
      catalogChains = await this.chainsService.getChains();
    } catch (err) {
      this.logger.warn('Error reading chain catalog, keeping external section file chain values', err);
      return supports;
    }
    if (!catalogChains || catalogChains.length === 0) {
      return supports;
    }

    const catalogChainsByName = new Map(catalogChains.map((chain) => [chain.chain_name, chain]));

    return supports.map((support, index) => {
      const chainName = attachments[index]?.CHAINE_DRN_IDR?.trim();
      if (!chainName) {
        this.logger.warn(`Support #${index}: missing CHAINE_DRN_IDR, keeping external section file chain values`);
        return support;
      }

      const catalogChain = catalogChainsByName.get(chainName);
      if (!catalogChain) {
        this.logger.warn(
          `Support #${index}: chain "${chainName}" not found in the chain catalog, keeping external section file chain values`
        );
        return support;
      }

      return {
        ...support,
        chainName: catalogChain.chain_name,
        chainLength: catalogChain.mean_length,
        chainWeight: catalogChain.mean_mass,
        chainV: catalogChain.v_chain,
        chainSurface: catalogChain.chain_surface
      };
    });
  }

  /**
   * Resolves each support's name/attachmentSet/armLength/heightBelowConsole against the local
   * attachment catalog (RG.CAN.SUP-NOM/SET/BRA).
   *
   * `AttachmentService.resolveCatalogAttachment` already guarantees a complete
   * (L/X/Y/Z) entry when it returns one, so an `undefined` result is the single signal that the
   * support is absent from the catalog — in that case the external section file values are kept as-is,
   * including `armLength` (`LONGUEUR_BRAS`) and `heightBelowConsole` (`HAUTEUR_SOUS_CONSOLE`).
   *
   * The SUPPORT_ADR fallback is only attempted when SUPPORT_IDR is absent. When SUPPORT_IDR is
   * present (even a placeholder value not registered in the catalog), the file values take
   * priority: we must not silently resolve against a SUPPORT_ADR catalog match, which would
   * override the file's own armLength/heightBelowConsole.
   */
  private async resolveCatalogSupportFields(
    supports: Support[],
    attachments: Attachment[]
  ): Promise<{ supports: Support[]; hasCatalogFallbackWarnings: boolean }> {
    let hasCatalogFallbackWarnings = false;

    const resolvedSupports = await Promise.all(
      supports.map(async (support, index) => {
        const attachment = attachments[index];
        if (!attachment) {
          return support;
        }

        const hasSupportIdr = !!attachment.SUPPORT_IDR?.trim();
        const catalogEntry = await this.attachmentService.resolveCatalogAttachment(
          attachment.SUPPORT_IDR,
          hasSupportIdr ? null : attachment.SUPPORT_ADR,
          support.attachmentSet
        );

        if (!catalogEntry) {
          hasCatalogFallbackWarnings = true;
          // Support absent from catalog: keep the external section file values for armLength
          // (LONGUEUR_BRAS) and heightBelowConsole (HAUTEUR_SOUS_CONSOLE) already mapped
          // into `support` by `mapAttachmentToSupport`.
          // Fall back to SUPPORT_ADR if SUPPORT_IDR is missing, as it's already used
          // in the catalog lookup and elsewhere as a secondary identifier.
          return {
            ...support,
            name: attachment.SUPPORT_IDR ?? attachment.SUPPORT_ADR ?? null
          };
        }

        return {
          ...support,
          name: attachment.SUPPORT_IDR ?? attachment.SUPPORT_ADR ?? null,
          attachmentSet: catalogEntry.attachment_set ?? null,
          armLength: catalogEntry.cross_arm_length ?? null,
          heightBelowConsole: catalogEntry.attachment_altitude ?? null
        };
      })
    );

    return { supports: resolvedSupports, hasCatalogFallbackWarnings };
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
      name: attachment.SUPPORT_IDR ?? null,
      number: attachment.SUPPORT_NUMERO ?? null,
      towerModel: attachment.SUPPORT_TOWER ?? null,
      attachmentPosition: extractAttachmentPosition(span.PORTEE_UNITAIRE_DESIGNATION)
    };
  }
}
