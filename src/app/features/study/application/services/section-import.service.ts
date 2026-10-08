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
import {
  applyFootCoordinates,
  areCoordinatesComplete,
  buildReprojectionAngles,
  getMissingRequiredFields
} from '@shared/import/section-adapter/section-import-pipeline.helpers';
import { NotificationService } from '@services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, Localization } from '@core/services/worker_python/tasks/types';
import { hasSupportsBoundsErrors } from '@shared/domain/helpers/support-limits.helpers';
import { TranslocoService } from '@jsverse/transloco';
import { environment } from '@src/environments/environment';
import { IMPORT_SUCCESS_KEY, REPROJECTION_INFO_KEY, SECTION_IMPORT_ERROR_KEYS } from './section-import.constantes';
import { StartLocation } from './section-import.interfaces';

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
 * - **MAPPING (coordinates)**: Lambert93 to GPS reprojection when the adapter provides projected coordinates.
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
    if (!payload.skipSectionValidation) {
      this.validateSection(payload.section);
    }

    // Stage: MAPPING (coordinates)
    const section = await this.applyCoordinates(payload.section, payload.coordinates);

    // Stage: COLLISION_CHECK + PERSISTENCE
    return this.persistSection(section, study, collisionResolver, payload.notices ?? []);
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
  // Private — coordinates reprojection
  // ---------------------------------------------------------------------------

  private applyCoordinates(section: Section, coordinates: SectionImportCoordinates | undefined): Promise<Section> {
    if (!coordinates) return Promise.resolve(section);
    return coordinates.crs === 'WGS84'
      ? Promise.resolve(this.applyWgs84(section, coordinates))
      : this.applyLambert93(section, coordinates);
  }

  /** WGS84 coordinates are used as-is: `x` is the longitude, `y` the latitude. */
  private applyWgs84(section: Section, coordinates: SectionImportCoordinates): Section {
    if (!areCoordinatesComplete(coordinates, section.supports.length)) {
      this.logger.warn('Skipping WGS84 coordinates: missing or mismatching values for at least one support');
      return section;
    }
    const longitude = coordinates.x as number[];
    const latitude = coordinates.y as number[];
    return {
      ...section,
      supports: applyFootCoordinates(section.supports, latitude, longitude),
      start_latitude: latitude[0],
      start_longitude: longitude[0]
    };
  }

  /**
   * Converts each support's Lambert93 foot coordinates to GPS (`footLatitude`/`footLongitude`),
   * stores the section start location and the mean GPS reprojection error (meters).
   *
   * Uses only the existing `Task.importLambert` and `Task.importLambertAndValidate` Python tasks.
   * If any support is missing its coordinates, the whole reprojection is skipped (section returned
   * unchanged) rather than blocking the import.
   *
   * @throws An `ImportError` (`MAPPING_ERROR`/`MAPPING`) if the worker reports an error or returns
   *   no result for either call.
   */
  private async applyLambert93(section: Section, coordinates: SectionImportCoordinates): Promise<Section> {
    if (!areCoordinatesComplete(coordinates, section.supports.length)) {
      this.logger.error('Skipping Lambert93 to GPS reprojection: missing raw coordinates on at least one support');
      return section;
    }

    const lambert_x = coordinates.x as number[];
    const lambert_y = coordinates.y as number[];
    const { spanLength, lineAngle } = buildReprojectionAngles(section.supports);

    const start = await this.bootstrapLambertStartPoint(lambert_x, lambert_y);
    const { localization, meanGpsDiffMeter } = await this.validateLambertLocalization(
      lambert_x,
      lambert_y,
      start,
      spanLength,
      lineAngle
    );

    return {
      ...section,
      supports: applyFootCoordinates(section.supports, localization.latitude, localization.longitude),
      start_latitude: localization.latitude[0],
      start_longitude: localization.longitude[0],
      start_azimuth: localization.azimuth[0],
      mean_reprojection_diff_meters: meanGpsDiffMeter
    };
  }

  /** Call 1 — bootstrap: direct conversion of the raw Lambert93 arrays to get a start point. */
  private async bootstrapLambertStartPoint(lambert_x: number[], lambert_y: number[]): Promise<StartLocation> {
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
    start: StartLocation,
    spanLength: number[],
    lineAngle: number[]
  ): Promise<{ localization: Localization; meanGpsDiffMeter: number }> {
    const validated = await this.workerPythonService.runTask(Task.importLambertAndValidate, {
      lambert_x,
      lambert_y,
      startAzimuth: start.startAzimuth,
      spanLength,
      lineAngle
    });
    if (validated.error || !validated.result) {
      throw this.buildLambertReprojectionError();
    }
    return validated.result;
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

      this.notifyImported(section, notices);
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

    this.notifyImported(section, notices);
    return section;
  }

  private notifyImported(section: Section, notices: readonly SectionImportNotice[]): void {
    this.notificationService.success(this.transloco.translate(IMPORT_SUCCESS_KEY));
    this.notifyGpsReprojection(section);
    for (const notice of notices) {
      if (notice.severity === 'warning') {
        this.notificationService.warning(notice.message);
      } else {
        this.notificationService.info(notice.message);
      }
    }
  }

  /**
   * Shows an info toast reporting the mean Lambert93-to-GPS reprojection error (meters), when one
   * was computed for this import (see `applyLambert93`).
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
}
