/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AttachmentService } from './attachment.service';
import { StorageService } from '@services/storage/storage.service';
import { CatalogSupportAttachmentEntity } from '@infrastructure/database';
import { SupportNameEntry } from './attachment.interfaces';
import { CsvImportClientService } from '@shared/catalog/csv-import';
import { LoggerService } from '@core/services/logger/logger.service';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123')
}));

interface MockSupportTable {
  get: vi.Mock;
  bulkGet: vi.Mock;
  bulkAdd: vi.Mock;
  orderBy: vi.Mock;
}

interface MockDb {
  catSupportAttachments: MockSupportTable;
}

describe('AttachmentService', () => {
  let service: AttachmentService;
  let storageService: StorageService;
  let csvImportClient: { importCsv: vi.Mock };
  let mockDb: MockDb;
  let mockTable: MockSupportTable;
  let logger: { error: vi.Mock; warn: vi.Mock; info: vi.Mock; debug: vi.Mock };

  beforeEach(() => {
    globalThis.localStorage.removeItem('catalog:distinct_support_names');

    mockTable = {
      get: vi.fn().mockResolvedValue(undefined),
      bulkGet: vi.fn().mockResolvedValue([]),
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      orderBy: vi.fn().mockReturnValue({ primaryKeys: vi.fn().mockResolvedValue([]) })
    };

    mockDb = { catSupportAttachments: mockTable };

    const storageServiceSpy = {
      ready$: new BehaviorSubject<boolean>(false),
      db: mockDb
    } as unknown as StorageService;

    csvImportClient = {
      importCsv: vi.fn().mockResolvedValue({ type: 'done', csvKey: 'attachments', totalRows: 0, totalKeys: 0 })
    };

    logger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AttachmentService,
        { provide: StorageService, useValue: storageServiceSpy },
        { provide: CsvImportClientService, useValue: csvImportClient },
        { provide: LoggerService, useValue: logger }
      ]
    });

    service = TestBed.inject(AttachmentService);
    storageService = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('constructor', () => {
    it('should initialize ready state as false', () => {
      expect(service.ready.value).toBe(false);
    });

    it('should mirror StorageService ready state', () => {
      (storageService.ready$ as BehaviorSubject<boolean>).next(true);
      expect(service.ready.value).toBe(true);
    });
  });

  describe('getDistinctSupportNames', () => {
    it('returns sorted primary keys filtered to non-empty strings', async () => {
      mockTable.orderBy.mockReturnValue({
        primaryKeys: vi.fn().mockResolvedValue(['B', '', 1, null, 'A'])
      });
      const result = await service.getDistinctSupportNames();
      expect(mockTable.orderBy).toHaveBeenCalledWith('support_name');
      expect(result).toEqual(['B', 'A']);
    });

    it('returns empty array when db is unavailable', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      expect(await service.getDistinctSupportNames()).toEqual([]);
    });
  });

  describe('getAttachmentsBySupportName', () => {
    it('returns flat entities preserving the stored attachment order', async () => {
      const group: CatalogSupportAttachmentEntity = {
        uuid: 'grp-uuid',
        created_at: 'c',
        updated_at: 'u',
        support_name: 'S1',
        support_tower: 'T1',
        attachments: [
          { attachment_set: 1, attachment_altitude: 10, cross_arm_length: 2 },
          { attachment_set: 2, attachment_altitude: 12, cross_arm_length: 3 }
        ]
      };
      mockTable.get.mockResolvedValue(group);

      const result = await service.getAttachmentsBySupportName('S1');

      expect(mockTable.get).toHaveBeenCalledWith('S1');
      expect(result.map((a) => a.attachment_set)).toEqual([1, 2]);
      expect(result[0]).toMatchObject({
        uuid: 'mock-uuid-123',
        support_name: 'S1',
        support_tower: 'T1',
        attachment_set: 1,
        attachment_altitude: 10,
        cross_arm_length: 2
      });
    });

    it('returns empty array when support is missing', async () => {
      mockTable.get.mockResolvedValue(undefined);
      expect(await service.getAttachmentsBySupportName('Unknown')).toEqual([]);
    });

    it('returns empty array when db is unavailable', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      expect(await service.getAttachmentsBySupportName('S1')).toEqual([]);
    });
  });

  describe('getAttachmentDetails', () => {
    it('returns the legacy entity for the matching attachment_set', async () => {
      mockTable.get.mockResolvedValue({
        uuid: 'g',
        created_at: 'c',
        updated_at: 'u',
        support_name: 'S1',
        support_tower: 'T',
        attachments: [
          { attachment_set: 1, attachment_altitude: 5 },
          { attachment_set: 2, attachment_altitude: 7 }
        ]
      });
      const result = await service.getAttachmentDetails('S1', 2);
      expect(result?.attachment_altitude).toBe(7);
      expect(result?.support_tower).toBe('T');
    });

    it('returns undefined when no attachment matches', async () => {
      mockTable.get.mockResolvedValue({
        uuid: 'g',
        created_at: 'c',
        updated_at: 'u',
        support_name: 'S1',
        support_tower: 'T',
        attachments: [{ attachment_set: 1 }]
      });
      expect(await service.getAttachmentDetails('S1', 99)).toBeUndefined();
    });

    it('returns undefined when the support is missing', async () => {
      mockTable.get.mockResolvedValue(undefined);
      expect(await service.getAttachmentDetails('S1', 1)).toBeUndefined();
    });
  });

  describe('addSupportNamesIfAbsent', () => {
    it('does nothing when entries are empty', async () => {
      await service.addSupportNamesIfAbsent([]);
      expect(mockTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('does nothing when db is unavailable', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      await service.addSupportNamesIfAbsent([{ supportName: 'A', supportTower: 'T' }]);
      expect(mockTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('ignores entries with empty supportName', async () => {
      const entries: SupportNameEntry[] = [
        { supportName: '', supportTower: 'T' },
        { supportName: '', supportTower: null }
      ];
      await service.addSupportNamesIfAbsent(entries);
      expect(mockTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('deduplicates input and adds only missing supports', async () => {
      mockTable.bulkGet.mockResolvedValue([{ support_name: 'A' }, undefined, undefined]);
      const entries: SupportNameEntry[] = [
        { supportName: 'A', supportTower: 'TA' },
        { supportName: 'B', supportTower: 'TB' },
        { supportName: 'C', supportTower: null },
        { supportName: 'B', supportTower: 'TB' }
      ];

      await service.addSupportNamesIfAbsent(entries);

      expect(mockTable.bulkGet).toHaveBeenCalledWith(['A', 'B', 'C']);
      expect(mockTable.bulkAdd).toHaveBeenCalledTimes(1);
      const added = mockTable.bulkAdd.mock.calls[0][0] as CatalogSupportAttachmentEntity[];
      expect(added.map((e) => e.support_name)).toEqual(['B', 'C']);
      expect(added[0].attachments).toEqual([]);
      expect(added[1].support_tower).toBe('');
    });

    it('does not call bulkAdd when every entry already exists', async () => {
      mockTable.bulkGet.mockResolvedValue([{ support_name: 'A' }]);
      await service.addSupportNamesIfAbsent([{ supportName: 'A', supportTower: 'T' }]);
      expect(mockTable.bulkAdd).not.toHaveBeenCalled();
    });
  });

  describe('importFromFile', () => {
    it('delegates to CsvImportClientService with the attachments key and refreshes', async () => {
      const namesSpy = vi.spyOn(service, 'getDistinctSupportNames').mockResolvedValue(['A']);
      (storageService.ready$ as BehaviorSubject<boolean>).next(true);
      const observed: string[][] = [];
      const sub = service.distinctSupportNames$.subscribe((v) => observed.push(v));

      await service.importFromFile();

      expect(csvImportClient.importCsv).toHaveBeenCalledWith('attachments');
      expect(namesSpy).toHaveBeenCalled();
      sub.unsubscribe();
    });

    it('logs and swallows when the client throws', async () => {
      csvImportClient.importCsv.mockRejectedValue(new Error('boom'));
      await expect(service.importFromFile()).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith('Error importing attachments', expect.any(Error));
    });
  });

  describe('distinctSupportNames$ cache', () => {
    it('emits cached names immediately', async () => {
      globalThis.localStorage.setItem('catalog:distinct_support_names', JSON.stringify(['Cached']));
      TestBed.resetTestingModule();
      const spy = {
        ready$: new BehaviorSubject<boolean>(false),
        db: mockDb
      } as unknown as StorageService;
      TestBed.configureTestingModule({
        providers: [
          AttachmentService,
          { provide: StorageService, useValue: spy },
          { provide: CsvImportClientService, useValue: csvImportClient }
        ]
      });
      const fresh = TestBed.inject(AttachmentService);
      const emitted: string[][] = [];
      const sub = fresh.distinctSupportNames$.subscribe((v) => emitted.push(v));
      expect(emitted[0]).toEqual(['Cached']);
      sub.unsubscribe();
    });

    it('ignores invalid cache payloads', async () => {
      globalThis.localStorage.setItem('catalog:distinct_support_names', '{not json');
      const result = (service as unknown as { getCachedSupportNames(): string[] }).getCachedSupportNames();
      expect(result).toEqual([]);
    });

    it('ignores non-array cache payloads', async () => {
      globalThis.localStorage.setItem('catalog:distinct_support_names', JSON.stringify({ foo: 'bar' }));
      const result = (service as unknown as { getCachedSupportNames(): string[] }).getCachedSupportNames();
      expect(result).toEqual([]);
    });
  });
});
