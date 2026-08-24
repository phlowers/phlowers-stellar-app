/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { MaintenanceService } from './maintenance.service';
import { StorageService } from '@services/storage/storage.service';
import { CsvImportClientService } from '@shared/catalog/csv-import';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let storageService: StorageService;
  let csvImportClient: { importCsv: vi.Mock };
  let table: { toArray: vi.Mock };

  beforeEach(() => {
    table = { toArray: vi.fn().mockResolvedValue([]) };
    const storageServiceSpy = {
      ready$: new BehaviorSubject<boolean>(false),
      db: { catMaintenance: table }
    } as unknown as StorageService;
    csvImportClient = {
      importCsv: vi.fn().mockResolvedValue({ type: 'done', csvKey: 'maintenance', totalRows: 0, totalKeys: 0 })
    };
    TestBed.configureTestingModule({
      providers: [
        MaintenanceService,
        { provide: StorageService, useValue: storageServiceSpy },
        { provide: CsvImportClientService, useValue: csvImportClient }
      ]
    });
    service = TestBed.inject(MaintenanceService);
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

  describe('getMaintenance', () => {
    it('forwards toArray', async () => {
      table.toArray.mockResolvedValue([{ maintenance_team_id: 'T1' }]);
      expect(await service.getMaintenance()).toEqual([{ maintenance_team_id: 'T1' }]);
    });
    it('returns undefined when db is missing', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      expect(await service.getMaintenance()).toBeUndefined();
    });
  });

  describe('importFromFile', () => {
    it('delegates to CsvImportClientService with the maintenance key', async () => {
      await service.importFromFile();
      expect(csvImportClient.importCsv).toHaveBeenCalledWith('maintenance', { expectedHash: undefined });
    });
    it('propagates errors from the client instead of swallowing them', async () => {
      csvImportClient.importCsv.mockRejectedValue(new Error('worker boom'));
      await expect(service.importFromFile()).rejects.toThrow('worker boom');
    });
  });
});
