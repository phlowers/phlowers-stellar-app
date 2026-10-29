/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { Study } from '@shared/domain';
import { StudiesService } from '@core/services/studies/studies.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { UUIDCollisionResolver } from '@shared/import/domain/import-contracts.interfaces';
import { StudyImportService } from './study-import.service';

const STUDY_UUID = 'imported-study-uuid';

const LEGACY_SECTION = {
  uuid: 'legacy-section-uuid',
  name: 'Legacy section',
  start_latitude: 10.5,
  start_longitude: 20.5,
  start_azimuth: 90,
  mean_reprojection_diff_meters: 0.4,
  supports: [
    { uuid: 'legacy-support-1', spanLength: 100, spanAngle: 5, footLatitude: 10.5, footLongitude: 20.5, spanAzimut: 12 },
    { uuid: 'legacy-support-2', spanLength: null, spanAngle: null, footLatitude: 10.6, footLongitude: 20.6, spanAzimut: 13 }
  ]
};

const CURRENT_SECTION = {
  uuid: 'current-section-uuid',
  name: 'Current section',
  start_azimuth: 37,
  supports: [
    { uuid: 'current-support-1', spanLength: 100, spanAngle: 5, footLatitude: 30.5, footLongitude: 40.5, spanAzimut: 12 },
    { uuid: 'current-support-2', spanLength: null, spanAngle: null, footLatitude: 30.6, footLongitude: 40.6, spanAzimut: 13 }
  ],
  field_measures: [null, { date: '2025-06-01T00:00:00.000Z', time: '2025-06-01T10:00:00.000Z', season: 'summer' }]
};

/** Builds a plain-JSON `.stsd` file, as exported by the app. */
const buildStsdFile = (content: unknown): File =>
  new File([JSON.stringify(content)], 'study.stsd', { type: 'application/json' });

describe('StudyImportService', () => {
  let service: StudyImportService;
  let studiesService: {
    getStudy: ReturnType<typeof vi.fn>;
    createStudy: ReturnType<typeof vi.fn>;
    deleteStudy: ReturnType<typeof vi.fn>;
  };
  let logger: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let collisionResolver: UUIDCollisionResolver;

  beforeEach(() => {
    studiesService = {
      getStudy: vi.fn().mockResolvedValueOnce(null).mockResolvedValue({ uuid: STUDY_UUID, title: 'Study' }),
      createStudy: vi.fn().mockResolvedValue(STUDY_UUID),
      deleteStudy: vi.fn().mockResolvedValue(undefined)
    };
    logger = { info: vi.fn(), error: vi.fn() };
    collisionResolver = vi.fn<UUIDCollisionResolver>().mockResolvedValue(false);

    TestBed.configureTestingModule({
      providers: [
        { provide: StudiesService, useValue: studiesService },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: CablesService, useValue: { getCables: vi.fn().mockResolvedValue([]) } },
        { provide: LoggerService, useValue: logger },
        { provide: TranslocoService, useValue: { translate: vi.fn((key: string) => key) } }
      ]
    });
    service = TestBed.inject(StudyImportService);
  });

  /** Imports a study file and returns the study handed over to `StudiesService.createStudy`. */
  const importStudy = async (sections: unknown[]): Promise<Study> => {
    const file = buildStsdFile({ uuid: STUDY_UUID, title: 'Study', sections });
    await service.loadAppFile(file, collisionResolver);
    return studiesService.createStudy.mock.calls[0][0] as Study;
  };

  describe('legacy section geolocation', () => {
    it('should drop every legacy geolocation value of an .stsd section on import', async () => {
      const study = await importStudy([LEGACY_SECTION]);
      const section = study.sections[0] as unknown as Record<string, unknown>;

      expect(section['uuid']).toBe('legacy-section-uuid');
      expect(section['name']).toBe('Legacy section');
      expect('start_latitude' in section).toBe(false);
      expect('start_longitude' in section).toBe(false);
      expect('mean_reprojection_diff_meters' in section).toBe(false);
      expect(study.sections[0].start_azimuth).toBeNull();
      expect(study.sections[0].supports.map((s) => [s.footLatitude, s.footLongitude, s.spanAzimut])).toEqual([
        [null, null, null],
        [null, null, null]
      ]);
      expect(study.sections[0].supports.map((s) => s.uuid)).toEqual(['legacy-support-1', 'legacy-support-2']);
    });

    it('should log once per dropped legacy section', async () => {
      await importStudy([LEGACY_SECTION, CURRENT_SECTION]);

      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('Legacy section geolocation dropped on import', {
        sectionUuid: 'legacy-section-uuid'
      });
    });

    it('should drop the geolocation of an older section that has no start_azimuth key', async () => {
      const olderSection = { uuid: 'older-section-uuid', supports: [{ uuid: 's', footLatitude: 1, footLongitude: 2 }] };

      const study = await importStudy([olderSection]);

      expect(study.sections[0].start_azimuth).toBeNull();
      expect(study.sections[0].supports[0].footLatitude).toBeNull();
      expect(study.sections[0].supports[0].footLongitude).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('Legacy section geolocation dropped on import', {
        sectionUuid: 'older-section-uuid'
      });
    });
  });

  describe('current section geolocation', () => {
    it('should keep foot GPS, span azimuth and start azimuth of a new-format section', async () => {
      const study = await importStudy([CURRENT_SECTION]);

      expect(study.sections[0].start_azimuth).toBe(37);
      expect(study.sections[0].supports.map((s) => [s.footLatitude, s.footLongitude, s.spanAzimut])).toEqual([
        [30.5, 40.5, 12],
        [30.6, 40.6, 13]
      ]);
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('malformed entries', () => {
    it('should ignore section entries that are not plain objects without throwing', async () => {
      const study = await importStudy([null, 42, 'section', [CURRENT_SECTION], CURRENT_SECTION]);

      expect(study.sections.map((s) => s.uuid)).toEqual(['current-section-uuid']);
    });

    it('should ignore field measure entries that are not plain objects without throwing', async () => {
      const study = await importStudy([CURRENT_SECTION]);

      expect(study.sections[0].field_measures).toHaveLength(1);
      expect(study.sections[0].field_measures[0].date).toBeInstanceOf(Date);
      expect(study.sections[0].field_measures[0].season).toBe('summer');
    });
  });
});
