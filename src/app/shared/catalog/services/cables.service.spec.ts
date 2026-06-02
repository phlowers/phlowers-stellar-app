/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { CablesService } from './cables.service';
import { StorageService } from '@services/storage/storage.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { CsvImportClientService } from '@shared/catalog/csv-import';
import type { CatalogCableEntity } from '@infrastructure/database';

interface MockTable {
  toArray: vi.Mock;
  where: vi.Mock;
}

describe('CablesService', () => {
  let service: CablesService;
  let storageService: StorageService;
  let csvImportClient: { importCsv: vi.Mock };
  let logger: { error: vi.Mock; warn: vi.Mock; log: vi.Mock; info: vi.Mock };
  let cablesTable: MockTable;
  let firstFn: vi.Mock;

  beforeEach(() => {
    firstFn = vi.fn().mockResolvedValue(undefined);
    cablesTable = {
      toArray: vi.fn().mockResolvedValue([]),
      where: vi.fn().mockReturnValue({ equals: vi.fn().mockReturnValue({ first: firstFn }) })
    };
    const storageServiceSpy = {
      ready$: new BehaviorSubject<boolean>(false),
      db: { catCables: cablesTable }
    } as unknown as StorageService;
    csvImportClient = {
      importCsv: vi.fn().mockResolvedValue({ type: 'done', csvKey: 'cables', totalRows: 0, totalKeys: 0 })
    };
    logger = { error: vi.fn(), warn: vi.fn(), log: vi.fn(), info: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        CablesService,
        { provide: StorageService, useValue: storageServiceSpy },
        { provide: CsvImportClientService, useValue: csvImportClient },
        { provide: LoggerService, useValue: logger }
      ]
    });
    service = TestBed.inject(CablesService);
    storageService = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('constructor', () => {
    it('initializes ready as false', () => {
      expect(service.ready.value).toBe(false);
    });
    it('mirrors StorageService ready state', () => {
      (storageService.ready$ as BehaviorSubject<boolean>).next(true);
      expect(service.ready.value).toBe(true);
    });
  });

  describe('getCables', () => {
    it('returns the toArray result', async () => {
      const data: CatalogCableEntity[] = [{ name: 'C1' } as CatalogCableEntity];
      cablesTable.toArray.mockResolvedValue(data);
      expect(await service.getCables()).toEqual(data);
    });
    it('returns undefined when db is missing', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      expect(await service.getCables()).toBeUndefined();
    });
  });

  describe('getCable', () => {
    it('queries by name', async () => {
      const entity = { name: 'C1' } as CatalogCableEntity;
      firstFn.mockResolvedValue(entity);
      expect(await service.getCable('C1')).toEqual(entity);
      expect(cablesTable.where).toHaveBeenCalledWith('name');
    });
    it('returns undefined when db is missing', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      expect(await service.getCable('C1')).toBeUndefined();
    });
  });

  describe('importFromFile', () => {
    it('delegates to CsvImportClientService with the cables key', async () => {
      await service.importFromFile();
      expect(csvImportClient.importCsv).toHaveBeenCalledWith('cables');
    });
    it('logs and swallows errors from the client', async () => {
      csvImportClient.importCsv.mockRejectedValue(new Error('worker boom'));
      await expect(service.importFromFile()).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith('Error importing cables', expect.any(Error));
    });
  });
});
