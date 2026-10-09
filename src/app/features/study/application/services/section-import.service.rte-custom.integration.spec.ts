/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { LoggerService } from '@core/services/logger/logger.service';
import { Task } from '@core/services/worker_python/tasks/types';
import { NotificationService } from '@services/notification/notification.service';
import { SectionService } from '@services/section/section.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { SectionImportService } from './section-import.service';
import { Study } from '@shared/domain';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { SECTION_IMPORT_ADAPTERS } from '@shared/import/section-adapter/section-import-adapter';
import fakeCantonFull from '@adapters/section-import/rte-custom/fixtures/fake-canton-full.json';
import expectedSection from '@adapters/section-import/rte-custom/fixtures/fake-canton-full.expected-section.json';
import { RteCustomAdapter } from '@adapters/section-import/rte-custom/rte-custom.adapter';

// jsdom does not implement File.prototype.text
if (typeof File !== 'undefined' && !File.prototype.text) {
  Object.defineProperty(File.prototype, 'text', {
    configurable: true,
    writable: true,
    value(): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(this as Blob);
      });
    }
  });
}

// Span order, not file order: the file lists the spans shuffled.
const EXPECTED_LAMBERT_X = [1000, 1250.5, 1510.75, 1726.5, 1956.5, 2197];
const EXPECTED_LAMBERT_Y = [5000, 5020, 5040, 5060, 5080, 5100];

// Catalog entries keyed by `${SUPPORT_IDR}|${attachment set}`; "FAKE-POLE-PP3" is deliberately absent.
const ATTACHMENT_CATALOG: Record<
  string,
  { attachment_set: number; cross_arm_length: number; attachment_altitude: number }
> = {
  'FAKE-EN-TOWER|41': { attachment_set: 41, cross_arm_length: -6, attachment_altitude: 20 },
  'FAKE-EN-TOWER|21': { attachment_set: 21, cross_arm_length: -6, attachment_altitude: 20 },
  'FAKE-POLE|1': { attachment_set: 1, cross_arm_length: -6, attachment_altitude: 20 },
  'FAKE-TOWER-2X|1': { attachment_set: 1, cross_arm_length: -3.5, attachment_altitude: 15.38 }
};

// "Chaine double en A" is deliberately absent: the file values must be kept for it.
const CHAIN_CATALOG = [
  { chain_name: 'FAKE-CHAIN-X', mean_length: 1.82, mean_mass: 41.8, v_chain: false, chain_surface: 0 },
  { chain_name: 'FAKE-CHAIN-M', mean_length: 1.25, mean_mass: 41.44, v_chain: false, chain_surface: 0 },
  { chain_name: 'FAKE-CHAIN-N', mean_length: 1.29, mean_mass: 35.5, v_chain: false, chain_surface: 0 },
  { chain_name: 'FAKE-CHAIN-K', mean_length: 1.4, mean_mass: 82.06, v_chain: false, chain_surface: 0 }
];

const MAINTENANCE_CATALOG = [
  {
    maintenance_center: 'FAKE-CM-02',
    maintenance_center_id: 'fake-center-id',
    regional_team: 'FAKE-GMR-02',
    regional_team_id: 'fake-regional-id',
    maintenance_team: 'FAKE-EEL-02',
    maintenance_team_id: 'fake-team-id'
  }
];

const buildStudy = (): Study => ({
  uuid: 'study-1',
  author_email: 'test@test.com',
  title: 'Study',
  shareable: false,
  created_at_offline: new Date().toISOString(),
  updated_at_offline: new Date().toISOString(),
  saved: true,
  sections: []
});

describe('RTE custom canton file → Section (integration)', () => {
  let service: SectionImportService;
  let sectionServiceMock: { createOrUpdateSection: ReturnType<typeof vi.fn> };
  let notificationMock: Record<'success' | 'info' | 'warning' | 'error', ReturnType<typeof vi.fn>>;
  let runTaskMock: ReturnType<typeof vi.fn>;

  /** Reprojection is a Python-worker boundary: it answers with the GPS values of the expected section. */
  const mockReprojection = (task: Task) => {
    const localization = {
      latitude: expectedSection.supports.map((s) => s.footLatitude),
      longitude: expectedSection.supports.map((s) => s.footLongitude),
      azimuth: expectedSection.supports.map(() => expectedSection.start_azimuth),
      lambert_x: EXPECTED_LAMBERT_X,
      lambert_y: EXPECTED_LAMBERT_Y
    };
    if (task === Task.importLambert) {
      return Promise.resolve({ result: localization, error: null, pythonErrorCode: null });
    }
    return Promise.resolve({
      result: { localization, meanGpsDiffMeter: expectedSection.mean_reprojection_diff_meters },
      error: null,
      pythonErrorCode: null
    });
  };

  const importFakeCanton = async () => {
    const file = new File([JSON.stringify(fakeCantonFull)], 'canton.json');
    return service.processFile(file, () => Promise.resolve(true));
  };

  beforeEach(() => {
    sectionServiceMock = { createOrUpdateSection: vi.fn().mockResolvedValue(undefined) };
    notificationMock = { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() };
    runTaskMock = vi.fn(mockReprojection);

    TestBed.configureTestingModule({
      providers: [
        SectionImportService,
        RteCustomAdapter,
        {
          provide: SECTION_IMPORT_ADAPTERS,
          useFactory: () => [TestBed.inject(RteCustomAdapter)]
        },
        { provide: SectionService, useValue: sectionServiceMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: LoggerService, useValue: { warn: vi.fn(), error: vi.fn(), log: vi.fn(), info: vi.fn() } },
        { provide: WorkerPythonService, useValue: { runTask: runTaskMock } },
        { provide: MaintenanceService, useValue: { getMaintenance: vi.fn().mockResolvedValue(MAINTENANCE_CATALOG) } },
        { provide: ChainsService, useValue: { getChains: vi.fn().mockResolvedValue(CHAIN_CATALOG) } },
        { provide: LinesService, useValue: { getLines: vi.fn().mockResolvedValue([{ voltage_idr: '63 KV' }]) } },
        {
          provide: AttachmentService,
          useValue: {
            addSupportNamesIfAbsent: vi.fn().mockResolvedValue(undefined),
            resolveCatalogAttachment: vi.fn(
              async (idr: string, _adr: string | null, set: number) => ATTACHMENT_CATALOG[`${idr}|${set}`]
            )
          }
        },
        {
          provide: TranslocoService,
          useValue: {
            translate: (key: string) => key,
            selectTranslate: (key: string) => of(key)
          }
        }
      ]
    });
    service = TestBed.inject(SectionImportService);
    service.setStudyContext(buildStudy());
  });

  it('should produce the expected section, supports in span order with catalog values and GPS foot coordinates', async () => {
    const section = await importFakeCanton();

    expect(section).toEqual({
      ...expectedSection,
      created_at: expect.any(String),
      updated_at: expect.any(String),
      supports: expectedSection.supports.map((support) => ({ ...support, uuid: expect.any(String) }))
    });
  });

  it('should persist the very same section in the study', async () => {
    const section = await importFakeCanton();

    expect(sectionServiceMock.createOrUpdateSection).toHaveBeenCalledTimes(1);
    expect(sectionServiceMock.createOrUpdateSection).toHaveBeenCalledWith(expect.anything(), section);
  });

  it('should reproject the Lambert93 foot coordinates in span order', async () => {
    await importFakeCanton();

    expect(runTaskMock).toHaveBeenCalledWith(Task.importLambert, {
      lambert_x: EXPECTED_LAMBERT_X,
      lambert_y: EXPECTED_LAMBERT_Y
    });
    expect(runTaskMock).toHaveBeenCalledWith(
      Task.importLambertAndValidate,
      expect.objectContaining({ lambert_x: EXPECTED_LAMBERT_X, lambert_y: EXPECTED_LAMBERT_Y })
    );
  });

  it('should notify the success, the reprojection error and one catalog warning', async () => {
    await importFakeCanton();

    expect(notificationMock.success).toHaveBeenCalledTimes(1);
    expect(notificationMock.warning).toHaveBeenCalledTimes(1);
    expect(notificationMock.info).toHaveBeenCalledTimes(1);
  });
});
