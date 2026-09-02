/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable, signal } from '@angular/core';
import { Section, Study, Support } from '@shared/domain';
import { SectionService } from '@services/section/section.service';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { ImportAdapter, ImportError, UUIDCollisionResolver } from '@shared/import/domain/import-contracts.interfaces';
import { NotificationService } from '@services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, Localization } from '@core/services/worker_python/tasks/types';
import { hasSupportsBoundsErrors } from '@features/study/presentation/components/sections-tab/newSectionModal/newSectionModal.constants';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { SupportNameEntry } from '@shared/catalog/services/attachment.interfaces';
import {
  Attachment,
  Appartenance,
  SectionImportFile,
  ImportedSection,
  Span,
  StartGps
} from './section-import.interfaces';
import { TranslocoService } from '@jsverse/transloco';
import { environment } from '@src/environments/environment';
import {
  SECTION_CATALOG_MISSING_KEY,
  IMPORT_SUCCESS_KEY,
  REPROJECTION_INFO_KEY,
  SECTION_IMPORT_ERROR_KEYS
} from './section-import.constantes';
import {
  applyFootCoordinates,
  buildReprojectionAngles,
  buildSectionName,
  computeMeanReprojectionDiffMeters,
  extractAttachmentPosition,
  extractBranchIdr,
  getMissingRequiredFields,
  normalizeVoltage,
  parseBooleanOrNull,
  parseFloatOrNull,
  validateImportedSectionFields
} from './section-import.helpers';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Service responsible for all Section JSON import business logic.
 *
 * Implements `ImportAdapter` for `Section` entities.
 * Accepts `.json` files containing a single serialized section object
 * or a canton export (structure `cantons > general + portee unitaire`).
 *
 * ### Study context
 * Before processing files, the host component **must** call
 * `SectionImportService.setStudyContext` with the active study so the
 * service can check collisions and persist the imported section.
 *
 * ### Pipeline stages performed internally
 * - **FILE_VALIDATION**: checks `.json` extension.
 * - **DECODING/PARSING**: reads raw text and parses JSON.
 * - **VALIDATION**: required fields + supports bounds (mirrors modal validation).
 * - **COLLISION_CHECK**: detects whether the UUID already exists in the study.
 * - **PERSISTENCE**: calls `SectionService.createOrUpdateSection`.
 */
@Injectable()
export class SectionImportService implements ImportAdapter<Section> {
  /** Writable signal holding the active study; must be set before processing. */
  readonly studyContext = signal<Study | null>(null);

  private readonly sectionService = inject(SectionService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly chainsService = inject(ChainsService);
  private readonly linesService = inject(LinesService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly transloco = inject(TranslocoService);

  // ---------------------------------------------------------------------------
  // Context setter
  // ---------------------------------------------------------------------------

  /**
   * Sets the study context required for collision detection and persistence.
   * Must be called by the host component before triggering imports.
   *
   * @param study - The currently active study.
   */
  setStudyContext(study: Study): void {
    this.studyContext.set(study);
  }

  // ---------------------------------------------------------------------------
  // ImportAdapter implementation
  // ---------------------------------------------------------------------------

  /**
   * Returns `true` if the file has a `.json` extension.
   */
  accepts(file: File): boolean {
    return file.name.toLowerCase().endsWith('.json');
  }

  /**
   * Checks whether the UUID encoded in the JSON file collides with an existing
   * section in the current study. Supports both legacy Section JSON and external section format.
   *
   * @returns Collision info `{ uuid, label }` or `null` if no collision.
   */
  async checkCollision(file: File): Promise<{ uuid: string; label: string } | null> {
    const study = this.studyContext();
    if (!study) return null;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;

      let uuid: string;
      if (this.isExternalSectionFormat(parsed)) {
        const sections = parsed['cantons'] as ImportedSection[];
        uuid = sections[0].general.CANTON_CUR.trim();
      } else {
        uuid = typeof parsed['uuid'] === 'string' ? parsed['uuid'].trim() : '';
      }

      if (!uuid) return null;
      const existing = study.sections.find((s) => s.uuid === uuid);
      if (!existing) return null;
      return { uuid, label: existing.name };
    } catch {
      // If we cannot parse at check time, let processFile handle the error properly.
      return null;
    }
  }

  /**
   * Runs the full import pipeline for the given JSON file.
   *
   * @returns The created or updated `Section`, or `null` if the user rejected a
   *   UUID collision prompt.
   * @throws An `ImportError`-shaped object on any unrecoverable failure.
   */
  async processFile(file: File, collisionResolver: UUIDCollisionResolver): Promise<Section | null> {
    const study = this.studyContext();
    if (!study) {
      const error: ImportError = {
        code: 'PERSISTENCE_ERROR',
        message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.sectionImportError),
        stage: 'PERSISTENCE'
      };
      throw error;
    }

    // Stage: DECODING + PARSING
    const { section, isExternalFormat, rawExternalSection, hasCatalogFallbackWarnings } =
      await this.parseJsonFile(file);

    // Stage: VALIDATION
    // External format: validate on the raw JSON so error messages show original field names
    // and values (e.g. "SUPPORT_NUMERO: null").
    // Legacy Section: validate on the mapped model (JSON keys already match model names).
    if (isExternalFormat && rawExternalSection) {
      this.validateExternalSection(rawExternalSection);
    } else {
      this.validateSection(section);
    }

    // Stage: COLLISION_CHECK + PERSISTENCE
    return this.persistSection(section, study, collisionResolver, isExternalFormat && hasCatalogFallbackWarnings);
  }

  // ---------------------------------------------------------------------------
  // Private — format detection
  // ---------------------------------------------------------------------------

  /** Returns `true` when the raw object has a `cantons` array with at least one entry. */
  private hasSections(raw: Record<string, unknown>): boolean {
    return Array.isArray(raw['cantons']) && (raw['cantons'] as unknown[]).length > 0;
  }

  /**
   * Returns `true` when the raw object is a valid external section format
   * (has `cantons[0].general.CANTON_CUR`).
   */
  private isExternalSectionFormat(raw: unknown): boolean {
    if (typeof raw !== 'object' || raw === null) return false;
    const r = raw as Record<string, unknown>;
    if (!Array.isArray(r['cantons']) || (r['cantons'] as unknown[]).length === 0) return false;
    const canton0 = (r['cantons'] as unknown[])[0];
    if (typeof canton0 !== 'object' || canton0 === null) return false;
    const general = (canton0 as Record<string, unknown>)['general'];
    if (typeof general !== 'object' || general === null) return false;
    return typeof (general as Record<string, unknown>)['CANTON_CUR'] === 'string';
  }

  // ---------------------------------------------------------------------------
  // Private — parsing
  // ---------------------------------------------------------------------------

  private async parseJsonFile(file: File): Promise<{
    section: Section;
    isExternalFormat: boolean;
    rawExternalSection?: SectionImportFile;
    hasCatalogFallbackWarnings: boolean;
  }> {
    let text: string;
    try {
      text = await file.text();
    } catch (err: unknown) {
      this.logger.error('Error reading section file', err);
      const error: ImportError = {
        code: 'FILE_READ_ERROR',
        message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.fileReadError),
        stage: 'DECODING',
        cause: err
      };
      throw error;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch (err: unknown) {
      this.logger.error('Error parsing section JSON', err);
      const error: ImportError = {
        code: 'FILE_PARSE_ERROR',
        message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.fileParseError),
        stage: 'PARSING',
        cause: err
      };
      throw error;
    }

    // External section format detection (RG.CAN.OUV-BTN.3)
    if (this.hasSections(parsed)) {
      if (!this.isExternalSectionFormat(parsed)) {
        const error: ImportError = {
          code: 'VALIDATION_ERROR',
          message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.sectionFormatError),
          stage: 'VALIDATION'
        };
        throw error;
      }
      const rawExternalSection = parsed as unknown as SectionImportFile;
      const { section, hasCatalogFallbackWarnings } = await this.mapExternalSectionToSection(rawExternalSection);
      return { section, isExternalFormat: true, rawExternalSection, hasCatalogFallbackWarnings };
    }

    return { section: this.mapToSection(parsed), isExternalFormat: false, hasCatalogFallbackWarnings: false };
  }

  // ---------------------------------------------------------------------------
  // Private — External section mapping
  // ---------------------------------------------------------------------------

  private async mapExternalSectionToSection(raw: SectionImportFile): Promise<{
    section: Section;
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
    const {
      supports: reprojectedSupports,
      meanReprojectionDiffMeters,
      startGps
    } = await this.applyLambertReprojection(supportsWithCatalogResolution, lambertX, lambertY);

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
        lit_name: appartenance?.LIT_ADR ?? undefined,
        lit_code: appartenance?.LIT_IDR ?? undefined,
        link_name: appartenance?.LIAISON_IDR ?? undefined,
        branch_idr: appartenance?.BRANCHE_IDR ? extractBranchIdr(appartenance.BRANCHE_IDR) : undefined,
        voltage_idr: voltageIdr,
        maintenance_center_id: maintenanceCenterEntry?.maintenance_center_id ?? undefined,
        maintenance_center_names: cmDesignation ? [cmDesignation] : [],
        maintenance_team_id: maintenanceTeamEntry?.maintenance_team_id ?? undefined,
        regional_team_id: regionalTeamEntry?.regional_team_id ?? undefined,
        regional_maintenance_center_names: gmrDesignation ? [gmrDesignation] : [],
        initial_conditions: [],
        selected_initial_condition_uuid: undefined,
        start_latitude: startGps?.startLatitude ?? null,
        start_longitude: startGps?.startLongitude ?? null,
        start_azimuth: startGps?.startAzimuth ?? null,
        supports: reprojectedSupports,
        mean_reprojection_diff_meters: meanReprojectionDiffMeters
      },
      hasCatalogFallbackWarnings
    };
  }

  /**
   * Resolves every support field the local catalogs are authoritative for: the attachment fields
   * against the attachment catalog, then the chain details against the chain catalog.
   *
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

  // ---------------------------------------------------------------------------
  // Private — Lambert93 to GPS reprojection
  // ---------------------------------------------------------------------------

  /**
   * Converts each support's raw Lambert93 foot coordinates to GPS (`footLatitude`/`footLongitude`)
   * and computes the mean absolute error (meters) between the surveyed Lambert93 positions and
   * the app's span/angle data model reprojection.
   *
   * Uses only the existing `Task.importLambert`, `Task.importLambertAndValidate` and
   * `Task.computeLocalization` Python tasks — no new conversion logic is introduced.
   * If any support is missing its raw Lambert93 coordinates, the whole reprojection is skipped
   * (supports are returned unchanged, `meanReprojectionDiffMeters` is `null`) rather than blocking the import.
   *
   * @throws An `ImportError` (`MAPPING_ERROR`/`MAPPING`) if the worker reports an error or returns
   *   no result for any of the three calls.
   */
  private async applyLambertReprojection(
    supports: Support[],
    lambertX: (number | null)[],
    lambertY: (number | null)[]
  ): Promise<{
    supports: Support[];
    meanReprojectionDiffMeters: number | null;
    startGps: StartGps | null;
  }> {
    if (lambertX.includes(null) || lambertY.includes(null)) {
      this.logger.error('Skipping Lambert93 to GPS reprojection: missing raw coordinates on at least one support');
      return { supports, meanReprojectionDiffMeters: null, startGps: null };
    }

    const lambert_x = lambertX as number[];
    const lambert_y = lambertY as number[];
    const { spanLength, lineAngle } = buildReprojectionAngles(supports);

    const start = await this.bootstrapLambertStartPoint(lambert_x, lambert_y);
    const localization = await this.validateLambertLocalization(lambert_x, lambert_y, start, spanLength, lineAngle);
    const reconstructed = await this.reconstructLocalization(start, spanLength, lineAngle);

    const updatedSupports = applyFootCoordinates(supports, localization.latitude, localization.longitude);
    const meanReprojectionDiffMeters = computeMeanReprojectionDiffMeters(
      lambert_x,
      lambert_y,
      reconstructed.lambert_x,
      reconstructed.lambert_y
    );

    return {
      supports: updatedSupports,
      meanReprojectionDiffMeters,
      startGps: {
        startLatitude: localization.latitude[0],
        startLongitude: localization.longitude[0],
        startAzimuth: localization.azimuth[0]
      }
    };
  }

  /** Call 1 — bootstrap: direct conversion of the raw Lambert93 arrays to get a start point. */
  private async bootstrapLambertStartPoint(
    lambert_x: number[],
    lambert_y: number[]
  ): Promise<{ startLatitude: number; startLongitude: number; startAzimuth: number }> {
    const bootstrap = await this.workerPythonService.runTask(Task.importLambert, { lambert_x, lambert_y });
    if (bootstrap.error || !bootstrap.result) {
      throw this.buildLambertReprojectionError();
    }
    return {
      startLatitude: bootstrap.result.latitude[0],
      startLongitude: bootstrap.result.longitude[0],
      startAzimuth: bootstrap.result.azimuth[0]
    };
  }

  /** Call 2 — direct conversion + degree-based validation (the actual "import lambert validate" task). */
  private async validateLambertLocalization(
    lambert_x: number[],
    lambert_y: number[],
    start: { startLatitude: number; startLongitude: number; startAzimuth: number },
    spanLength: number[],
    lineAngle: number[]
  ): Promise<Localization> {
    const validated = await this.workerPythonService.runTask(Task.importLambertAndValidate, {
      lambert_x,
      lambert_y,
      ...start,
      spanLength,
      lineAngle
    });
    if (validated.error || !validated.result) {
      throw this.buildLambertReprojectionError();
    }
    return validated.result.localization;
  }

  /**
   * Call 3 — reprojection using only the app's span/angle data model (no surveyed Lambert93 input),
   * used to compare against the surveyed coordinates in meters.
   */
  private async reconstructLocalization(
    start: { startLatitude: number; startLongitude: number; startAzimuth: number },
    spanLength: number[],
    lineAngle: number[]
  ): Promise<Localization> {
    const reconstructed = await this.workerPythonService.runTask(Task.computeLocalization, {
      ...start,
      spanLength,
      lineAngle
    });
    if (reconstructed.error || !reconstructed.result) {
      throw this.buildLambertReprojectionError();
    }
    return reconstructed.result;
  }

  private buildLambertReprojectionError(): ImportError {
    return {
      code: 'MAPPING_ERROR',
      message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.lambertReprojectionError),
      stage: 'MAPPING'
    };
  }

  // ---------------------------------------------------------------------------
  // Private — legacy mapping
  // ---------------------------------------------------------------------------

  private mapToSection(raw: Record<string, unknown>): Section {
    const supports = this.mapSupports(raw['supports']);
    const uuid = typeof raw['uuid'] === 'string' ? raw['uuid'].trim() : raw['uuid'];
    return {
      ...createEmptySection(),
      ...raw,
      uuid,
      supports
    } as Section;
  }

  private mapSupports(rawSupports: unknown): Support[] {
    if (!Array.isArray(rawSupports) || rawSupports.length === 0) {
      // Fall back to the default pair created by createEmptySection.
      return [];
    }
    return (rawSupports as unknown[]).map((s) => ({
      ...createEmptySupport(),
      ...(s as Record<string, unknown>)
    })) as Support[];
  }

  // ---------------------------------------------------------------------------
  // Private — validation
  // ---------------------------------------------------------------------------

  private validateExternalSection(raw: SectionImportFile): void {
    const fieldErrors = validateImportedSectionFields(raw);
    if (fieldErrors.length > 0) {
      const detail = fieldErrors.map((e) => `${e.field}: ${String(e.value)}`).join('; ');
      const error: ImportError = {
        code: 'VALIDATION_ERROR',
        message: `${this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.validationErrorRequiredFields)}: ${detail}`,
        stage: 'VALIDATION'
      };
      throw error;
    }
  }

  private validateSection(section: Section): void {
    const missingFields = getMissingRequiredFields(section);
    if (missingFields.length > 0) {
      const error: ImportError = {
        code: 'VALIDATION_ERROR',
        message: `${this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.validationErrorRequiredFields)}: ${missingFields.join(', ')}`,
        stage: 'VALIDATION'
      };
      throw error;
    }

    if (hasSupportsBoundsErrors(section)) {
      const error: ImportError = {
        code: 'VALIDATION_ERROR',
        message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.validationErrorSupportsBounds),
        stage: 'VALIDATION'
      };
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Private — persistence
  // ---------------------------------------------------------------------------

  private async persistSection(
    section: Section,
    study: Study,
    collisionResolver: UUIDCollisionResolver,
    hasCatalogFallbackWarnings: boolean
  ): Promise<Section | null> {
    const existingSection = study.sections.find((s) => s.uuid === section.uuid);

    if (existingSection) {
      const shouldReplace = await collisionResolver(section.uuid, existingSection.name);
      if (!shouldReplace) {
        return null;
      }
      // Delete the existing section first, then re-create below.
      try {
        await this.sectionService.deleteSection(study, existingSection);
      } catch (err: unknown) {
        this.logger.error('Error deleting existing section', err);
        const error: ImportError = {
          code: 'PERSISTENCE_ERROR',
          message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.sectionDeleteError),
          stage: 'PERSISTENCE',
          cause: err
        };
        throw error;
      }

      try {
        await this.sectionService.createOrUpdateSection(study, section);
      } catch (err: unknown) {
        this.logger.error('Error persisting section', err);
        await this.sectionService.createOrUpdateSection(study, existingSection).catch((restoreErr: unknown) => {
          this.logger.error('Failed to restore section after failed replacement', restoreErr);
        });
        const error: ImportError = {
          code: 'PERSISTENCE_ERROR',
          message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.sectionImportError),
          stage: 'PERSISTENCE',
          cause: err
        };
        throw error;
      }

      this.notificationService.success(this.transloco.translate(IMPORT_SUCCESS_KEY));
      this.notifyGpsReprojection(section);
      this.notifyCatalogFallbackWarnings(hasCatalogFallbackWarnings);
      return section;
    }

    try {
      await this.sectionService.createOrUpdateSection(study, section);
    } catch (err: unknown) {
      this.logger.error('Error persisting section', err);
      const error: ImportError = {
        code: 'PERSISTENCE_ERROR',
        message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.sectionImportError),
        stage: 'PERSISTENCE',
        cause: err
      };
      throw error;
    }

    this.notificationService.success(this.transloco.translate(IMPORT_SUCCESS_KEY));
    this.notifyGpsReprojection(section);
    this.notifyCatalogFallbackWarnings(hasCatalogFallbackWarnings);
    return section;
  }

  /**
   * Shows an info toast reporting the mean Lambert93-to-GPS reprojection error (meters), when one
   * was computed for this import (see `applyLambertReprojection`).
   */
  private notifyGpsReprojection(section: Section): void {
    if (section.mean_reprojection_diff_meters != null) {
      this.notificationService.info(
        this.transloco.translate(REPROJECTION_INFO_KEY, {
          appName: environment.appName,
          error: section.mean_reprojection_diff_meters.toFixed(1)
        })
      );
    }
  }

  private notifyCatalogFallbackWarnings(hasCatalogFallbackWarnings: boolean): void {
    if (!hasCatalogFallbackWarnings) {
      return;
    }

    this.notificationService.warning(this.transloco.translate(SECTION_CATALOG_MISSING_KEY));
  }
}
