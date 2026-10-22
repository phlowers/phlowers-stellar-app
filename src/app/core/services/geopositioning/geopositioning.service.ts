/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { filter, firstValueFrom, timeout } from 'rxjs';
import { Section } from '@shared/domain';
import { StudyEntity } from '@infrastructure/database';
import { LoggerService } from '@services/logger/logger.service';
import { SectionService } from '@services/section/section.service';
import { SectionUpdateResult } from '@services/section/section-geometry.interfaces';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskInputs, TaskOutputs } from '@services/worker_python/tasks/types';
import { SectionImportCoordinates } from '@shared/import/section-adapter/section-import-adapter.interfaces';
import { CRS } from '@shared/domain/helpers/geopositioning.constantes';
import { CrsCode, FootLocalization, GpsPoint, ProjectedPoint } from '@shared/domain/helpers/geopositioning.interfaces';
import {
  applyFootCoordinates,
  applyLocalization,
  areCoordinatesComplete,
  buildLocalizationInputs,
  buildReprojectionAngles,
  clearDerivedLocalization,
  getFootGps,
  getStartGps,
  hasCompleteFootGps,
  hasGeometryChanged,
  withStartGps
} from '@shared/domain/helpers/geopositioning.helpers';
import { WORKER_READY_TIMEOUT_MS } from './geopositioning.constantes';
import { GeopositioningError } from './geopositioning.interfaces';

/**
 * Single entry point for the geopositioning of a section.
 *
 * The core pivot CRS is WGS84 (EPSG:4326). The foot GPS of every support (`footLatitude`/`footLongitude`)
 * and `spanAzimut` are the stored source of truth; the section start point is the foot of `supports[0]`.
 * Reprojection to any other CRS is done on the fly by the Python worker.
 *
 * Geopositioning is optional: a section without start GPS is valid and is never forced to compute.
 * Worker failures never throw from the compute/save paths: the section is returned unchanged.
 */
@Injectable({ providedIn: 'root' })
export class GeopositioningService {
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly sectionService = inject(SectionService);
  private readonly logger = inject(LoggerService);

  // ---------------------------------------------------------------------------
  // Get / set (sync, in memory)
  // ---------------------------------------------------------------------------

  /** Foot GPS of each support, `null` when unknown. */
  getFootGps(section: Section): (GpsPoint | null)[] {
    return getFootGps(section);
  }

  /** Section start GPS (foot of the first support), `null` when unknown. */
  getStartGps(section: Section): GpsPoint | null {
    return getStartGps(section);
  }

  /** Returns a copy of `section` with the given start GPS and, when provided, the start azimuth. */
  setStartGps(section: Section, point: GpsPoint, azimuth?: number | null): Section {
    const updated = withStartGps(section, point);
    return azimuth === undefined ? updated : { ...updated, start_azimuth: azimuth };
  }

  // ---------------------------------------------------------------------------
  // Compute / persist
  // ---------------------------------------------------------------------------

  /**
   * Computes the foot GPS and `spanAzimut` of every support from the start GPS, `start_azimuth` and the
   * span geometry. Returns the section unchanged (with a warning) when inputs are missing or the task fails.
   */
  async computeFootGps(section: Section): Promise<Section> {
    const localization = await this.runComputeLocalization(section);
    return localization ? { ...section, supports: applyLocalization(section.supports, localization) } : section;
  }

  /**
   * Recomputes the foot GPS only when a start GPS exists and either the geometry changed since `previous`
   * or a foot GPS is missing. Otherwise returns `next` unchanged.
   * When the computation fails, the derived foot GPS and `spanAzimut` are cleared (start GPS kept) so stale
   * values are never persisted and a later sync recomputes them.
   */
  async syncFootGps(previous: Section | undefined, next: Section): Promise<Section> {
    if (!getStartGps(next)) return next;
    if (!hasGeometryChanged(previous, next) && hasCompleteFootGps(next)) return next;
    const localization = await this.runComputeLocalization(next);
    return localization
      ? { ...next, supports: applyLocalization(next.supports, localization) }
      : clearDerivedLocalization(next);
  }

  /** Synchronizes the foot GPS then persists the section in the study. */
  async save(study: StudyEntity, previous: Section | undefined, next: Section): Promise<SectionUpdateResult> {
    const synchronized = await this.syncFootGps(previous, next);
    return this.sectionService.createOrUpdateSection(study, synchronized);
  }

  // ---------------------------------------------------------------------------
  // Read / reproject
  // ---------------------------------------------------------------------------

  /**
   * Returns the localization of a section: the stored foot GPS/`spanAzimut` when complete (and the geometry
   * did not change since `reference`, when given), otherwise an on-the-fly computation that is not persisted.
   * Returns `null` when neither is available.
   */
  async resolveLocalization(section: Section, reference?: Section): Promise<FootLocalization | null> {
    const stored = this.readStoredLocalization(section);
    if (stored && (!reference || !hasGeometryChanged(reference, section))) return stored;
    return this.runComputeLocalization(section);
  }

  /** Reprojects WGS84 points to `targetCrs`. Returns `null` when the worker is unavailable or fails. */
  async toCrs(points: GpsPoint[], targetCrs: CrsCode): Promise<ProjectedPoint[] | null> {
    if (points.length === 0) return [];
    if (targetCrs === CRS.WGS84) return points.map(({ latitude, longitude }) => ({ x: longitude, y: latitude }));

    const output = await this.runTask(Task.convertCoordinates, {
      sourceCrs: CRS.WGS84,
      targetCrs,
      x: points.map((point) => point.longitude),
      y: points.map((point) => point.latitude)
    });
    if (!output) return null;
    return output.x.map((x, i) => ({ x, y: output.y[i] }));
  }

  /** Reprojects every support foot of `section` to `targetCrs` (see `resolveLocalization`). */
  async sectionToCrs(section: Section, targetCrs: CrsCode, reference?: Section): Promise<ProjectedPoint[] | null> {
    const localization = await this.resolveLocalization(section, reference);
    if (!localization) return null;
    const points = localization.latitude.map((latitude, i) => ({ latitude, longitude: localization.longitude[i] }));
    return this.toCrs(points, targetCrs);
  }

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------

  /**
   * Applies imported support coordinates to `section`.
   *
   * - WGS84: used as-is (`x` = longitude, `y` = latitude).
   * - Lambert93: reprojected to GPS; also sets `spanAzimut`, `start_azimuth` (azimuth before the first
   *   deflection, computed by the worker) and the mean reprojection error.
   *
   * Incomplete coordinates are skipped (section returned unchanged).
   *
   * @throws `GeopositioningError` when the Lambert93 reprojection fails.
   */
  async applyImportedCoordinates(section: Section, coordinates: SectionImportCoordinates): Promise<Section> {
    return coordinates.crs === 'WGS84'
      ? this.applyWgs84(section, coordinates)
      : this.applyLambert93(section, coordinates);
  }

  private applyWgs84(section: Section, coordinates: SectionImportCoordinates): Section {
    if (!areCoordinatesComplete(coordinates, section.supports.length)) {
      this.logger.warn('Skipping WGS84 coordinates: missing or mismatching values for at least one support');
      return section;
    }
    const longitude = coordinates.x as number[];
    const latitude = coordinates.y as number[];
    return { ...section, supports: applyFootCoordinates(section.supports, latitude, longitude) };
  }

  private async applyLambert93(section: Section, coordinates: SectionImportCoordinates): Promise<Section> {
    if (!areCoordinatesComplete(coordinates, section.supports.length)) {
      this.logger.error('Skipping Lambert93 to GPS reprojection: missing raw coordinates on at least one support');
      return section;
    }

    const lambert_x = coordinates.x as number[];
    const lambert_y = coordinates.y as number[];
    const { spanLength, lineAngle } = buildReprojectionAngles(section.supports);

    // Call 1 — bootstrap: direct conversion of the raw Lambert93 arrays to get the start azimuth.
    const bootstrap = await this.workerPythonService.runTask(Task.importLambert, { lambert_x, lambert_y });
    if (bootstrap.error || !bootstrap.result) {
      throw new GeopositioningError('Lambert93 bootstrap reprojection failed', { cause: bootstrap.error });
    }

    // Call 2 — direct conversion + degree-based validation.
    const validated = await this.workerPythonService.runTask(Task.importLambertAndValidate, {
      lambert_x,
      lambert_y,
      startAzimuth: bootstrap.result.azimuth[0],
      spanLength,
      lineAngle
    });
    if (validated.error || !validated.result) {
      throw new GeopositioningError('Lambert93 reprojection validation failed', { cause: validated.error });
    }

    const { localization, meanGpsDiffMeter, startAzimuth } = validated.result;
    return {
      ...section,
      supports: applyLocalization(section.supports, localization),
      start_azimuth: startAzimuth,
      mean_reprojection_diff_meters: meanGpsDiffMeter
    };
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /** Stored foot GPS + `spanAzimut`, `null` when any of them is missing. */
  private readStoredLocalization(section: Section): FootLocalization | null {
    if (!hasCompleteFootGps(section)) return null;
    const spanSupports = section.supports.slice(0, -1);
    const azimuth = spanSupports.map((support) => support.spanAzimut);
    if (azimuth.some((value) => value === null || value === undefined)) return null;
    return {
      latitude: section.supports.map((support) => support.footLatitude as number),
      longitude: section.supports.map((support) => support.footLongitude as number),
      azimuth: azimuth as number[]
    };
  }

  private async runComputeLocalization(section: Section): Promise<FootLocalization | null> {
    const inputs = buildLocalizationInputs(section);
    if (!inputs) {
      this.logger.warn('Geopositioning skipped: start GPS, start azimuth or span geometry is missing');
      return null;
    }
    const output = await this.runTask(Task.computeLocalization, inputs);
    return output ? { latitude: output.latitude, longitude: output.longitude, azimuth: output.azimuth } : null;
  }

  /** Runs a worker task once the worker is ready. Never throws: failures are logged and return `null`. */
  private async runTask<T extends Task>(task: T, inputs: TaskInputs[T]): Promise<TaskOutputs[T] | null> {
    try {
      if (!(await this.isWorkerReady())) {
        this.logger.warn(`Geopositioning task "${task}" skipped: Python worker is not ready`);
        return null;
      }
      const { result, error } = await this.workerPythonService.runTask(task, inputs);
      if (error || !result) {
        this.logger.warn(`Geopositioning task "${task}" failed`, error);
        return null;
      }
      return result;
    } catch (err: unknown) {
      this.logger.warn(`Geopositioning task "${task}" failed`, err);
      return null;
    }
  }

  private async isWorkerReady(): Promise<boolean> {
    if (this.workerPythonService.ready) return true;
    try {
      await firstValueFrom(
        this.workerPythonService.ready$.pipe(
          filter((ready) => ready),
          timeout(WORKER_READY_TIMEOUT_MS)
        )
      );
      return true;
    } catch {
      return false;
    }
  }
}
