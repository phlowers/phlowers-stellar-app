/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { LinesService } from './lines.service';
import { StorageService } from '@services/storage/storage.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { CsvImportClientService } from '@shared/catalog/csv-import';

describe('LinesService', () => {
  let service: LinesService;
  let storageService: StorageService;
  let csvImportClient: { importCsv: vi.Mock };
  let logger: { error: vi.Mock };
  let linesTable: { count: vi.Mock; toArray: vi.Mock };

  beforeEach(() => {
    linesTable = {
      count: vi.fn().mockResolvedValue(0),
      toArray: vi.fn().mockResolvedValue([])
    };
    const storageServiceSpy = {
      ready$: new BehaviorSubject<boolean>(false),
      db: { catLines: linesTable }
    } as unknown as StorageService;
    csvImportClient = {
      importCsv: vi.fn().mockResolvedValue({ type: 'done', csvKey: 'lines', totalRows: 0, totalKeys: 0 })
    };
    logger = { error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        LinesService,
        { provide: StorageService, useValue: storageServiceSpy },
        { provide: CsvImportClientService, useValue: csvImportClient },
        { provide: LoggerService, useValue: logger }
      ]
    });
    service = TestBed.inject(LinesService);
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

  describe('getLines / getLinesCount', () => {
    it('forwards toArray', async () => {
      linesTable.toArray.mockResolvedValue([{ uuid: 'a' }]);
      expect(await service.getLines()).toEqual([{ uuid: 'a' }]);
    });
    it('forwards count', async () => {
      linesTable.count.mockResolvedValue(42);
      expect(await service.getLinesCount()).toBe(42);
    });
    it('returns undefined for both when db is missing', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      expect(await service.getLines()).toBeUndefined();
      expect(await service.getLinesCount()).toBeUndefined();
    });
  });

  describe('importFromFile', () => {
    it('delegates to CsvImportClientService with the lines key', async () => {
      await service.importFromFile();
      expect(csvImportClient.importCsv).toHaveBeenCalledWith('lines');
    });
    it('logs and swallows errors from the client', async () => {
      csvImportClient.importCsv.mockRejectedValue(new Error('worker boom'));
      await expect(service.importFromFile()).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith('Error importing lines', expect.any(Error));
    });
    it('emits on imported$ after a successful import', async () => {
      const emissions: void[] = [];
      service.imported$.subscribe(() => emissions.push(undefined));
      await service.importFromFile();
      expect(emissions.length).toBe(1);
    });
    it('does not emit on imported$ when the import fails', async () => {
      csvImportClient.importCsv.mockRejectedValue(new Error('worker boom'));
      const emissions: void[] = [];
      service.imported$.subscribe(() => emissions.push(undefined));
      await service.importFromFile();
      expect(emissions.length).toBe(0);
    });
  });
});
