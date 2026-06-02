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
import { AttachmentImportWorkerResponse } from './attachment-import.worker.interfaces';

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

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((ev: MessageEvent<AttachmentImportWorkerResponse>) => void) | null = null;
  onerror: ((ev: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor(
    public url: URL,
    public options: WorkerOptions
  ) {
    FakeWorker.instances.push(this);
  }
  emit(msg: AttachmentImportWorkerResponse): void {
    this.onmessage?.(new MessageEvent('message', { data: msg }));
  }
}

describe('AttachmentService', () => {
  let service: AttachmentService;
  let storageService: StorageService;
  let mockDb: MockDb;
  let mockTable: MockSupportTable;
  let originalWorker: typeof Worker;

  beforeEach(() => {
    globalThis.localStorage.removeItem('catalog:distinct_support_names');
    FakeWorker.instances = [];
    originalWorker = globalThis.Worker;
    (globalThis as unknown as { Worker: typeof Worker }).Worker = FakeWorker as unknown as typeof Worker;

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

    TestBed.configureTestingModule({
      providers: [AttachmentService, { provide: StorageService, useValue: storageServiceSpy }]
    });

    service = TestBed.inject(AttachmentService);
    storageService = TestBed.inject(StorageService);
  });

  afterEach(() => {
    (globalThis as unknown as { Worker: typeof Worker }).Worker = originalWorker;
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
    it('returns flat entities sorted by attachment_set', async () => {
      const group: CatalogSupportAttachmentEntity = {
        uuid: 'grp-uuid',
        created_at: 'c',
        updated_at: 'u',
        support_name: 'S1',
        support_tower: 'T1',
        attachments: [
          { attachment_set: 2, attachment_altitude: 12, cross_arm_length: 3 },
          { attachment_set: 1, attachment_altitude: 10, cross_arm_length: 2 }
        ]
      };
      mockTable.get.mockResolvedValue(group);

      const result = await service.getAttachmentsBySupportName('S1');

      expect(mockTable.get).toHaveBeenCalledWith('S1');
      expect(result.map((a) => a.attachment_set)).toEqual([1, 2]);
      expect(result[0]).toMatchObject({
        uuid: 'grp-uuid',
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
    it('spawns a worker, posts the CSV URL request, resolves on done and refreshes', async () => {
      const namesSpy = vi.spyOn(service, 'getDistinctSupportNames').mockResolvedValue(['A']);
      (storageService.ready$ as BehaviorSubject<boolean>).next(true);
      // Subscribe to ensure refresh propagates
      const observed: string[][] = [];
      const sub = service.distinctSupportNames$.subscribe((v) => observed.push(v));

      const promise = service.importFromFile();
      const worker = FakeWorker.instances[0];
      expect(worker.options).toEqual({ type: 'module' });
      expect(worker.postMessage).toHaveBeenCalledWith({
        url: `${globalThis.location.origin}/data/attachments.csv`
      });

      worker.emit({ type: 'progress', processedRows: 100 });
      worker.emit({ type: 'done', totalRows: 100, totalSupports: 2 });
      await promise;

      expect(worker.terminate).toHaveBeenCalled();
      expect(namesSpy).toHaveBeenCalled();
      sub.unsubscribe();
    });

    it('rejects when the worker emits an error message', async () => {
      const promise = service.importFromFile();
      const worker = FakeWorker.instances[0];
      worker.emit({ type: 'error', message: 'boom' });
      await expect(promise).rejects.toThrow('boom');
      expect(worker.terminate).toHaveBeenCalled();
    });

    it('rejects when the worker crashes', async () => {
      const promise = service.importFromFile();
      const worker = FakeWorker.instances[0];
      worker.onerror?.(new ErrorEvent('error', { message: 'crashed' }));
      await expect(promise).rejects.toThrow('crashed');
      expect(worker.terminate).toHaveBeenCalled();
    });
  });

  describe('distinctSupportNames$ cache', () => {
    it('emits cached names immediately', async () => {
      globalThis.localStorage.setItem('catalog:distinct_support_names', JSON.stringify(['Cached']));
      // Re-create the service to read the fresh cache
      TestBed.resetTestingModule();
      const spy = {
        ready$: new BehaviorSubject<boolean>(false),
        db: mockDb
      } as unknown as StorageService;
      TestBed.configureTestingModule({
        providers: [AttachmentService, { provide: StorageService, useValue: spy }]
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
