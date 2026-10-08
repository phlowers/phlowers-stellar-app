/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TranslocoService } from '@jsverse/transloco';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@services/notification/notification.service';
import { SectionService } from '@services/section/section.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Section, Study } from '@shared/domain';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import {
  SECTION_IMPORT_ADAPTERS,
  SectionImportAdapter,
  SectionImportPayload
} from '@shared/import/section-adapter/section-import-adapter';
import { SectionImportService } from './section-import.service';

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

const makeFile = (content: string, name = 'section.fake'): File => new File([content], name);
const accept = () => Promise.resolve(true);

const buildSection = (overrides: Partial<Section> = {}): Section => ({
  ...createEmptySection(),
  uuid: 'sec-1',
  name: 'Adapter Section',
  type: 'phase',
  cables_amount: 1,
  cable_name: 'ASTER570',
  supports: [
    { ...createEmptySupport(), number: '1', spanLength: 100, spanAngle: 0, chainLength: 1, attachmentHeight: 20 },
    { ...createEmptySupport(), number: '2', spanLength: null, spanAngle: 0, chainLength: 1, attachmentHeight: 20 }
  ],
  ...overrides
});

const buildStudy = (sections: Section[] = []): Study => ({
  uuid: 'study-1',
  author_email: 'test@test.com',
  title: 'Study',
  shareable: false,
  created_at_offline: new Date().toISOString(),
  updated_at_offline: new Date().toISOString(),
  saved: true,
  sections
});

const buildAdapter = (overrides: Partial<SectionImportAdapter> = {}): SectionImportAdapter => ({
  id: 'fake',
  formatLabel: 'Fake',
  extensions: ['.fake'],
  canHandle: () => true,
  extractUuid: () => 'sec-1',
  import: () => Promise.resolve({ section: buildSection() }),
  ...overrides
});

describe('SectionImportService — adapter orchestration', () => {
  let service: SectionImportService;
  let adapters: SectionImportAdapter[];
  let sectionServiceMock: { createOrUpdateSection: ReturnType<typeof vi.fn>; deleteSection: ReturnType<typeof vi.fn> };
  let notificationMock: Record<'success' | 'info' | 'warning' | 'error', ReturnType<typeof vi.fn>>;
  let loggerMock: Record<'error' | 'warn' | 'log' | 'info', ReturnType<typeof vi.fn>>;
  let runTaskMock: ReturnType<typeof vi.fn>;

  const configure = (list: SectionImportAdapter[]) => {
    adapters = list;
    TestBed.configureTestingModule({
      providers: [
        SectionImportService,
        { provide: SECTION_IMPORT_ADAPTERS, useValue: adapters },
        { provide: SectionService, useValue: sectionServiceMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: LoggerService, useValue: loggerMock },
        { provide: WorkerPythonService, useValue: { runTask: runTaskMock } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } }
      ]
    });
    service = TestBed.inject(SectionImportService);
    service.setStudyContext(buildStudy());
  };

  beforeEach(() => {
    sectionServiceMock = {
      createOrUpdateSection: vi.fn().mockResolvedValue(undefined),
      deleteSection: vi.fn().mockResolvedValue(undefined)
    };
    notificationMock = { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() };
    loggerMock = { error: vi.fn(), warn: vi.fn(), log: vi.fn(), info: vi.fn() };
    runTaskMock = vi.fn();
  });

  describe('accepts()', () => {
    it('should accept the extensions declared by any adapter, case-insensitively', () => {
      configure([buildAdapter({ extensions: ['.fake'] }), buildAdapter({ extensions: ['.other'] })]);

      expect(service.accepts(new File([], 'a.FAKE'))).toBe(true);
      expect(service.accepts(new File([], 'a.other'))).toBe(true);
      expect(service.accepts(new File([], 'a.json'))).toBe(false);
    });
  });

  describe('adapter selection', () => {
    it('should use the first adapter that handles the content', async () => {
      const first = buildAdapter({ id: 'first', canHandle: () => false, import: vi.fn() });
      const second = buildAdapter({ id: 'second', import: vi.fn().mockResolvedValue({ section: buildSection() }) });
      const third = buildAdapter({ id: 'third', import: vi.fn() });
      configure([first, second, third]);

      await service.processFile(makeFile('{}'), accept);

      expect(second.import).toHaveBeenCalledTimes(1);
      expect(first.import).not.toHaveBeenCalled();
      expect(third.import).not.toHaveBeenCalled();
    });

    it('should hand the decoded text and parsed JSON to the adapter', async () => {
      const importFn = vi.fn().mockResolvedValue({ section: buildSection() });
      configure([buildAdapter({ import: importFn })]);

      await service.processFile(makeFile('{"a":1}', 'x.fake'), accept);

      expect(importFn).toHaveBeenCalledWith({ fileName: 'x.fake', text: '{"a":1}', json: { a: 1 } });
    });

    it('should reject content no adapter recognizes with FILE_TYPE_NOT_ALLOWED', async () => {
      configure([buildAdapter({ canHandle: () => false })]);

      await expect(service.processFile(makeFile('{}'), accept)).rejects.toMatchObject({
        code: 'FILE_TYPE_NOT_ALLOWED',
        stage: 'FILE_VALIDATION',
        message: 'section-import.no-matching-adapter'
      });
    });

    it('should report FILE_PARSE_ERROR when nothing handles a file that is not valid JSON', async () => {
      configure([buildAdapter({ canHandle: () => false })]);

      await expect(service.processFile(makeFile('{oops'), accept)).rejects.toMatchObject({
        code: 'FILE_PARSE_ERROR',
        stage: 'PARSING'
      });
    });
  });

  describe('checkCollision()', () => {
    it('should use the UUID extracted by the matching adapter', async () => {
      const existing = buildSection({ uuid: 'from-adapter', name: 'Existing' });
      configure([buildAdapter({ extractUuid: () => 'from-adapter' })]);
      service.setStudyContext(buildStudy([existing]));

      expect(await service.checkCollision(makeFile('{}'))).toEqual({ uuid: 'from-adapter', label: 'Existing' });
    });

    it('should return null when no adapter matches or the adapter finds no UUID', async () => {
      configure([buildAdapter({ canHandle: () => false })]);
      expect(await service.checkCollision(makeFile('{}'))).toBeNull();

      TestBed.resetTestingModule();
      configure([buildAdapter({ extractUuid: () => null })]);
      expect(await service.checkCollision(makeFile('{}'))).toBeNull();
    });
  });

  describe('adapter errors', () => {
    it('should pass an adapter ImportError through unchanged', async () => {
      const adapterError = { code: 'MY_ADAPTER_ERROR', message: 'adapter message', stage: 'VALIDATION' };
      configure([buildAdapter({ import: () => Promise.reject(adapterError) })]);

      await expect(service.processFile(makeFile('{}'), accept)).rejects.toBe(adapterError);
    });

    it('should wrap an unexpected failure into a MAPPING_ERROR and log it', async () => {
      const cause = new Error('boom');
      configure([buildAdapter({ id: 'broken', import: () => Promise.reject(cause) })]);

      await expect(service.processFile(makeFile('{}'), accept)).rejects.toMatchObject({
        code: 'MAPPING_ERROR',
        stage: 'MAPPING',
        cause
      });
      expect(loggerMock.error).toHaveBeenCalledWith('Section import adapter "broken" failed', cause);
    });
  });

  describe('generic validation of the adapter output', () => {
    it('should reject a section missing required fields, whatever the adapter', async () => {
      configure([buildAdapter({ import: () => Promise.resolve({ section: buildSection({ name: '' }) }) })]);

      await expect(service.processFile(makeFile('{}'), accept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('name')
      });
      expect(sectionServiceMock.createOrUpdateSection).not.toHaveBeenCalled();
    });

    const outOfBounds = (): SectionImportPayload => {
      const section = buildSection();
      section.supports[0].spanLength = 6000;
      return { section };
    };

    it('should enforce the supports bounds by default', async () => {
      configure([buildAdapter({ import: () => Promise.resolve(outOfBounds()) })]);

      await expect(service.processFile(makeFile('{}'), accept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'section-import.validation-supports-bounds'
      });
    });

    it('should skip the supports bounds check when the adapter opts out', async () => {
      configure([
        buildAdapter({ import: () => Promise.resolve({ ...outOfBounds(), skipSectionValidation: true }) })
      ]);

      await expect(service.processFile(makeFile('{}'), accept)).resolves.toBeTruthy();
    });

    it('should skip the required-fields check when the adapter opts out', async () => {
      configure([
        buildAdapter({
          import: () => Promise.resolve({ section: buildSection({ name: '' }), skipSectionValidation: true })
        })
      ]);

      await expect(service.processFile(makeFile('{}'), accept)).resolves.toBeTruthy();
    });
  });

  describe('coordinates', () => {
    it('should apply WGS84 coordinates as foot positions and start location without calling Python', async () => {
      const coordinates = { crs: 'WGS84' as const, x: [3.1, 3.2], y: [45.1, 45.2] };
      configure([buildAdapter({ import: () => Promise.resolve({ section: buildSection(), coordinates }) })]);

      const result = await service.processFile(makeFile('{}'), accept);

      expect(result?.supports.map((s) => [s.footLatitude, s.footLongitude])).toEqual([
        [45.1, 3.1],
        [45.2, 3.2]
      ]);
      expect(result?.start_latitude).toBe(45.1);
      expect(result?.start_longitude).toBe(3.1);
      expect(runTaskMock).not.toHaveBeenCalled();
    });

    it('should skip incomplete WGS84 coordinates and keep the section unchanged', async () => {
      const coordinates = { crs: 'WGS84' as const, x: [3.1, null], y: [45.1, 45.2] };
      configure([buildAdapter({ import: () => Promise.resolve({ section: buildSection(), coordinates }) })]);

      const result = await service.processFile(makeFile('{}'), accept);

      expect(result?.supports[0].footLatitude).toBeNull();
      expect(loggerMock.warn).toHaveBeenCalled();
    });

    it('should skip incomplete Lambert93 coordinates without calling Python', async () => {
      const coordinates = { crs: 'LAMBERT93' as const, x: [1, null], y: [1, 2] };
      configure([buildAdapter({ import: () => Promise.resolve({ section: buildSection(), coordinates }) })]);

      const result = await service.processFile(makeFile('{}'), accept);

      expect(result?.mean_reprojection_diff_meters).toBeNull();
      expect(runTaskMock).not.toHaveBeenCalled();
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  describe('notifications', () => {
    it('should show the success toast then the adapter notices by severity', async () => {
      const notices = [
        { severity: 'warning' as const, message: 'careful' },
        { severity: 'info' as const, message: 'fyi' }
      ];
      configure([buildAdapter({ import: () => Promise.resolve({ section: buildSection(), notices }) })]);

      await service.processFile(makeFile('{}'), accept);

      expect(notificationMock.success).toHaveBeenCalledWith('section-import.import-success');
      expect(notificationMock.warning).toHaveBeenCalledWith('careful');
      expect(notificationMock.info).toHaveBeenCalledWith('fyi');
    });
  });
});
