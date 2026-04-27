/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MessageService } from 'primeng/api';
import { SectionImportService } from './section-import.service';
import { SectionService } from '@services/section/section.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { Section, Study } from '@shared/domain';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';

// ---------------------------------------------------------------------------
// Polyfill File.prototype.text — jsdom 26 does not implement it
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeJsonFile = (content: unknown, name = 'section.json'): File =>
  new File([JSON.stringify(content)], name, { type: 'application/json' });

const makeTextFile = (content: string, name = 'bad.json'): File =>
  new File([content], name, { type: 'application/json' });

const neverAccept = () => Promise.resolve(false);
const alwaysAccept = () => Promise.resolve(true);

/** Builds a minimal valid section payload (all required fields filled). */
const buildValidSectionPayload = (): Partial<Section> & Record<string, unknown> => ({
  uuid: 'sec-uuid-1',
  name: 'Test Section',
  type: 'phase',
  cables_amount: 1,
  cable_name: 'ASTER570',
  supports: [
    {
      ...createEmptySupport(),
      number: '1',
      spanLength: 100,
      spanAngle: 0,
      chainLength: 1,
      attachmentHeight: 20
    },
    {
      ...createEmptySupport(),
      number: '2',
      spanLength: null, // last support — spanLength may be null
      spanAngle: 0,
      chainLength: 1,
      attachmentHeight: 20
    }
  ]
});

/** Builds a minimal valid Study containing no sections. */
const buildMockStudy = (sections: Section[] = []): Study => ({
  uuid: 'study-uuid-1',
  author_email: 'test@test.com',
  title: 'Test Study',
  shareable: false,
  created_at_offline: new Date().toISOString(),
  updated_at_offline: new Date().toISOString(),
  saved: true,
  sections
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SectionImportService', () => {
  let service: SectionImportService;
  let sectionServiceMock: vi.Mocked<SectionService>;
  let messageServiceMock: vi.Mocked<MessageService>;
  let loggerSpy: vi.Mocked<LoggerService>;

  beforeEach(() => {
    sectionServiceMock = {
      createOrUpdateSection: vi.fn().mockResolvedValue(undefined),
      deleteSection: vi.fn().mockResolvedValue(undefined),
      duplicateSection: vi.fn(),
      getSectionByUuid: vi.fn()
    } as unknown as vi.Mocked<SectionService>;

    messageServiceMock = { add: vi.fn() } as unknown as vi.Mocked<MessageService>;

    loggerSpy = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    } as unknown as vi.Mocked<LoggerService>;

    TestBed.configureTestingModule({
      providers: [
        SectionImportService,
        { provide: SectionService, useValue: sectionServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: LoggerService, useValue: loggerSpy }
      ]
    });
    service = TestBed.inject(SectionImportService);
  });

  // -------------------------------------------------------------------------
  // accepts()
  // -------------------------------------------------------------------------

  describe('accepts()', () => {
    it('should accept .json files', () => {
      expect(service.accepts(new File([], 'section.json'))).toBe(true);
    });

    it('should accept .JSON files (case-insensitive)', () => {
      expect(service.accepts(new File([], 'section.JSON'))).toBe(true);
    });

    it('should reject non-json files', () => {
      expect(service.accepts(new File([], 'section.csv'))).toBe(false);
      expect(service.accepts(new File([], 'section.clst'))).toBe(false);
      expect(service.accepts(new File([], 'section.txt'))).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // checkCollision()
  // -------------------------------------------------------------------------

  describe('checkCollision()', () => {
    it('should return null when studyContext is not set', async () => {
      const file = makeJsonFile({ uuid: 'sec-uuid-1' });
      const result = await service.checkCollision(file);
      expect(result).toBeNull();
    });

    it('should return null when no section in study matches the UUID', async () => {
      service.setStudyContext(buildMockStudy());
      const file = makeJsonFile({ uuid: 'unknown-uuid' });
      expect(await service.checkCollision(file)).toBeNull();
    });

    it('should return collision info when UUID matches an existing section', async () => {
      const existing = { ...createEmptySection(), uuid: 'sec-uuid-1', name: 'Existing Section' } as Section;
      service.setStudyContext(buildMockStudy([existing]));
      const file = makeJsonFile({ uuid: 'sec-uuid-1' });

      const result = await service.checkCollision(file);
      expect(result).toEqual({ uuid: 'sec-uuid-1', label: 'Existing Section' });
    });

    it('should return null when file has no uuid field', async () => {
      service.setStudyContext(buildMockStudy());
      const file = makeJsonFile({ name: 'No UUID here' });
      expect(await service.checkCollision(file)).toBeNull();
    });

    it('should return null when file content is invalid JSON', async () => {
      service.setStudyContext(buildMockStudy());
      const file = makeTextFile('{invalid json}');
      expect(await service.checkCollision(file)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // processFile() — no study context
  // -------------------------------------------------------------------------

  describe('processFile() — no study context', () => {
    it('should throw PERSISTENCE_ERROR when no study context is set', async () => {
      const file = makeJsonFile(buildValidSectionPayload());
      await expect(service.processFile(file, neverAccept)).rejects.toMatchObject({
        code: 'PERSISTENCE_ERROR',
        stage: 'PERSISTENCE'
      });
    });
  });

  // -------------------------------------------------------------------------
  // processFile() — parsing
  // -------------------------------------------------------------------------

  describe('processFile() — parsing', () => {
    beforeEach(() => {
      service.setStudyContext(buildMockStudy());
    });

    it('should throw FILE_PARSE_ERROR for malformed JSON', async () => {
      const file = makeTextFile('{invalid}');
      await expect(service.processFile(file, neverAccept)).rejects.toMatchObject({
        code: 'FILE_PARSE_ERROR',
        stage: 'PARSING'
      });
      expect(loggerSpy.error).toHaveBeenCalledWith('Error parsing section JSON', expect.anything());
    });
  });

  // -------------------------------------------------------------------------
  // processFile() — validation
  // -------------------------------------------------------------------------

  describe('processFile() — validation', () => {
    beforeEach(() => {
      service.setStudyContext(buildMockStudy());
    });

    it('should throw VALIDATION_ERROR when name is empty', async () => {
      const payload = { ...buildValidSectionPayload(), name: '' };
      await expect(service.processFile(makeJsonFile(payload), neverAccept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        stage: 'VALIDATION'
      });
    });

    it('should throw VALIDATION_ERROR when cable_name is missing', async () => {
      const payload = { ...buildValidSectionPayload(), cable_name: undefined };
      await expect(service.processFile(makeJsonFile(payload), neverAccept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        stage: 'VALIDATION'
      });
    });

    it('should throw VALIDATION_ERROR when cables_amount is 0', async () => {
      const payload = { ...buildValidSectionPayload(), cables_amount: 0 };
      await expect(service.processFile(makeJsonFile(payload), neverAccept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        stage: 'VALIDATION'
      });
    });

    it('should throw VALIDATION_ERROR when a support spanLength is out of bounds (> 5000)', async () => {
      const payload = buildValidSectionPayload();
      (payload.supports as ReturnType<typeof createEmptySupport>[])[0].spanLength = 99999;
      await expect(service.processFile(makeJsonFile(payload), neverAccept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        stage: 'VALIDATION'
      });
    });

    it('should throw VALIDATION_ERROR when a support attachmentHeight is out of bounds (< -100)', async () => {
      const payload = buildValidSectionPayload();
      (payload.supports as ReturnType<typeof createEmptySupport>[])[0].attachmentHeight = -200;
      await expect(service.processFile(makeJsonFile(payload), neverAccept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        stage: 'VALIDATION'
      });
    });
  });

  // -------------------------------------------------------------------------
  // processFile() — success
  // -------------------------------------------------------------------------

  describe('processFile() — success', () => {
    it('should persist the section and emit success notification', async () => {
      service.setStudyContext(buildMockStudy());
      const payload = buildValidSectionPayload();
      const file = makeJsonFile(payload);

      const result = await service.processFile(file, neverAccept);

      expect(sectionServiceMock.createOrUpdateSection).toHaveBeenCalledTimes(1);
      expect(result).not.toBeNull();
      expect(result?.uuid).toBe('sec-uuid-1');
      expect(messageServiceMock.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('should merge imported data on top of createEmptySection defaults', async () => {
      service.setStudyContext(buildMockStudy());
      const payload = buildValidSectionPayload();
      const file = makeJsonFile(payload);

      const result = await service.processFile(file, neverAccept);

      // Fields from the payload are preserved
      expect(result?.name).toBe('Test Section');
      expect(result?.cable_name).toBe('ASTER570');
    });

    it('should merge supports on top of createEmptySupport defaults', async () => {
      service.setStudyContext(buildMockStudy());
      const payload = buildValidSectionPayload();
      const file = makeJsonFile(payload);

      const result = await service.processFile(file, neverAccept);

      expect(result?.supports[0].number).toBe('1');
      expect(result?.supports[0].spanLength).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // processFile() — UUID collision flow
  // -------------------------------------------------------------------------

  describe('processFile() — UUID collision flow', () => {
    it('should return null when user rejects collision replacement', async () => {
      const existing = { ...createEmptySection(), uuid: 'sec-uuid-1', name: 'Existing' } as Section;
      service.setStudyContext(buildMockStudy([existing]));
      const file = makeJsonFile(buildValidSectionPayload());

      const result = await service.processFile(file, neverAccept);

      expect(result).toBeNull();
      expect(sectionServiceMock.deleteSection).not.toHaveBeenCalled();
      expect(sectionServiceMock.createOrUpdateSection).not.toHaveBeenCalled();
    });

    it('should delete existing section and re-create when user accepts collision replacement', async () => {
      const existing = { ...createEmptySection(), uuid: 'sec-uuid-1', name: 'Existing' } as Section;
      service.setStudyContext(buildMockStudy([existing]));
      const file = makeJsonFile(buildValidSectionPayload());

      const result = await service.processFile(file, alwaysAccept);

      expect(sectionServiceMock.deleteSection).toHaveBeenCalledWith(expect.anything(), existing);
      expect(sectionServiceMock.createOrUpdateSection).toHaveBeenCalledTimes(1);
      expect(result).not.toBeNull();
    });

    it('should throw PERSISTENCE_ERROR when deleteSection fails during collision replacement', async () => {
      const existing = { ...createEmptySection(), uuid: 'sec-uuid-1', name: 'Existing' } as Section;
      service.setStudyContext(buildMockStudy([existing]));
      sectionServiceMock.deleteSection.mockRejectedValue(new Error('delete failed'));
      const file = makeJsonFile(buildValidSectionPayload());

      await expect(service.processFile(file, alwaysAccept)).rejects.toMatchObject({
        code: 'PERSISTENCE_ERROR',
        stage: 'PERSISTENCE'
      });
      expect(loggerSpy.error).toHaveBeenCalledWith('Error deleting existing section', expect.any(Error));
    });
  });

  // -------------------------------------------------------------------------
  // processFile() — persistence error
  // -------------------------------------------------------------------------

  describe('processFile() — persistence error', () => {
    it('should throw PERSISTENCE_ERROR when createOrUpdateSection fails', async () => {
      service.setStudyContext(buildMockStudy());
      sectionServiceMock.createOrUpdateSection.mockRejectedValue(new Error('db error'));
      const file = makeJsonFile(buildValidSectionPayload());

      await expect(service.processFile(file, neverAccept)).rejects.toMatchObject({
        code: 'PERSISTENCE_ERROR',
        stage: 'PERSISTENCE'
      });
      expect(loggerSpy.error).toHaveBeenCalledWith('Error persisting section', expect.any(Error));
    });
  });

  // -------------------------------------------------------------------------
  // setStudyContext() / studyContext signal
  // -------------------------------------------------------------------------

  describe('setStudyContext()', () => {
    it('should update the studyContext signal', () => {
      const study = buildMockStudy();
      service.setStudyContext(study);
      expect(service.studyContext()).toBe(study);
    });
  });
});
