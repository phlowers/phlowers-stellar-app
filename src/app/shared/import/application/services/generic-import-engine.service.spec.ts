/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GenericImportEngineService } from './generic-import-engine.service';
import { IMPORT_ADAPTER_TOKEN, ImportAdapter, UUIDCollisionResolver } from '@shared/import/domain/import-contracts';
import { LoggerService } from '@core/services/logger/logger.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeFile = (name: string, content = 'data', type = 'application/json'): File =>
  new File([content], name, { type });

const neverResolve: UUIDCollisionResolver = () => Promise.resolve(false);
const alwaysAccept: UUIDCollisionResolver = () => Promise.resolve(true);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GenericImportEngineService', () => {
  let service: GenericImportEngineService;
  let adapter: vi.Mocked<ImportAdapter>;
  let loggerSpy: vi.Mocked<LoggerService>;

  beforeEach(() => {
    adapter = {
      accepts: vi.fn().mockReturnValue(true),
      checkCollision: vi.fn().mockResolvedValue(null),
      processFile: vi.fn().mockResolvedValue({ uuid: 'uuid-1', title: 'My Entity' })
    };

    loggerSpy = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    } as unknown as vi.Mocked<LoggerService>;

    TestBed.configureTestingModule({
      providers: [
        GenericImportEngineService,
        { provide: IMPORT_ADAPTER_TOKEN, useValue: adapter },
        { provide: LoggerService, useValue: loggerSpy }
      ]
    });
    service = TestBed.inject(GenericImportEngineService);
  });

  // -------------------------------------------------------------------------
  // FILE_VALIDATION stage
  // -------------------------------------------------------------------------

  describe('FILE_VALIDATION stage', () => {
    it('should return error outcome when adapter rejects the file type', async () => {
      adapter.accepts.mockReturnValue(false);
      const file = makeFile('bad.txt', 'data', 'text/plain');

      const outcomes = await service.processFiles([file], neverResolve);

      expect(outcomes).toHaveLength(1);
      expect(outcomes[0].status).toBe('error');
      expect(outcomes[0].error?.code).toBe('FILE_TYPE_NOT_ALLOWED');
      expect(outcomes[0].error?.stage).toBe('FILE_VALIDATION');
      expect(outcomes[0].fileName).toBe('bad.txt');
      expect(adapter.processFile).not.toHaveBeenCalled();
    });

    it('should proceed when adapter accepts the file', async () => {
      const file = makeFile('good.json');
      const outcomes = await service.processFiles([file], neverResolve);
      expect(outcomes[0].status).toBe('success');
    });
  });

  // -------------------------------------------------------------------------
  // COLLISION_CHECK stage
  // -------------------------------------------------------------------------

  describe('COLLISION_CHECK stage', () => {
    it('should return skipped outcome when collision detected and user rejects', async () => {
      adapter.checkCollision.mockResolvedValue({ uuid: 'col-uuid', label: 'Existing Entity' });
      const resolver = vi.fn<UUIDCollisionResolver>().mockResolvedValue(false);
      const file = makeFile('entity.json');

      const outcomes = await service.processFiles([file], resolver);

      expect(resolver).toHaveBeenCalledWith('col-uuid', 'Existing Entity');
      expect(outcomes[0].status).toBe('skipped');
      expect(adapter.processFile).not.toHaveBeenCalled();
    });

    it('should proceed with pre-approved resolver when collision accepted', async () => {
      adapter.checkCollision.mockResolvedValue({ uuid: 'col-uuid', label: 'Existing Entity' });
      const resolver = vi.fn<UUIDCollisionResolver>().mockResolvedValue(true);
      const file = makeFile('entity.json');

      const outcomes = await service.processFiles([file], resolver);

      expect(outcomes[0].status).toBe('success');
      // processFile is called; the effective resolver passed should auto-approve
      const effectiveResolver = adapter.processFile.mock.calls[0][1] as UUIDCollisionResolver;
      expect(await effectiveResolver('x', 'y')).toBe(true);
    });

    it('should forward original resolver when no collision at check time', async () => {
      adapter.checkCollision.mockResolvedValue(null);
      const file = makeFile('entity.json');
      const resolver = vi.fn<UUIDCollisionResolver>().mockResolvedValue(true);

      await service.processFiles([file], resolver);

      const passedResolver = adapter.processFile.mock.calls[0][1] as UUIDCollisionResolver;
      await passedResolver('x', 'y');
      expect(resolver).toHaveBeenCalledWith('x', 'y');
    });
  });

  // -------------------------------------------------------------------------
  // processFile result handling
  // -------------------------------------------------------------------------

  describe('processFile result handling', () => {
    it('should return skipped outcome when processFile returns null', async () => {
      adapter.processFile.mockResolvedValue(null);
      const file = makeFile('entity.json');

      const outcomes = await service.processFiles([file], neverResolve);

      expect(outcomes[0].status).toBe('skipped');
    });

    it('should extract entityId and entityLabel from returned entity (title field)', async () => {
      adapter.processFile.mockResolvedValue({ uuid: 'e-uuid', title: 'My Study' });
      const outcomes = await service.processFiles([makeFile('study.clst')], neverResolve);

      expect(outcomes[0].status).toBe('success');
      expect(outcomes[0].entityId).toBe('e-uuid');
      expect(outcomes[0].entityLabel).toBe('My Study');
    });

    it('should extract entityLabel from name field when title is absent', async () => {
      adapter.processFile.mockResolvedValue({ uuid: 'e-uuid', name: 'My Section' });
      const outcomes = await service.processFiles([makeFile('section.json')], neverResolve);

      expect(outcomes[0].status).toBe('success');
      expect(outcomes[0].entityLabel).toBe('My Section');
    });

    it('should not set entityId or entityLabel when entity has neither uuid/title/name', async () => {
      adapter.processFile.mockResolvedValue({ other: 'value' });
      const outcomes = await service.processFiles([makeFile('other.json')], neverResolve);

      expect(outcomes[0].status).toBe('success');
      expect(outcomes[0].entityId).toBeUndefined();
      expect(outcomes[0].entityLabel).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('should return error outcome with ImportError when processFile throws an ImportError-shaped object', async () => {
      const importError = { code: 'FILE_PARSE_ERROR', message: 'bad json', stage: 'PARSING' };
      adapter.processFile.mockRejectedValue(importError);
      const file = makeFile('bad.json');

      const outcomes = await service.processFiles([file], neverResolve);

      expect(outcomes[0].status).toBe('error');
      expect(outcomes[0].error?.code).toBe('FILE_PARSE_ERROR');
      expect(outcomes[0].error?.stage).toBe('PARSING');
    });

    it('should wrap a plain Error into an ImportError at PERSISTENCE stage', async () => {
      adapter.processFile.mockRejectedValue(new Error('db failed'));
      const file = makeFile('entity.json');

      const outcomes = await service.processFiles([file], neverResolve);

      expect(outcomes[0].status).toBe('error');
      expect(outcomes[0].error?.code).toBe('db failed');
      expect(outcomes[0].error?.stage).toBe('PERSISTENCE');
    });

    it('should wrap a non-Error thrown value into PERSISTENCE_ERROR', async () => {
      adapter.processFile.mockRejectedValue('something weird');
      const file = makeFile('entity.json');

      const outcomes = await service.processFiles([file], neverResolve);

      expect(outcomes[0].status).toBe('error');
      expect(outcomes[0].error?.code).toBe('PERSISTENCE_ERROR');
    });

    it('should log the error with the file name', async () => {
      adapter.processFile.mockRejectedValue(new Error('boom'));
      await service.processFiles([makeFile('crash.json')], neverResolve);

      expect(loggerSpy.warn).toHaveBeenCalledWith('Import pipeline error for file', 'crash.json', expect.any(Error));
    });
  });

  // -------------------------------------------------------------------------
  // Sequential processing
  // -------------------------------------------------------------------------

  describe('sequential file processing', () => {
    it('should process multiple files and return one outcome per file', async () => {
      adapter.processFile
        .mockResolvedValueOnce({ uuid: 'u1', title: 'A' })
        .mockResolvedValueOnce({ uuid: 'u2', title: 'B' });

      const outcomes = await service.processFiles([makeFile('a.json'), makeFile('b.json')], alwaysAccept);

      expect(outcomes).toHaveLength(2);
      expect(outcomes[0].entityId).toBe('u1');
      expect(outcomes[1].entityId).toBe('u2');
    });

    it('should continue processing remaining files even if one fails', async () => {
      adapter.processFile
        .mockRejectedValueOnce(new Error('first failed'))
        .mockResolvedValueOnce({ uuid: 'u2', title: 'B' });

      const outcomes = await service.processFiles([makeFile('fail.json'), makeFile('ok.json')], neverResolve);

      expect(outcomes[0].status).toBe('error');
      expect(outcomes[1].status).toBe('success');
    });

    it('should return outcomes in the same order as the input files', async () => {
      adapter.processFile
        .mockResolvedValueOnce({ uuid: 'u1' })
        .mockResolvedValueOnce({ uuid: 'u2' })
        .mockResolvedValueOnce({ uuid: 'u3' });

      const files = [makeFile('1.json'), makeFile('2.json'), makeFile('3.json')];
      const outcomes = await service.processFiles(files, neverResolve);

      expect(outcomes.map((o) => o.fileName)).toEqual(['1.json', '2.json', '3.json']);
    });
  });
});
