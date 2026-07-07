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
import { Task } from '@core/services/worker_python/tasks/types';
import { hasSupportsBoundsErrors } from '@features/study/presentation/components/sections-tab/newSectionModal/newSectionModal.constants';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { SupportNameEntry } from '@shared/catalog/services/attachment.interfaces';
import { sectionImportErrors, importSuccessDetail, buildGpsReprojectionInfoMessage } from './section-import.constantes';
import { GeoLiaisonAccroche, GeoLiaisonCanton, GeoLiaisonFormat, GeoLiaisonPortee } from './section-import.interfaces';
import {
  buildSectionName,
  extractAttachmentPosition,
  extractBranchIdr,
  getMissingRequiredFields,
  parseBooleanOrNull,
  parseFloatOrNull,
  validateGeoLiaisonRawFields
} from './section-import.helpers';

// ---------------------------------------------------------------------------
// Error catalog
// ---------------------------------------------------------------------------

// Re-export the error catalog so consumers can import from a single entry point.
export { sectionImportErrors } from './section-import.constantes';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Service responsible for all Section JSON import business logic.
 *
 * Implements `ImportAdapter` for `Section` entities.
 * Accepts `.json` files containing a single serialized section object
 * or a GeoLiaison canton export (structure `cantons > general + portee unitaire`).
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
  private readonly workerPythonService = inject(WorkerPythonService);

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
   * section in the current study. Supports both legacy Section JSON and GeoLiaison format.
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
      if (this.isGeoLiaisonFormat(parsed)) {
        const cantons = parsed['cantons'] as GeoLiaisonCanton[];
        uuid = cantons[0].general.CANTON_CUR.trim();
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
        message: sectionImportErrors.sectionImportError,
        stage: 'PERSISTENCE'
      };
      throw error;
    }

    // Stage: DECODING + PARSING
    const { section, isGeoLiaison, rawGeoLiaison } = await this.parseJsonFile(file);

    // Stage: VALIDATION
    // GeoLiaison: validate on the raw JSON so error messages show original field names
    // and values (e.g. "SUPPORT_NUMERO: null").
    // Legacy Section: validate on the mapped model (JSON keys already match model names).
    if (isGeoLiaison && rawGeoLiaison) {
      this.validateGeoLiaisonSection(rawGeoLiaison);
    } else {
      this.validateSection(section);
    }

    // Stage: COLLISION_CHECK + PERSISTENCE
    return this.persistSection(section, study, collisionResolver);
  }

  // ---------------------------------------------------------------------------
  // Private — format detection
  // ---------------------------------------------------------------------------

  /** Returns `true` when the raw object has a `cantons` array with at least one entry. */
  private hasCantons(raw: Record<string, unknown>): boolean {
    return Array.isArray(raw['cantons']) && (raw['cantons'] as unknown[]).length > 0;
  }

  /**
   * Returns `true` when the raw object is a valid GeoLiaison format
   * (has `cantons[0].general.CANTON_CUR`).
   */
  private isGeoLiaisonFormat(raw: unknown): boolean {
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

  private async parseJsonFile(
    file: File
  ): Promise<{ section: Section; isGeoLiaison: boolean; rawGeoLiaison?: GeoLiaisonFormat }> {
    let text: string;
    try {
      text = await file.text();
    } catch (err: unknown) {
      this.logger.error('Error reading section file', err);
      const error: ImportError = {
        code: 'FILE_READ_ERROR',
        message: sectionImportErrors.fileReadError,
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
        message: sectionImportErrors.fileParseError,
        stage: 'PARSING',
        cause: err
      };
      throw error;
    }

    // GeoLiaison format detection (RG.CAN.OUV-BTN.3)
    if (this.hasCantons(parsed)) {
      if (!this.isGeoLiaisonFormat(parsed)) {
        const error: ImportError = {
          code: 'VALIDATION_ERROR',
          message: sectionImportErrors.geoLiaisonFormatError,
          stage: 'VALIDATION'
        };
        throw error;
      }
      const rawGeoLiaison = parsed as unknown as GeoLiaisonFormat;
      const section = await this.mapGeoLiaisonToSection(rawGeoLiaison);
      return { section, isGeoLiaison: true, rawGeoLiaison };
    }

    return { section: this.mapToSection(parsed), isGeoLiaison: false };
  }

  // ---------------------------------------------------------------------------
  // Private — GeoLiaison mapping
  // ---------------------------------------------------------------------------

  private async mapGeoLiaisonToSection(raw: GeoLiaisonFormat): Promise<Section> {
    const canton = raw.cantons[0];
    const general = canton.general;
    const portees = canton['portee unitaire'] ?? [];

    // Sort portees by PORTEE_UNITAIRE_ORDRE (ascending)
    const sortedPortees = [...portees].sort(
      (a, b) => parseFloat(a.PORTEE_UNITAIRE_ORDRE ?? '0') - parseFloat(b.PORTEE_UNITAIRE_ORDRE ?? '0')
    );

    const firstPortee = sortedPortees[0];
    const appartenance = general.appartenance?.[0];

    // Maintenance lookups (RG.CAN.CEM / RG.CAN.EEL / RG.CAN.GMR)
    const allMaintenance = (await this.maintenanceService.getMaintenance()) ?? [];

    const cmDesignation = firstPortee?.CM_DESIGNATION ?? null;
    const eelDesignation = firstPortee?.EEL_DESIGNATION ?? null;
    const gmrDesignation = firstPortee?.GMR_DESIGNATION ?? null;

    const maintenanceCenterEntry = cmDesignation
      ? allMaintenance.find((m) => m.maintenance_center === cmDesignation)
      : undefined;
    const maintenanceTeamEntry = eelDesignation
      ? allMaintenance.find((m) => m.maintenance_team === eelDesignation)
      : undefined;
    const regionalTeamEntry = gmrDesignation
      ? allMaintenance.find((m) => m.regional_team === gmrDesignation)
      : undefined;

    const supports = this.mapGeoLiaisonSupports(sortedPortees);

    // Persist new support names in the local catalog (RG.CAN.ATT)
    const accroches =
      sortedPortees.length === 0
        ? []
        : [
            ...sortedPortees.map((p) => p['accroche depart']),
            sortedPortees[sortedPortees.length - 1]['accroche arrivee']
          ];
    const supportNameEntries: SupportNameEntry[] = accroches
      .map((a) => ({ supportName: a.SUPPORT_IDR || a.SUPPORT_ADR || '', supportTower: a.SUPPORT_TOWER ?? null }))
      .filter((e) => !!e.supportName);
    await this.attachmentService.addSupportNamesIfAbsent(supportNameEntries);

    const lambertX = accroches.map((a) => parseFloatOrNull(a.PIED_X_LAMBERT93));
    const lambertY = accroches.map((a) => parseFloatOrNull(a.PIED_Y_LAMBERT93));
    const { supports: reprojectedSupports, meanGpsDiffMeters } = await this.applyLambertReprojection(
      supports,
      lambertX,
      lambertY
    );

    return {
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
      lit_name: appartenance?.LIT_ADR ?? undefined,
      lit_code: appartenance?.LIT_IDR ?? undefined,
      link_name: appartenance?.LIAISON_IDR ?? undefined,
      branch_idr: appartenance?.BRANCHE_IDR ? extractBranchIdr(appartenance.BRANCHE_IDR) : undefined,
      voltage_idr: undefined,
      maintenance_center_id: maintenanceCenterEntry?.maintenance_center_id ?? undefined,
      maintenance_center_names: cmDesignation ? [cmDesignation] : [],
      maintenance_team_id: maintenanceTeamEntry?.maintenance_team_id ?? undefined,
      regional_team_id: regionalTeamEntry?.regional_team_id ?? undefined,
      regional_maintenance_center_names: gmrDesignation ? [gmrDesignation] : [],
      initial_conditions: [],
      selected_initial_condition_uuid: undefined,
      supports: reprojectedSupports,
      mean_gps_diff_meters: meanGpsDiffMeters
    };
  }

  private mapGeoLiaisonSupports(sortedPortees: GeoLiaisonPortee[]): Support[] {
    if (sortedPortees.length === 0) return [];

    const supports: Support[] = [];

    for (const portee of sortedPortees) {
      supports.push(this.mapAccrocheToSupport(portee['accroche depart'], portee));
    }

    // Last support comes from 'accroche arrivee' of the last portee
    // spanLength must be null on the last support (no span after it)
    const lastPortee = sortedPortees[sortedPortees.length - 1];
    const lastSupport = this.mapAccrocheToSupport(lastPortee['accroche arrivee'], lastPortee);
    lastSupport.spanLength = null;
    supports.push(lastSupport);

    return supports;
  }

  private mapAccrocheToSupport(accroche: GeoLiaisonAccroche, portee: GeoLiaisonPortee): Support {
    return {
      ...createEmptySupport(),
      spanLength: parseFloatOrNull(portee.PORTEE_LONGUEUR),
      spanAzimut: parseFloatOrNull(portee.PORTEE_AZIMUT),
      spanAngle: parseFloatOrNull(accroche.ANGLE_LIGNE),
      attachmentSet: parseFloatOrNull(accroche.ACCROCHE_SET),
      attachmentHeight: parseFloatOrNull(accroche.ACCROCHE_CABLE_Z_LAMBERT93),
      heightBelowConsole: parseFloatOrNull(accroche.HAUTEUR_SOUS_CONSOLE),
      armLength: parseFloatOrNull(accroche.LONGUEUR_BRAS),
      chainName: accroche.CHAINE_DRN_IDR ?? null,
      chainLength: parseFloatOrNull(accroche.CHAINE_DRN_LONGUEUR),
      chainWeight: parseFloatOrNull(accroche.CHAINE_DRN_POIDS),
      chainV: parseBooleanOrNull(accroche.CHAINE_EN_V),
      counterWeight: parseFloatOrNull(accroche.CONTREPOIDS),
      chainSurface: parseFloatOrNull(accroche.CHAINE_DRN_SURFACE),
      supportFootAltitude: parseFloatOrNull(accroche.PIED_Z_LAMBERT93),
      name: accroche.SUPPORT_IDR ?? null,
      number: accroche.SUPPORT_NUMERO ?? null,
      towerModel: accroche.SUPPORT_TOWER ?? null,
      attachmentPosition: extractAttachmentPosition(portee.PORTEE_UNITAIRE_DESIGNATION)
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
   * (supports are returned unchanged, `meanGpsDiffMeters` is `null`) rather than blocking the import.
   *
   * @throws An `ImportError` (`MAPPING_ERROR`/`MAPPING`) if the worker reports an error or returns
   *   no result for any of the three calls.
   */
  private async applyLambertReprojection(
    supports: Support[],
    lambertX: (number | null)[],
    lambertY: (number | null)[]
  ): Promise<{ supports: Support[]; meanGpsDiffMeters: number | null }> {
    if (lambertX.some((x) => x === null) || lambertY.some((y) => y === null)) {
      this.logger.error('Skipping Lambert93 to GPS reprojection: missing raw coordinates on at least one support');
      return { supports, meanGpsDiffMeters: null };
    }

    const lambert_x = lambertX as number[];
    const lambert_y = lambertY as number[];
    const lastIndex = supports.length - 1;
    const spanLength = supports.map((s, i) => (i === lastIndex ? Number.NaN : s.spanLength!));
    const lineAngle = supports.map((s, i) => (i === lastIndex ? 0 : s.spanAngle!));

    // Call 1 — bootstrap: direct conversion of the raw Lambert93 arrays to get a start point.
    const bootstrap = await this.workerPythonService.runTask(Task.importLambert, { lambert_x, lambert_y });
    if (bootstrap.error || !bootstrap.result) {
      throw this.buildLambertReprojectionError();
    }
    const startLatitude = bootstrap.result.latitude[0];
    const startLongitude = bootstrap.result.longitude[0];
    const startAzimuth = bootstrap.result.azimuth[0];

    // Call 2 — direct conversion + degree-based validation (the actual "import lambert validate" task).
    const validated = await this.workerPythonService.runTask(Task.importLambertAndValidate, {
      lambert_x,
      lambert_y,
      startLatitude,
      startLongitude,
      startAzimuth,
      spanLength,
      lineAngle
    });
    if (validated.error || !validated.result) {
      throw this.buildLambertReprojectionError();
    }

    // Call 3 — reprojection using only the app's span/angle data model (no surveyed Lambert93 input),
    // used to compare against the surveyed coordinates in meters.
    const reconstructed = await this.workerPythonService.runTask(Task.computeLocalization, {
      startLatitude,
      startLongitude,
      startAzimuth,
      spanLength,
      lineAngle
    });
    if (reconstructed.error || !reconstructed.result) {
      throw this.buildLambertReprojectionError();
    }

    const { latitude, longitude } = validated.result.localization;
    const updatedSupports = supports.map((support, i) => ({
      ...support,
      footLatitude: latitude[i] ?? null,
      footLongitude: longitude[i] ?? null
    }));

    const { lambert_x: reconstructedX, lambert_y: reconstructedY } = reconstructed.result;
    const meanGpsDiffMeters =
      lambert_x.reduce((sum, x, i) => sum + Math.hypot(x - reconstructedX[i], lambert_y[i] - reconstructedY[i]), 0) /
      lambert_x.length;

    return { supports: updatedSupports, meanGpsDiffMeters };
  }

  private buildLambertReprojectionError(): ImportError {
    return {
      code: 'MAPPING_ERROR',
      message: sectionImportErrors.lambertReprojectionError,
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

  private validateGeoLiaisonSection(raw: GeoLiaisonFormat): void {
    const fieldErrors = validateGeoLiaisonRawFields(raw);
    if (fieldErrors.length > 0) {
      const detail = fieldErrors.map((e) => `${e.field}: ${String(e.value)}`).join('; ');
      const error: ImportError = {
        code: 'VALIDATION_ERROR',
        message: `${sectionImportErrors.validationErrorRequiredFields}: ${detail}`,
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
        message: `${sectionImportErrors.validationErrorRequiredFields}: ${missingFields.join(', ')}`,
        stage: 'VALIDATION'
      };
      throw error;
    }

    if (hasSupportsBoundsErrors(section)) {
      const error: ImportError = {
        code: 'VALIDATION_ERROR',
        message: sectionImportErrors.validationErrorSupportsBounds,
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
    collisionResolver: UUIDCollisionResolver
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
          message: sectionImportErrors.sectionDeleteError,
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
          message: sectionImportErrors.sectionImportError,
          stage: 'PERSISTENCE',
          cause: err
        };
        throw error;
      }

      this.notificationService.success(importSuccessDetail);
      this.notifyGpsReprojection(section);
      return section;
    }

    try {
      await this.sectionService.createOrUpdateSection(study, section);
    } catch (err: unknown) {
      this.logger.error('Error persisting section', err);
      const error: ImportError = {
        code: 'PERSISTENCE_ERROR',
        message: sectionImportErrors.sectionImportError,
        stage: 'PERSISTENCE',
        cause: err
      };
      throw error;
    }

    this.notificationService.success(importSuccessDetail);
    this.notifyGpsReprojection(section);
    return section;
  }

  /**
   * Shows an info toast reporting the mean Lambert93-to-GPS reprojection error (meters), when one
   * was computed for this import (see `applyLambertReprojection`).
   */
  private notifyGpsReprojection(section: Section): void {
    if (section.mean_gps_diff_meters != null) {
      this.notificationService.info(buildGpsReprojectionInfoMessage(section.mean_gps_diff_meters));
    }
  }
}
