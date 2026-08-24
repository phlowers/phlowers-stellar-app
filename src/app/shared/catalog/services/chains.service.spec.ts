/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ChainsService } from './chains.service';
import { StorageService } from '@services/storage/storage.service';
import { CsvImportClientService } from '@shared/catalog/csv-import';

describe('ChainsService', () => {
  let service: ChainsService;
  let storageService: StorageService;
  let csvImportClient: { importCsv: vi.Mock };
  let chainsTable: { toArray: vi.Mock };

  beforeEach(() => {
    chainsTable = { toArray: vi.fn().mockResolvedValue([]) };
    const storageServiceSpy = {
      ready$: new BehaviorSubject<boolean>(false),
      db: { catChains: chainsTable }
    } as unknown as StorageService;
    csvImportClient = {
      importCsv: vi.fn().mockResolvedValue({ type: 'done', csvKey: 'chains', totalRows: 0, totalKeys: 0 })
    };
    TestBed.configureTestingModule({
      providers: [
        ChainsService,
        { provide: StorageService, useValue: storageServiceSpy },
        { provide: CsvImportClientService, useValue: csvImportClient }
      ]
    });
    service = TestBed.inject(ChainsService);
    storageService = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('mirrors StorageService ready state', () => {
    expect(service.ready.value).toBe(false);
    (storageService.ready$ as BehaviorSubject<boolean>).next(true);
    expect(service.ready.value).toBe(true);
  });

  describe('getChains', () => {
    it('returns toArray result', async () => {
      chainsTable.toArray.mockResolvedValue([{ chain_name: 'X' }]);
      expect(await service.getChains()).toEqual([{ chain_name: 'X' }]);
    });
    it('returns undefined when db is missing', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      expect(await service.getChains()).toBeUndefined();
    });
  });

  describe('importFromFile', () => {
    it('delegates to CsvImportClientService with the chains key', async () => {
      await service.importFromFile();
      expect(csvImportClient.importCsv).toHaveBeenCalledWith('chains', { expectedHash: undefined });
    });
    it('forwards expectedHash to CsvImportClientService', async () => {
      await service.importFromFile('abc123');
      expect(csvImportClient.importCsv).toHaveBeenCalledWith('chains', { expectedHash: 'abc123' });
    });
    it('propagates errors from the client instead of swallowing them', async () => {
      csvImportClient.importCsv.mockRejectedValue(new Error('worker boom'));
      await expect(service.importFromFile()).rejects.toThrow('worker boom');
    });
  });
});
