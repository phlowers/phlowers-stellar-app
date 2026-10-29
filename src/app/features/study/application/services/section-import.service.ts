/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable, signal } from '@angular/core';
import { Section, Study } from '@shared/domain';
import { SectionService } from '@services/section/section.service';
import { ImportAdapter, ImportError, UUIDCollisionResolver } from '@shared/import/domain/import-contracts.interfaces';
import {
  buildImportSource,
  isFileAccepted,
  isImportError,
  SECTION_IMPORT_ADAPTERS,
  SectionImportAdapter,
  SectionImportCoordinates,
  SectionImportNotice,
  SectionImportPayload,
  SectionImportSource,
  selectAdapter
} from '@shared/import/section-adapter/section-import-adapter';
import { getMissingRequiredFields } from '@shared/import/section-adapter/section-import-pipeline.helpers';
import { NotificationService } from '@services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { GeopositioningService } from '@services/geopositioning/geopositioning.service';
import { GeopositioningError } from '@services/geopositioning/geopositioning.interfaces';
import { SPAN_AZIMUTH_ERROR_THRESHOLD_DEG, POSITION_ERROR_THRESHOLD_METERS } from '@shared/domain/helpers/geopositioning.constantes';
import { computeSpanAzimuthErrors } from '@shared/domain/helpers/geopositioning.helpers';
import { hasSupportsBoundsErrors } from '@shared/domain/helpers/support-limits.helpers';
import { TranslocoService } from '@jsverse/transloco';
import {
  AZIMUTH_REPROJECTION_NOTICE_KEY,
  CATALOG_MISSING_WARNING_KEY,
  IMPORT_SUCCESS_KEY,
  POSITION_ERROR_NOTICE_KEY,
  SECTION_IMPORT_ERROR_KEYS
} from './section-import.constantes';
import { getNoticeSeverity, summarizePositionError } from './section-import.helpers';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { AttachmentCorrectionService } from './catalog-correction/attachment-correction.service';
import { ChainCorrectionService } from './catalog-correction/chain-correction.service';
import { LineCorrectionService } from './catalog-correction/line-correction.service';
import { MaintenanceCorrectionService } from './catalog-correction/maintenance-correction.service';
import { buildSupportNameEntries } from './catalog-correction/catalog-correction.helpers';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Format-independent section import pipeline.
 *
 * Implements `ImportAdapter` for `Section` entities and delegates the file format to the
 * `SectionImportAdapter`s registered under `SECTION_IMPORT_ADAPTERS` (see `section-import-adapters.config.ts`).
 *
 * ### Study context
 * Before processing files, the host component **must** call
 * `SectionImportService.setStudyContext` with the active study so the
 * service can check collisions and persist the imported section.
 *
 * ### Pipeline stages performed internally
 * - **FILE_VALIDATION**: at least one adapter declares the file extension.
 * - **DECODING/PARSING**: reads the text once and picks the first adapter that recognizes the content.
 * - **MAPPING**: the selected adapter parses, validates its own format and maps it to a `Section`.
 * - **VALIDATION**: required fields + supports bounds on the mapped section, for every adapter.
 * - **CATALOG CORRECTION**: when the adapter asks for it, maintenance, voltage, attachment and chain
 *   values are corrected against the local catalogs, then new support names are added to the catalog.
 * - **MAPPING (coordinates)**: Lambert93 to GPS reprojection when the adapter provides projected coordinates,
 *   then computation of any missing support foot GPS, both delegated to `GeopositioningService`.
 * - **COLLISION_CHECK**: detects whether the UUID already exists in the study.
 * - **PERSISTENCE**: calls `SectionService.createOrUpdateSection`.
 */
@Injectable()
export class SectionImportService implements ImportAdapter<Section> {
  /** Writable signal holding the active study; must be set before processing. */
  readonly studyContext = signal<Study | null>(null);

  private readonly adapters: readonly SectionImportAdapter[] = inject(SECTION_IMPORT_ADAPTERS);
  private readonly sectionService = inject(SectionService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);
  private readonly geopositioning = inject(GeopositioningService);
  private readonly transloco = inject(TranslocoService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly maintenanceCorrection = inject(MaintenanceCorrectionService);
  private readonly lineCorrection = inject(LineCorrectionService);
  private readonly attachmentCorrection = inject(AttachmentCorrectionService);
  private readonly chainCorrection = inject(ChainCorrectionService);

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

  /** Returns `true` if at least one registered adapter accepts the file extension. */
  accepts(file: File): boolean {
    return isFileAccepted(this.adapters, file.name);
  }

  /**
   * Checks whether the UUID found by the matching adapter collides with an existing section
   * in the current study.
   *
   * @returns Collision info `{ uuid, label }` or `null` if no collision.
   */
  async checkCollision(file: File): Promise<{ uuid: string; label: string } | null> {
    const study = this.studyContext();
    if (!study) return null;

    try {
      const source = buildImportSource(file.name, await file.text());
      const uuid = selectAdapter(this.adapters, source)?.extractUuid(source);
      if (!uuid) return null;
      const existing = study.sections.find((s) => s.uuid === uuid);
      return existing ? { uuid, label: existing.name } : null;
    } catch {
      // If we cannot read at check time, let processFile handle the error properly.
      return null;
    }
  }

  /**
   * Runs the full import pipeline for the given file.
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
    const source = await this.readSource(file);

    // Stage: adapter selection + MAPPING (format-specific parsing and validation)
    const adapter = this.pickAdapter(source);
    const payload = await this.runAdapter(adapter, source);

    // Stage: VALIDATION (format-independent)
    this.validateSection(payload.section);

    // Stage: catalog correction (opt-in per adapter)
    const notices: SectionImportNotice[] = [...(payload.notices ?? [])];
    let corrected = payload.section;
    if (payload.applyCatalogCorrections) {
      const result = await this.applyCatalogCorrections(payload.section);
      corrected = result.section;
      if (result.hasMissingCatalogEntries) {
        notices.push({ severity: 'warning', message: this.transloco.translate(CATALOG_MISSING_WARNING_KEY) });
      }
    }

    // Stage: MAPPING (coordinates)
    const section = await this.applyCoordinates(corrected, payload.coordinates);
    const azimuthNotice = this.checkSpanAzimuthError(corrected, section);
    if (azimuthNotice) notices.push(azimuthNotice);
    const positionNotice = this.buildPositionErrorNotice(section);
    if (positionNotice) notices.push(positionNotice);

    // Stage: COLLISION_CHECK + PERSISTENCE
    return this.persistSection(section, study, collisionResolver, notices);
  }

  // ---------------------------------------------------------------------------
  // Private — reading and adapter selection
  // ---------------------------------------------------------------------------

  private async readSource(file: File): Promise<SectionImportSource> {
    try {
      return buildImportSource(file.name, await file.text());
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
  }

  private pickAdapter(source: SectionImportSource): SectionImportAdapter {
    const adapter = selectAdapter(this.adapters, source);
    if (adapter) return adapter;

    if (source.json === undefined) {
      this.logger.error('Error parsing section JSON', source.fileName);
      const parseError: ImportError = {
        code: 'FILE_PARSE_ERROR',
        message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.fileParseError),
        stage: 'PARSING'
      };
      throw parseError;
    }

    const error: ImportError = {
      code: 'FILE_TYPE_NOT_ALLOWED',
      message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.noMatchingAdapter),
      stage: 'FILE_VALIDATION'
    };
    throw error;
  }

  /** Runs the adapter; its own `ImportError`s pass through, anything else becomes a generic mapping error. */
  private async runAdapter(adapter: SectionImportAdapter, source: SectionImportSource): Promise<SectionImportPayload> {
    try {
      return await adapter.import(source);
    } catch (err: unknown) {
      if (isImportError(err)) throw err;
      this.logger.error(`Section import adapter "${adapter.id}" failed`, err);
      const error: ImportError = {
        code: 'MAPPING_ERROR',
        message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.sectionImportError),
        stage: 'MAPPING',
        cause: err
      };
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Private — catalog correction
  // ---------------------------------------------------------------------------

  /**
   * Corrects the section against each catalog, then registers the new support names in the
   * attachment catalog. Unexpected failures become a generic `MAPPING_ERROR`.
   */
  private async applyCatalogCorrections(
    section: Section
  ): Promise<{ section: Section; hasMissingCatalogEntries: boolean }> {
    try {
      const withMaintenance = await this.maintenanceCorrection.correctMaintenance(section);
      const withVoltage = await this.lineCorrection.correctVoltage(withMaintenance);
      const { supports: withAttachments, hasMissingCatalogEntries } = await this.attachmentCorrection.correctSupports(
        withVoltage.supports
      );
      const supports = await this.chainCorrection.correctSupports(withAttachments);

      await this.attachmentService.addSupportNamesIfAbsent(buildSupportNameEntries(supports));

      return { section: { ...withVoltage, supports }, hasMissingCatalogEntries };
    } catch (err: unknown) {
      this.logger.error('Section catalog correction failed', err);
      const error: ImportError = {
        code: 'MAPPING_ERROR',
        message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.sectionImportError),
        stage: 'MAPPING',
        cause: err
      };
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Private — coordinates reprojection
  // ---------------------------------------------------------------------------

  /**
   * Applies the adapter coordinates, then fills the missing foot GPS from the start point when possible
   * (e.g. stellar json without coordinates). Complete foot GPS is never recomputed here.
   *
   * @throws An `ImportError` (`MAPPING_ERROR`/`MAPPING`) when the Lambert93 reprojection fails.
   */
  private async applyCoordinates(
    section: Section,
    coordinates: SectionImportCoordinates | undefined
  ): Promise<Section> {
    let located = section;
    if (coordinates) {
      try {
        located = await this.geopositioning.applyImportedCoordinates(section, coordinates);
      } catch (err: unknown) {
        if (err instanceof GeopositioningError) throw this.buildLambertReprojectionError();
        throw err;
      }
    }
    return this.geopositioning.syncFootGps(located, located);
  }

  /**
   * Compares the span azimuths of the file (`before`) with the computed ones (`after`), logs the full error
   * vector and returns a notice: `info` when the maximum gap is within `SPAN_AZIMUTH_ERROR_THRESHOLD_DEG`,
   * `warning` otherwise. Returns `null` when no gap could be computed.
   */
  private checkSpanAzimuthError(before: Section, after: Section): SectionImportNotice | null {
    const errors = computeSpanAzimuthErrors(before.supports, after.supports);
    const known = errors.filter((error): error is number => error !== null);
    if (known.length === 0) return null;

    this.logger.info('Span azimuth error vector after reprojection (deg)', errors);
    const maxError = Math.max(...known);
    return {
      severity: getNoticeSeverity(maxError, SPAN_AZIMUTH_ERROR_THRESHOLD_DEG),
      message: this.transloco.translate(AZIMUTH_REPROJECTION_NOTICE_KEY, {
        error: maxError.toFixed(2),
        threshold: SPAN_AZIMUTH_ERROR_THRESHOLD_DEG
      })
    };
  }

  /**
   * Builds the notice on the maximum support position error recorded at import (`position_error_meters`).
   * Returns `null` when no finite position error was computed. The full vector is logged.
   */
  private buildPositionErrorNotice(section: Section): SectionImportNotice | null {
    if (!section.position_error_meters) return null;
    this.logger.info('Support position error vector after reprojection (m)', section.position_error_meters);

    const summary = summarizePositionError(section, POSITION_ERROR_THRESHOLD_METERS);
    if (!summary) return null;
    return {
      severity: summary.severity,
      message: this.transloco.translate(POSITION_ERROR_NOTICE_KEY, {
        error: summary.maxError.toFixed(2),
        support: summary.support,
        threshold: POSITION_ERROR_THRESHOLD_METERS
      })
    };
  }

  private buildLambertReprojectionError(): ImportError {
    return {
      code: 'MAPPING_ERROR',
      message: this.transloco.translate(SECTION_IMPORT_ERROR_KEYS.lambertReprojectionError),
      stage: 'MAPPING'
    };
  }

  // ---------------------------------------------------------------------------
  // Private — validation
  // ---------------------------------------------------------------------------

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
    notices: readonly SectionImportNotice[]
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

      this.notifyImported(notices);
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

    this.notifyImported(notices);
    return section;
  }

  private notifyImported(notices: readonly SectionImportNotice[]): void {
    this.notificationService.success(this.transloco.translate(IMPORT_SUCCESS_KEY));
    for (const notice of notices) {
      if (notice.severity === 'warning') {
        this.notificationService.warning(notice.message);
      } else {
        this.notificationService.info(notice.message);
      }
    }
  }
}
