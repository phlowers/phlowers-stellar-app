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
  applySpanAzimuths,
  areCoordinatesComplete,
  buildLocalizationInputs,
  buildReprojectionAngles,
  clearDerivedLocalization,
  getFootGps,
  getStartGps,
  hasCompleteFootGps,
  hasGeometryChanged,
  toPositionErrorMeters,
  withStartGps
} from '@shared/domain/helpers/geopositioning.helpers';
import { WORKER_READY_TIMEOUT_MS } from './geopositioning.constantes';
import {
  GeopositioningError,
  StartFromNextSupportInput,
  StartFromNextSupportResult
} from './geopositioning.interfaces';

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

  /** Foot GPS of each support, `null` when unknown. No production caller yet: kept for review, see `deadcode.md` (ARCHI-05). */
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
   * No production caller yet: kept for review, see `deadcode.md` (ARCHI-05).
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

  /**
   * Reprojects every support foot of `section` to `targetCrs` (see `resolveLocalization`).
   * No production caller yet: kept for review, see `deadcode.md` (ARCHI-05).
   */
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
   * - WGS84: the foot GPS are set, then the worker derives `spanAzimut`, `start_azimuth` and the per-support
   *   position error from the positions and the span geometry (positions are the source of truth). When the
   *   worker fails, the foot GPS are kept and the file values are left unchanged.
   * - Lambert93: reprojected to GPS by the worker; also sets `spanAzimut`, `start_azimuth` (azimuth before the
   *   first deflection) and the per-support position error.
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

  private async applyWgs84(section: Section, coordinates: SectionImportCoordinates): Promise<Section> {
    if (!areCoordinatesComplete(coordinates, section.supports.length)) {
      this.logger.warn('Skipping WGS84 coordinates: missing or mismatching values for at least one support');
      return section;
    }
    const longitude = coordinates.x as number[];
    const latitude = coordinates.y as number[];
    const withFootGps = { ...section, supports: applyFootCoordinates(section.supports, latitude, longitude) };

    const { spanLength, lineAngle } = buildReprojectionAngles(section.supports);
    const validated = await this.runTask(Task.validateGpsPositions, { latitude, longitude, spanLength, lineAngle });
    if (!validated) {
      this.logger.warn('WGS84 positions imported without span azimuths: GPS validation failed');
      return withFootGps;
    }

    return {
      ...withFootGps,
      supports: applySpanAzimuths(withFootGps.supports, validated.azimuth),
      start_azimuth: validated.startAzimuth ?? withFootGps.start_azimuth,
      position_error_meters: toPositionErrorMeters(validated.positionErrorMeter)
    };
  }

  private async applyLambert93(section: Section, coordinates: SectionImportCoordinates): Promise<Section> {
    if (!areCoordinatesComplete(coordinates, section.supports.length)) {
      this.logger.error('Skipping Lambert93 to GPS reprojection: missing raw coordinates on at least one support');
      return section;
    }

    const lambert_x = coordinates.x as number[];
    const lambert_y = coordinates.y as number[];
    const { spanLength, lineAngle } = buildReprojectionAngles(section.supports);

    if (!(await this.isWorkerReady())) {
      throw new GeopositioningError('Python worker is not ready');
    }

    const { error, result } = await this.workerPythonService.runTask(Task.importLambertAndValidate, {
      lambert_x,
      lambert_y,
      spanLength,
      lineAngle
    });
    if (error || !result) {
      throw new GeopositioningError('Lambert93 reprojection failed', { cause: error });
    }

    return {
      ...section,
      supports: applyLocalization(section.supports, result.localization),
      start_azimuth: result.startAzimuth,
      position_error_meters: toPositionErrorMeters(result.positionErrorMeter)
    };
  }

  /**
   * Computes the GPS of a new support 0 and the new start azimuth, used when a support is inserted before
   * support 0: returns the GPS of the new support 0 and the new start azimuth so that existing supports keep
   * their position. Never throws: returns `null` when the worker is unavailable or the computation fails.
   */
  async computeStartFromNextSupport(input: StartFromNextSupportInput): Promise<StartFromNextSupportResult | null> {
    const output = await this.runTask(Task.computeStartFromNextSupport, {
      latitude: input.next.latitude,
      longitude: input.next.longitude,
      nextSpanAzimuth: input.nextSpanAzimuth,
      spanLength: input.spanLength,
      lineAngle: input.lineAngle
    });
    return output
      ? { point: { latitude: output.latitude, longitude: output.longitude }, azimuth: output.startAzimuth }
      : null;
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
