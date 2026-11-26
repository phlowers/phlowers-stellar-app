/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { Section, Support } from '@shared/domain';
import { StudyEntity } from '@infrastructure/database';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { CRS } from '@shared/domain/helpers/geopositioning.constantes';
import { LoggerService } from '@services/logger/logger.service';
import { SectionService } from '@services/section/section.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskError } from '@services/worker_python/tasks/types';
import { GeopositioningService } from './geopositioning.service';
import { GeopositioningError } from './geopositioning.interfaces';

const buildSupport = (overrides: Partial<Support> = {}): Support => ({ ...createEmptySupport(), ...overrides });

/** Section with a start point and complete geometry; foot GPS only on the first support. */
const buildSection = (overrides: Partial<Section> = {}): Section => ({
  ...createEmptySection(),
  start_azimuth: 90,
  supports: [
    buildSupport({ uuid: 'a', spanLength: 100, spanAngle: 0, footLatitude: 45, footLongitude: 3 }),
    buildSupport({ uuid: 'b', spanLength: 200, spanAngle: 0 }),
    buildSupport({ uuid: 'c', spanLength: null, spanAngle: 0 })
  ],
  ...overrides
});

const LOCALIZATION = {
  latitude: [45, 45.1, 45.2],
  longitude: [3, 3.1, 3.2],
  azimuth: [90, 91],
  lambert_x: [],
  lambert_y: []
};

/** Section whose foot GPS and spanAzimut are all stored. */
const buildLocatedSection = (): Section => {
  const section = buildSection();
  return {
    ...section,
    supports: section.supports.map((support, i) => ({
      ...support,
      footLatitude: LOCALIZATION.latitude[i],
      footLongitude: LOCALIZATION.longitude[i],
      spanAzimut: LOCALIZATION.azimuth[i] ?? null
    }))
  };
};

describe('GeopositioningService', () => {
  let service: GeopositioningService;
  let ready$: BehaviorSubject<boolean>;
  let workerMock: { runTask: ReturnType<typeof vi.fn>; ready$: BehaviorSubject<boolean>; ready: boolean };
  let sectionServiceMock: { createOrUpdateSection: ReturnType<typeof vi.fn> };
  let loggerMock: { warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    ready$ = new BehaviorSubject<boolean>(true);
    workerMock = {
      runTask: vi.fn().mockResolvedValue({ result: LOCALIZATION, error: null, diagnostics: [] }),
      ready$,
      ready: true
    };
    sectionServiceMock = { createOrUpdateSection: vi.fn().mockResolvedValue({ removedGeometryBoundObjects: false }) };
    loggerMock = { warn: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        GeopositioningService,
        { provide: WorkerPythonService, useValue: workerMock },
        { provide: SectionService, useValue: sectionServiceMock },
        { provide: LoggerService, useValue: loggerMock }
      ]
    });
    service = TestBed.inject(GeopositioningService);
  });

  describe('get / set', () => {
    it('should read foot and start GPS from the supports', () => {
      const section = buildSection();
      expect(service.getFootGps(section)).toEqual([{ latitude: 45, longitude: 3 }, null, null]);
      expect(service.getStartGps(section)).toEqual({ latitude: 45, longitude: 3 });
    });

    it('should set the start GPS without touching the azimuth when none is given', () => {
      const result = service.setStartGps(buildSection(), { latitude: 10, longitude: 20 });
      expect(service.getStartGps(result)).toEqual({ latitude: 10, longitude: 20 });
      expect(result.start_azimuth).toBe(90);
    });

    it('should set the start azimuth when given', () => {
      expect(service.setStartGps(buildSection(), { latitude: 10, longitude: 20 }, 45).start_azimuth).toBe(45);
    });
  });

  describe('computeFootGps', () => {
    it('should store the computed foot GPS and spanAzimut', async () => {
      const result = await service.computeFootGps(buildSection());

      expect(workerMock.runTask).toHaveBeenCalledWith(
        Task.computeLocalization,
        expect.objectContaining({ startLatitude: 45, startLongitude: 3, startAzimuth: 90 })
      );
      expect(result.supports.map((s) => s.footLatitude)).toEqual(LOCALIZATION.latitude);
      expect(result.supports.map((s) => s.spanAzimut)).toEqual([90, 91, null]);
    });

    it('should return the section unchanged and warn when inputs are missing', async () => {
      const section = buildSection({ start_azimuth: null });
      expect(await service.computeFootGps(section)).toBe(section);
      expect(workerMock.runTask).not.toHaveBeenCalled();
      expect(loggerMock.warn).toHaveBeenCalled();
    });

    it('should return the section unchanged when the task reports an error', async () => {
      workerMock.runTask.mockResolvedValue({ result: null, error: TaskError.CALCULATION_ERROR, diagnostics: [] });
      const section = buildSection();
      expect(await service.computeFootGps(section)).toBe(section);
      expect(loggerMock.warn).toHaveBeenCalled();
    });

    it('should return the section unchanged when the task rejects', async () => {
      workerMock.runTask.mockRejectedValue(new Error('boom'));
      const section = buildSection();
      expect(await service.computeFootGps(section)).toBe(section);
    });

    it('should wait for the worker to be ready', async () => {
      workerMock.ready = false;
      ready$.next(false);
      const promise = service.computeFootGps(buildSection());
      ready$.next(true);
      const result = await promise;
      expect(result.supports[1].footLatitude).toBe(45.1);
    });

    it('should give up with a warning when the worker never becomes ready', async () => {
      vi.useFakeTimers();
      try {
        workerMock.ready = false;
        ready$.next(false);
        const section = buildSection();
        const promise = service.computeFootGps(section);
        await vi.advanceTimersByTimeAsync(11_000);
        expect(await promise).toBe(section);
        expect(workerMock.runTask).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('syncFootGps', () => {
    it('should not compute when there is no start GPS', async () => {
      const section = buildSection({ supports: [buildSupport(), buildSupport()] });
      expect(await service.syncFootGps(undefined, section)).toBe(section);
      expect(workerMock.runTask).not.toHaveBeenCalled();
    });

    it('should compute when there is no previous version', async () => {
      await service.syncFootGps(undefined, buildSection());
      expect(workerMock.runTask).toHaveBeenCalledTimes(1);
    });

    it('should not compute when geometry is unchanged and foot GPS complete', async () => {
      const section = buildLocatedSection();
      expect(await service.syncFootGps(section, { ...section })).toEqual(section);
      expect(workerMock.runTask).not.toHaveBeenCalled();
    });

    it('should compute when the geometry changed', async () => {
      const previous = buildLocatedSection();
      const next = {
        ...previous,
        supports: previous.supports.map((s, i) => (i === 0 ? { ...s, spanLength: 150 } : s))
      };
      await service.syncFootGps(previous, next);
      expect(workerMock.runTask).toHaveBeenCalledTimes(1);
    });

    it('should compute when a foot GPS is missing even if the geometry is unchanged', async () => {
      const section = buildSection();
      await service.syncFootGps(section, section);
      expect(workerMock.runTask).toHaveBeenCalledTimes(1);
    });

    it('should clear stale derived localization but keep the start GPS when the computation fails', async () => {
      workerMock.runTask.mockRejectedValue(new Error('boom'));
      const previous = buildLocatedSection();
      const next = {
        ...previous,
        supports: previous.supports.map((s, i) => (i === 0 ? { ...s, spanLength: 150 } : s))
      };

      const result = await service.syncFootGps(previous, next);

      expect(service.getFootGps(result)).toEqual([{ latitude: 45, longitude: 3 }, null, null]);
      expect(result.supports.map((s) => s.spanAzimut)).toEqual([null, null, null]);
    });

    it('should keep the known localization when the computation fails and the geometry is unchanged', async () => {
      const located = buildLocatedSection();
      const section: Section = {
        ...located,
        start_azimuth: null,
        supports: located.supports.map((s, i) => (i === 2 ? { ...s, footLatitude: null, footLongitude: null } : s))
      };

      const result = await service.syncFootGps(section, section);

      expect(workerMock.runTask).not.toHaveBeenCalled();
      expect(result).toBe(section);
      expect(service.getFootGps(result)).toEqual([
        { latitude: 45, longitude: 3 },
        { latitude: 45.1, longitude: 3.1 },
        null
      ]);
      expect(result.supports.map((s) => s.spanAzimut)).toEqual([90, 91, null]);
    });

    it('should keep the known localization when the worker fails and the geometry is unchanged', async () => {
      workerMock.runTask.mockRejectedValue(new Error('boom'));
      const located = buildLocatedSection();
      const section: Section = {
        ...located,
        supports: located.supports.map((s, i) => (i === 2 ? { ...s, footLatitude: null, footLongitude: null } : s))
      };

      const result = await service.syncFootGps(section, section);

      expect(result).toBe(section);
      expect(result.supports[1].footLatitude).toBe(45.1);
    });
  });

  describe('save', () => {
    it('should persist the synchronized section', async () => {
      const study = { sections: [] } as unknown as StudyEntity;
      const result = await service.save(study, undefined, buildSection());

      const saved = sectionServiceMock.createOrUpdateSection.mock.calls[0][1] as Section;
      expect(saved.supports[2].footLatitude).toBe(45.2);
      expect(result).toEqual({ removedGeometryBoundObjects: false });
    });

    it('should still persist the section when the worker fails', async () => {
      workerMock.runTask.mockRejectedValue(new Error('boom'));
      const study = { sections: [] } as unknown as StudyEntity;
      const section = buildSection();
      await service.save(study, undefined, section);
      expect(sectionServiceMock.createOrUpdateSection).toHaveBeenCalledWith(study, section);
    });

    it('should recompute on retry after a failed save following a geometry edit', async () => {
      const study = { sections: [] } as unknown as StudyEntity;
      const previous = buildLocatedSection();
      const edited = {
        ...previous,
        supports: previous.supports.map((s, i) => (i === 0 ? { ...s, spanLength: 150 } : s))
      };

      workerMock.runTask.mockRejectedValueOnce(new Error('boom'));
      await service.save(study, previous, edited);
      const failedSave = sectionServiceMock.createOrUpdateSection.mock.calls[0][1] as Section;
      expect(failedSave.supports[1].footLatitude).toBeNull();
      expect(failedSave.supports[0].spanAzimut).toBeNull();

      await service.save(study, failedSave, { ...failedSave });
      const retriedSave = sectionServiceMock.createOrUpdateSection.mock.calls[1][1] as Section;
      expect(workerMock.runTask).toHaveBeenCalledTimes(2);
      expect(retriedSave.supports.map((s) => s.footLatitude)).toEqual(LOCALIZATION.latitude);
      expect(retriedSave.supports.map((s) => s.spanAzimut)).toEqual([90, 91, null]);
    });
  });

  describe('resolveLocalization', () => {
    it('should return the stored localization without calling the worker', async () => {
      const result = await service.resolveLocalization(buildLocatedSection());
      expect(result).toEqual({ latitude: LOCALIZATION.latitude, longitude: LOCALIZATION.longitude, azimuth: [90, 91] });
      expect(workerMock.runTask).not.toHaveBeenCalled();
    });

    it('should compute on the fly when the stored localization is incomplete', async () => {
      const result = await service.resolveLocalization(buildSection());
      expect(result?.latitude).toEqual(LOCALIZATION.latitude);
      expect(workerMock.runTask).toHaveBeenCalledTimes(1);
    });

    it('should compute on the fly when the geometry changed since the reference', async () => {
      const reference = buildLocatedSection();
      const section = { ...reference, start_azimuth: 10 };
      await service.resolveLocalization(section, reference);
      expect(workerMock.runTask).toHaveBeenCalledTimes(1);
    });

    it('should return null when nothing is available', async () => {
      expect(await service.resolveLocalization(buildSection({ supports: [] }))).toBeNull();
    });
  });

  describe('toCrs', () => {
    it('should return an empty array for no points', async () => {
      expect(await service.toCrs([], CRS.LAMBERT93)).toEqual([]);
      expect(workerMock.runTask).not.toHaveBeenCalled();
    });

    it('should return WGS84 points without calling the worker', async () => {
      expect(await service.toCrs([{ latitude: 1, longitude: 2 }], CRS.WGS84)).toEqual([{ x: 2, y: 1 }]);
      expect(workerMock.runTask).not.toHaveBeenCalled();
    });

    it('should call the convertCoordinates task with x = longitude and y = latitude', async () => {
      workerMock.runTask.mockResolvedValue({ result: { x: [10, 20], y: [30, 40] }, error: null, diagnostics: [] });
      const result = await service.toCrs(
        [
          { latitude: 1, longitude: 2 },
          { latitude: 3, longitude: 4 }
        ],
        CRS.LAMBERT93
      );

      expect(workerMock.runTask).toHaveBeenCalledWith(Task.convertCoordinates, {
        sourceCrs: CRS.WGS84,
        targetCrs: CRS.LAMBERT93,
        x: [2, 4],
        y: [1, 3]
      });
      expect(result).toEqual([
        { x: 10, y: 30 },
        { x: 20, y: 40 }
      ]);
    });

    it('should return null when the task fails', async () => {
      workerMock.runTask.mockResolvedValue({ result: null, error: TaskError.CALCULATION_ERROR, diagnostics: [] });
      expect(await service.toCrs([{ latitude: 1, longitude: 2 }], CRS.LAMBERT93)).toBeNull();
    });
  });

  describe('sectionToCrs', () => {
    it('should reproject the resolved localization', async () => {
      workerMock.runTask.mockResolvedValue({ result: { x: [1, 2, 3], y: [4, 5, 6] }, error: null, diagnostics: [] });
      const result = await service.sectionToCrs(buildLocatedSection(), CRS.LAMBERT93);
      expect(result).toEqual([
        { x: 1, y: 4 },
        { x: 2, y: 5 },
        { x: 3, y: 6 }
      ]);
    });

    it('should return null when no localization is available', async () => {
      expect(await service.sectionToCrs(buildSection({ supports: [] }), CRS.LAMBERT93)).toBeNull();
    });
  });

  describe('applyImportedCoordinates', () => {
    const section = (): Section => buildSection({ supports: [buildSupport(), buildSupport()], start_azimuth: null });

    it('should set the foot GPS and derive span azimuths, start azimuth and position errors from the positions', async () => {
      workerMock.runTask.mockResolvedValueOnce({
        result: { azimuth: [80], startAzimuth: 35, positionErrorMeter: [0, 0.4] },
        error: null,
        diagnostics: []
      });
      const result = await service.applyImportedCoordinates(section(), { crs: 'WGS84', x: [3, 4], y: [45, 46] });

      expect(workerMock.runTask).toHaveBeenCalledWith(
        Task.validateGpsPositions,
        expect.objectContaining({ latitude: [45, 46], longitude: [3, 4] })
      );
      expect(result.supports.map((s) => [s.footLatitude, s.footLongitude, s.spanAzimut])).toEqual([
        [45, 3, 80],
        [46, 4, null]
      ]);
      expect(result.start_azimuth).toBe(35);
      expect(result.position_error_meters).toEqual([0, 0.4]);
    });

    it('should keep the foot GPS and the file values when the GPS validation fails', async () => {
      workerMock.runTask.mockResolvedValueOnce({ result: null, error: TaskError.CALCULATION_ERROR, diagnostics: [] });
      const input = buildSection({ supports: [buildSupport({ spanAzimut: 12 }), buildSupport()], start_azimuth: 40 });

      const result = await service.applyImportedCoordinates(input, { crs: 'WGS84', x: [3, 4], y: [45, 46] });

      expect(result.supports.map((s) => [s.footLatitude, s.footLongitude, s.spanAzimut])).toEqual([
        [45, 3, 12],
        [46, 4, null]
      ]);
      expect(result.start_azimuth).toBe(40);
      expect(result.position_error_meters).toBeNull();
      expect(loggerMock.warn).toHaveBeenCalled();
    });

    it('should skip incomplete WGS84 coordinates', async () => {
      const input = section();
      expect(await service.applyImportedCoordinates(input, { crs: 'WGS84', x: [3, null], y: [45, 46] })).toBe(input);
      expect(loggerMock.warn).toHaveBeenCalled();
    });

    it('should skip incomplete Lambert93 coordinates', async () => {
      const input = section();
      expect(await service.applyImportedCoordinates(input, { crs: 'LAMBERT93', x: [1], y: [2] })).toBe(input);
      expect(workerMock.runTask).not.toHaveBeenCalled();
    });

    it('should reproject Lambert93 coordinates in a single call and store the azimuth, start azimuth and position errors', async () => {
      workerMock.runTask.mockResolvedValueOnce({
        result: {
          localization: { latitude: [45, 45.2], longitude: [3, 3.2], azimuth: [81], lambert_x: [], lambert_y: [] },
          startAzimuth: 36,
          positionErrorMeter: [Number.NaN, 2.5]
        },
        error: null,
        diagnostics: []
      });

      const result = await service.applyImportedCoordinates(section(), {
        crs: 'LAMBERT93',
        x: [1, 2],
        y: [3, 4]
      });

      expect(workerMock.runTask).toHaveBeenCalledTimes(1);
      expect(workerMock.runTask).toHaveBeenCalledWith(
        Task.importLambertAndValidate,
        expect.objectContaining({ lambert_x: [1, 2], lambert_y: [3, 4] })
      );
      expect(workerMock.runTask.mock.calls[0][1]).not.toHaveProperty('startAzimuth');
      expect(result.supports.map((s) => [s.footLatitude, s.spanAzimut])).toEqual([
        [45, 81],
        [45.2, null]
      ]);
      expect(result.start_azimuth).toBe(36);
      expect(result.position_error_meters).toEqual([null, 2.5]);
    });

    it('should throw a GeopositioningError when the worker is not ready', async () => {
      vi.useFakeTimers();
      try {
        workerMock.ready = false;
        ready$.next(false);
        const promise = service.applyImportedCoordinates(section(), { crs: 'LAMBERT93', x: [1, 2], y: [3, 4] });
        const assertion = expect(promise).rejects.toThrow('Python worker is not ready');
        await vi.advanceTimersByTimeAsync(11_000);
        await assertion;
        expect(workerMock.runTask).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('should throw a GeopositioningError when the reprojection fails', async () => {
      workerMock.runTask.mockResolvedValueOnce({ result: null, error: TaskError.CALCULATION_ERROR, diagnostics: [] });
      await expect(
        service.applyImportedCoordinates(section(), { crs: 'LAMBERT93', x: [1, 2], y: [3, 4] })
      ).rejects.toBeInstanceOf(GeopositioningError);
    });
  });

  describe('computeStartFromNextSupport', () => {
    const input = {
      next: { latitude: 45, longitude: 3 },
      nextSpanAzimuth: 90,
      spanLength: 50,
      lineAngle: [0, 10] as [number, number]
    };

    it('should return the GPS of the new support 0 and the new start azimuth', async () => {
      workerMock.runTask.mockResolvedValueOnce({
        result: { latitude: 44.9, longitude: 2.9, startAzimuth: 30 },
        error: null,
        diagnostics: []
      });

      expect(await service.computeStartFromNextSupport(input)).toEqual({
        point: { latitude: 44.9, longitude: 2.9 },
        azimuth: 30
      });
      expect(workerMock.runTask).toHaveBeenCalledWith(Task.computeStartFromNextSupport, {
        latitude: 45,
        longitude: 3,
        nextSpanAzimuth: 90,
        spanLength: 50,
        lineAngle: [0, 10]
      });
    });

    it('should return null when the task reports an error', async () => {
      workerMock.runTask.mockResolvedValueOnce({ result: null, error: TaskError.CALCULATION_ERROR, diagnostics: [] });
      expect(await service.computeStartFromNextSupport(input)).toBeNull();
    });

    it('should return null when the task rejects', async () => {
      workerMock.runTask.mockRejectedValueOnce(new Error('boom'));
      expect(await service.computeStartFromNextSupport(input)).toBeNull();
    });
  });
});
