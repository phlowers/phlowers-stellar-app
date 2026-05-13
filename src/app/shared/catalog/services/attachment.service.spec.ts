/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';

import { BehaviorSubject, firstValueFrom, skip } from 'rxjs';
import { AttachmentService } from './attachment.service';
import { StorageService } from '@services/storage/storage.service';
import { CatalogAttachmentEntity } from '@infrastructure/database';
import { SupportNameEntry } from './attachment.interfaces';
import { AttachmentCsvDto } from '@infrastructure/dto';
import Papa from 'papaparse';

// Mock Papa Parse
vi.mock('papaparse', () => ({
  __esModule: true,
  default: {
    parse: vi.fn()
  },
  parse: vi.fn()
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123')
}));

interface MockTable {
  count: vi.Mock;
  toArray: vi.Mock;
  bulkAdd: vi.Mock;
  clear?: vi.Mock;
  orderBy: vi.Mock;
}

interface MockDb {
  catLines: MockTable;
  catAttachments: MockTable;
}

describe('AttachmentService', () => {
  let service: AttachmentService;
  let storageService: StorageService;
  let mockDb: MockDb;
  let mockAttachmentsTable: MockTable;
  let mockOrderByMock: { uniqueKeys: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // Create mock database tables
    mockOrderByMock = { uniqueKeys: vi.fn().mockResolvedValue([]) };
    mockAttachmentsTable = {
      count: vi.fn().mockResolvedValue(3),
      toArray: vi.fn().mockResolvedValue([]),
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      orderBy: vi.fn().mockReturnValue(mockOrderByMock)
    };

    mockDb = {
      catLines: {
        count: vi.fn().mockResolvedValue(0),
        toArray: vi.fn().mockResolvedValue([]),
        bulkAdd: vi.fn().mockResolvedValue(undefined)
      },
      catAttachments: mockAttachmentsTable
    };

    // Create spy for StorageService
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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('constructor', () => {
    it('should initialize ready state as false', () => {
      expect(service.ready.value).toBe(false);
    });

    it('should subscribe to storage service ready state', () => {
      const readySubject = storageService.ready$ as BehaviorSubject<boolean>;
      readySubject.next(true);
      expect(service.ready.value).toBe(true);
    });
  });

  describe('getAttachments', () => {
    it('should return attachments array from database', async () => {
      const mockAttachments: CatalogAttachmentEntity[] = [
        {
          uuid: 'uuid-1',
          updated_at: '2025-01-01T00:00:00.000Z',
          created_at: '2025-01-01T00:00:00.000Z',
          support_name: 'Support 1',
          attachment_set: 1,
          support_order: 1,
          attachment_altitude: 10.5,
          cross_arm_length: 2.0,
          support_tower: 'tower'
        },
        {
          uuid: 'uuid-2',
          updated_at: '2025-01-01T00:00:00.000Z',
          created_at: '2025-01-01T00:00:00.000Z',
          support_name: 'Support 2',
          attachment_set: 2,
          support_order: 2,
          attachment_altitude: 11.0,
          cross_arm_length: 2.5,
          support_tower: 'tower'
        }
      ];
      mockAttachmentsTable.toArray.mockResolvedValue(mockAttachments);

      const result = await service.getAttachments();
      expect(mockAttachmentsTable.toArray).toHaveBeenCalled();
      expect(result).toEqual(mockAttachments);
    });

    it('should return undefined if database is not available', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      const result = await service.getAttachments();
      expect(result).toBeUndefined();
    });
  });

  describe('importFromFile', () => {
    it('should import attachments from CSV file successfully', async () => {
      const mockCsvData: AttachmentCsvDto[] = [
        {
          support_id_catalog: 'catalog1',
          support_idr: 'idr1',
          support_adr: 'Support 1',
          support_tower: 'tower1',
          support_family: 'Family 1',
          position: '1',
          X: '0',
          Y: '0',
          Z: '10.5',
          L: '2.0'
        },
        {
          support_id_catalog: 'catalog2',
          support_idr: 'idr2',
          support_adr: 'Support 2',
          support_tower: 'tower2',
          support_family: 'Family 2',
          position: '2',
          X: '0',
          Y: '0',
          Z: '11.0',
          L: '2.5'
        }
      ];

      // Mock Papa Parse to call complete callback
      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<AttachmentCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: mockCsvData,
              errors: [],
              meta: {
                delimiter: ',',
                linebreak: '\n',
                aborted: false,
                truncated: false,
                cursor: 0,
                fields: []
              }
            },
            undefined
          );
        }
      });

      await service.importFromFile();

      expect(mockAttachmentsTable.clear).toHaveBeenCalled();
      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalledWith([
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'idr1',
          support_tower: 'tower1',
          attachment_set: 1,
          attachment_altitude: 10.5,
          cross_arm_length: 2.0,
          attachment_set_x: 0,
          attachment_set_y: 0,
          attachment_set_z: 10.5
        },
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'idr2',
          support_tower: 'tower2',
          attachment_set: 2,
          attachment_altitude: 11.0,
          cross_arm_length: 2.5,
          attachment_set_x: 0,
          attachment_set_y: 0,
          attachment_set_z: 11.0
        }
      ]);
    });

    it('should handle empty CSV data', async () => {
      // Mock Papa Parse to call complete callback with empty data
      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<AttachmentCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: [],
              errors: [],
              meta: {
                delimiter: ',',
                linebreak: '\n',
                aborted: false,
                truncated: false,
                cursor: 0,
                fields: []
              }
            },
            undefined
          );
        }
      });

      await service.importFromFile();

      expect(mockAttachmentsTable.clear).not.toHaveBeenCalled();
      expect(mockAttachmentsTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should filter out attachments with missing support_idr and support_adr', async () => {
      const mockCsvData: AttachmentCsvDto[] = [
        {
          support_id_catalog: 'cat1',
          support_idr: 'idr1',
          support_adr: 'Support 1',
          support_tower: 'tower1',
          support_family: 'Family 1',
          position: '1',
          X: '0',
          Y: '0',
          Z: '10.5',
          L: '2.0'
        },
        {
          support_id_catalog: 'cat2',
          support_idr: '',
          support_adr: '',
          support_tower: 'tower2',
          support_family: 'Family 2',
          position: '2',
          X: '0',
          Y: '0',
          Z: '11.0',
          L: '2.5'
        },
        {
          support_id_catalog: 'cat3',
          support_idr: 'idr3',
          support_adr: 'Support 3',
          support_tower: 'tower3',
          support_family: 'Family 3',
          position: '3',
          X: '0',
          Y: '0',
          Z: '12.0',
          L: '3.0'
        }
      ];

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<AttachmentCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: mockCsvData,
              errors: [],
              meta: {
                delimiter: ',',
                linebreak: '\n',
                aborted: false,
                truncated: false,
                cursor: 0,
                fields: []
              }
            },
            undefined
          );
        }
      });

      await service.importFromFile();

      // Should only add attachments with valid support_idr or support_adr
      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalledWith([
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'idr1',
          support_tower: 'tower1',
          attachment_set: 1,
          attachment_altitude: 10.5,
          cross_arm_length: 2.0,
          attachment_set_x: 0,
          attachment_set_y: 0,
          attachment_set_z: 10.5
        },
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'idr3',
          support_tower: 'tower3',
          attachment_set: 3,
          attachment_altitude: 12.0,
          cross_arm_length: 3.0,
          attachment_set_x: 0,
          attachment_set_y: 0,
          attachment_set_z: 12.0
        }
      ]);
    });

    it('should handle missing database gracefully', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const mockCsvData: AttachmentCsvDto[] = [
        {
          support_id_catalog: 'cat1',
          support_idr: 'idr1',
          support_adr: 'Support 1',
          support_tower: 'tower1',
          support_family: 'Family 1',
          position: '1',
          X: '0',
          Y: '0',
          Z: '10.5',
          L: '2.0'
        }
      ];

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<AttachmentCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: mockCsvData,
              errors: [],
              meta: {
                delimiter: ',',
                linebreak: '\n',
                aborted: false,
                truncated: false,
                cursor: 0,
                fields: []
              }
            },
            undefined
          );
        }
      });

      // Should not throw error
      await expect(service.importFromFile()).resolves.toBeUndefined();
    });

    it('should handle CSV data with mixed valid, fallback and invalid support_idr values', async () => {
      const mockCsvData: AttachmentCsvDto[] = [
        {
          support_id_catalog: 'cat1',
          support_idr: 'idr1',
          support_adr: 'Support 1',
          support_tower: 'tower1',
          support_family: 'Family 1',
          position: '1',
          X: '0',
          Y: '0',
          Z: '10.5',
          L: '2.0'
        },
        {
          support_id_catalog: 'cat2',
          support_idr: '',
          support_adr: '',
          support_tower: 'tower2',
          support_family: 'Family 2',
          position: '2',
          X: '0',
          Y: '0',
          Z: '11.0',
          L: '2.5'
        },
        {
          support_id_catalog: 'cat3',
          support_idr: 'idr3',
          support_adr: 'Support 3',
          support_tower: 'tower3',
          support_family: 'Family 3',
          position: '3',
          X: '0',
          Y: '0',
          Z: '12.0',
          L: '3.0'
        },
        {
          support_id_catalog: 'cat4',
          support_idr: '',
          support_adr: 'Support 4',
          support_tower: 'tower4',
          support_family: 'Family 4',
          position: '4',
          X: '0',
          Y: '0',
          Z: '13.0',
          L: '3.5'
        }
      ];

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<AttachmentCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: mockCsvData,
              errors: [],
              meta: {
                delimiter: ',',
                linebreak: '\n',
                aborted: false,
                truncated: false,
                cursor: 0,
                fields: []
              }
            },
            undefined
          );
        }
      });

      await service.importFromFile();

      // Should only add attachments with valid support_idr or support_adr
      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalledWith([
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'idr1',
          support_tower: 'tower1',
          attachment_set: 1,
          attachment_altitude: 10.5,
          cross_arm_length: 2.0,
          attachment_set_x: 0,
          attachment_set_y: 0,
          attachment_set_z: 10.5
        },
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'idr3',
          support_tower: 'tower3',
          attachment_set: 3,
          attachment_altitude: 12.0,
          cross_arm_length: 3.0,
          attachment_set_x: 0,
          attachment_set_y: 0,
          attachment_set_z: 12.0
        },
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'Support 4',
          support_tower: 'tower4',
          attachment_set: 4,
          attachment_altitude: 13.0,
          cross_arm_length: 3.5,
          attachment_set_x: 0,
          attachment_set_y: 0,
          attachment_set_z: 13.0
        }
      ]);
    });

    it('should clear attachments table before adding new data', async () => {
      const mockCsvData: AttachmentCsvDto[] = [
        {
          support_id_catalog: 'cat1',
          support_idr: 'idr1',
          support_adr: 'Support 1',
          support_tower: 'tower1',
          support_family: 'Family 1',
          position: '1',
          X: '0',
          Y: '0',
          Z: '10.5',
          L: '2.0'
        }
      ];

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<AttachmentCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: mockCsvData,
              errors: [],
              meta: {
                delimiter: ',',
                linebreak: '\n',
                aborted: false,
                truncated: false,
                cursor: 0,
                fields: []
              }
            },
            undefined
          );
        }
      });

      await service.importFromFile();

      // Verify clear is called before bulkAdd
      expect(mockAttachmentsTable.clear).toHaveBeenCalled();
      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalled();
    });

    it('should handle HTTP errors gracefully', async () => {
      // Mock Papa Parse to call complete callback with empty data when HTTP error occurs
      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<AttachmentCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: [],
              errors: [],
              meta: {
                delimiter: ',',
                linebreak: '\n',
                aborted: false,
                truncated: false,
                cursor: 0,
                fields: []
              }
            },
            undefined
          );
        }
      });

      await service.importFromFile();

      // Should not throw error and not call bulkAdd (but clear may be called)
      expect(mockAttachmentsTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should parse numeric values correctly', async () => {
      const mockCsvData: AttachmentCsvDto[] = [
        {
          support_id_catalog: 'cat1',
          support_idr: 'idr1',
          support_adr: 'Support 1',
          support_tower: 'tower1',
          support_family: 'Family 1',
          position: '1',
          X: '0',
          Y: '0',
          Z: '10.5',
          L: '2.0'
        },
        {
          support_family: 'Family 2',
          support_adr: 'Support 2',
          position: '2',
          support_id_catalog: 'cat2',
          support_idr: 'idr2',
          support_tower: 'tower2',
          X: '0',
          Y: '0',
          Z: '11',
          L: '2.5'
        }
      ];

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<AttachmentCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: mockCsvData,
              errors: [],
              meta: {
                delimiter: ',',
                linebreak: '\n',
                aborted: false,
                truncated: false,
                cursor: 0,
                fields: []
              }
            },
            undefined
          );
        }
      });

      await service.importFromFile();

      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalledWith([
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_tower: 'tower1',
          support_name: 'idr1',
          attachment_set: 1,
          attachment_altitude: 10.5,
          cross_arm_length: 2.0,
          attachment_set_x: 0,
          attachment_set_y: 0,
          attachment_set_z: 10.5
        },
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_tower: 'tower2',
          support_name: 'idr2',
          attachment_set: 2,
          attachment_altitude: 11,
          cross_arm_length: 2.5,
          attachment_set_x: 0,
          attachment_set_y: 0,
          attachment_set_z: 11
        }
      ]);
    });

    it('should call Papa.parse with download:true, worker:true and the attachments URL', async () => {
      vi.mocked(Papa.parse).mockImplementation((_url: string, options: Papa.ParseConfig<AttachmentCsvDto>) => {
        options.complete?.(
          {
            data: [],
            errors: [],
            meta: { delimiter: ',', linebreak: '\n', aborted: false, truncated: false, cursor: 0, fields: [] }
          },
          undefined
        );
      });

      await service.importFromFile();

      expect(Papa.parse).toHaveBeenCalledWith(
        expect.stringContaining('/data/attachments.csv'),
        expect.objectContaining({ download: true, worker: true })
      );
    });

    it('should not store data when Papa.parse calls error callback', async () => {
      vi.mocked(Papa.parse).mockImplementation((_url: string, options: Papa.ParseConfig<AttachmentCsvDto>) => {
        if (options.error) {
          options.error(new Error('Network error') as Papa.ParseError, undefined!);
        }
      });

      await service.importFromFile();

      expect(mockAttachmentsTable.clear).not.toHaveBeenCalled();
      expect(mockAttachmentsTable.bulkAdd).not.toHaveBeenCalled();
    });
  });

  describe('getDistinctSupportNames', () => {
    it('should return distinct support names ordered alphabetically', async () => {
      const mockKeys = ['Support A', 'Support B', 'Support C'];
      const orderByMock = { uniqueKeys: vi.fn().mockResolvedValue(mockKeys) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['orderBy'] = vi.fn().mockReturnValue(orderByMock);

      const result = await service.getDistinctSupportNames();

      expect((mockDb.catAttachments as unknown as Record<string, unknown>)['orderBy']).toHaveBeenCalledWith(
        'support_name'
      );
      expect(orderByMock.uniqueKeys).toHaveBeenCalled();
      expect(result).toEqual(['Support A', 'Support B', 'Support C']);
    });

    it('should return empty array when no attachments exist', async () => {
      const orderByMock = { uniqueKeys: vi.fn().mockResolvedValue([]) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['orderBy'] = vi.fn().mockReturnValue(orderByMock);

      const result = await service.getDistinctSupportNames();

      expect(result).toEqual([]);
    });

    it('should return empty array when database is not available', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const result = await service.getDistinctSupportNames();

      expect(result).toEqual([]);
    });

    it('should filter out non-string and empty-string keys from mixed key results', async () => {
      const mixedKeys = ['Support A', '', 42, null, undefined, 'Support B', ''];
      const orderByMock = { uniqueKeys: vi.fn().mockResolvedValue(mixedKeys) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['orderBy'] = vi.fn().mockReturnValue(orderByMock);

      const result = await service.getDistinctSupportNames();

      expect(result).toEqual(['Support A', 'Support B']);
    });
  });

  describe('getAttachmentsBySupportName', () => {
    it('should return attachments filtered and sorted by attachment_set for the given support name', async () => {
      const mockAttachments: CatalogAttachmentEntity[] = [
        {
          uuid: 'uuid-1',
          updated_at: '2025-01-01T00:00:00.000Z',
          created_at: '2025-01-01T00:00:00.000Z',
          support_name: 'Support A',
          attachment_set: 1,
          attachment_altitude: 10.5,
          cross_arm_length: 2.0,
          support_tower: 'tower'
        },
        {
          uuid: 'uuid-2',
          updated_at: '2025-01-01T00:00:00.000Z',
          created_at: '2025-01-01T00:00:00.000Z',
          support_name: 'Support A',
          attachment_set: 2,
          attachment_altitude: 12.0,
          cross_arm_length: 3.0,
          support_tower: 'tower'
        }
      ];
      const toArrayMock = vi.fn().mockResolvedValue(mockAttachments);
      const betweenMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
      const whereMock = { between: betweenMock };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['where'] = vi.fn().mockReturnValue(whereMock);

      const result = await service.getAttachmentsBySupportName('Support A');

      expect((mockDb.catAttachments as unknown as Record<string, unknown>)['where']).toHaveBeenCalledWith(
        '[support_name+attachment_set]'
      );
      expect(betweenMock).toHaveBeenCalledWith(['Support A', expect.anything()], ['Support A', expect.anything()]);
      expect(toArrayMock).toHaveBeenCalled();
      expect(result).toEqual(mockAttachments);
    });

    it('should return empty array when no attachment matches', async () => {
      const toArrayMock = vi.fn().mockResolvedValue([]);
      const betweenMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
      const whereMock = { between: betweenMock };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['where'] = vi.fn().mockReturnValue(whereMock);

      const result = await service.getAttachmentsBySupportName('Unknown Support');

      expect(result).toEqual([]);
    });

    it('should return empty array when database is not available', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const result = await service.getAttachmentsBySupportName('Support A');

      expect(result).toEqual([]);
    });
  });

  describe('getAttachmentDetails', () => {
    it('should return the first attachment matching support name and attachment set', async () => {
      const mockAttachment: CatalogAttachmentEntity = {
        uuid: 'uuid-1',
        updated_at: '2025-01-01T00:00:00.000Z',
        created_at: '2025-01-01T00:00:00.000Z',
        support_name: 'Support A',
        attachment_set: 2,
        attachment_altitude: 12.0,
        cross_arm_length: 3.0,
        support_tower: 'TowerModel'
      };
      const firstMock = vi.fn().mockResolvedValue(mockAttachment);
      const equalsMock = { first: firstMock };
      const whereMock = { equals: vi.fn().mockReturnValue(equalsMock) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['where'] = vi.fn().mockReturnValue(whereMock);

      const result = await service.getAttachmentDetails('Support A', 2);

      expect((mockDb.catAttachments as unknown as Record<string, unknown>)['where']).toHaveBeenCalledWith(
        '[support_name+attachment_set]'
      );
      expect(whereMock.equals).toHaveBeenCalledWith(['Support A', 2]);
      expect(firstMock).toHaveBeenCalled();
      expect(result).toEqual(mockAttachment);
    });

    it('should return undefined when no matching attachment is found', async () => {
      const firstMock = vi.fn().mockResolvedValue(undefined);
      const equalsMock = { first: firstMock };
      const whereMock = { equals: vi.fn().mockReturnValue(equalsMock) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['where'] = vi.fn().mockReturnValue(whereMock);

      const result = await service.getAttachmentDetails('Support A', 99);

      expect(result).toBeUndefined();
    });

    it('should return undefined when database is not available', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const result = await service.getAttachmentDetails('Support A', 1);

      expect(result).toBeUndefined();
    });
  });

  describe('addSupportNamesIfAbsent()', () => {
    it('should do nothing when entries array is empty', async () => {
      await service.addSupportNamesIfAbsent([]);

      expect(mockAttachmentsTable.toArray).not.toHaveBeenCalled();
      expect(mockAttachmentsTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should do nothing when all support names already exist in DB', async () => {
      mockOrderByMock.uniqueKeys.mockResolvedValue(['SupportA', 'SupportB']);

      const entries: SupportNameEntry[] = [
        { supportName: 'SupportA', supportTower: 'tower1' },
        { supportName: 'SupportB', supportTower: 'tower2' }
      ];

      await service.addSupportNamesIfAbsent(entries);

      expect(mockOrderByMock.uniqueKeys).toHaveBeenCalled();
      expect(mockAttachmentsTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should bulkAdd entries whose support name is absent', async () => {
      mockOrderByMock.uniqueKeys.mockResolvedValue(['SupportA']);

      const entries: SupportNameEntry[] = [
        { supportName: 'SupportA', supportTower: 'tower1' },
        { supportName: 'SupportNew', supportTower: 'towerNew' }
      ];

      await service.addSupportNamesIfAbsent(entries);

      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalledWith([
        {
          uuid: 'mock-uuid-123',
          created_at: expect.any(String),
          updated_at: expect.any(String),
          support_name: 'SupportNew',
          support_tower: 'towerNew'
        }
      ]);
    });

    it('should deduplicate input entries with the same name and insert only once', async () => {
      // mockOrderByMock defaults to [] — no existing names

      const entries: SupportNameEntry[] = [
        { supportName: 'SupportDup', supportTower: 'tower1' },
        { supportName: 'SupportDup', supportTower: 'tower2' }
      ];

      await service.addSupportNamesIfAbsent(entries);

      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalledWith([
        {
          uuid: 'mock-uuid-123',
          created_at: expect.any(String),
          updated_at: expect.any(String),
          support_name: 'SupportDup',
          support_tower: 'tower2'
        }
      ]);
    });

    it('should skip entries with empty supportName', async () => {
      // mockOrderByMock defaults to [] — no existing names

      const entries: SupportNameEntry[] = [
        { supportName: '', supportTower: 'tower1' },
        { supportName: 'ValidSupport', supportTower: 'tower2' }
      ];

      await service.addSupportNamesIfAbsent(entries);

      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalledWith([
        {
          uuid: 'mock-uuid-123',
          created_at: expect.any(String),
          updated_at: expect.any(String),
          support_name: 'ValidSupport',
          support_tower: 'tower2'
        }
      ]);
    });

    it('should do nothing when db is undefined', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const entries: SupportNameEntry[] = [{ supportName: 'SupportA', supportTower: 'tower1' }];

      await service.addSupportNamesIfAbsent(entries);

      expect(mockAttachmentsTable.bulkAdd).not.toHaveBeenCalled();
    });
  });

  describe('allAttachments$', () => {
    it('should emit list from catAttachments when ready$ emits true', () => {
      const mockAttachments: CatalogAttachmentEntity[] = [
        { uuid: 'uuid-a', support_name: 'SA', support_tower: 'TA', created_at: '', updated_at: '' }
      ];
      mockAttachmentsTable.toArray.mockResolvedValue(mockAttachments);

      return new Promise<void>((resolve) => {
        service.allAttachments$.subscribe((result) => {
          expect(result).toEqual(mockAttachments);
          resolve();
        });
        (storageService.ready$ as BehaviorSubject<boolean>).next(true);
      });
    });

    it('should not emit before ready$ emits true', () => {
      const received: CatalogAttachmentEntity[][] = [];

      service.allAttachments$.subscribe((val) => received.push(val));

      // ready$ starts as false — no emission expected
      expect(received).toHaveLength(0);
    });

    it('should re-emit after addSupportNamesIfAbsent adds new entries', async () => {
      const initial: CatalogAttachmentEntity[] = [];
      const updated: CatalogAttachmentEntity[] = [
        { uuid: 'uuid-b', support_name: 'SupportX', support_tower: 'TX', created_at: '', updated_at: '' }
      ];
      // call order: allAttachments$ initial read → allAttachments$ refresh read (addSupportNamesIfAbsent now uses uniqueKeys, not toArray)
      mockAttachmentsTable.toArray.mockResolvedValueOnce(initial).mockResolvedValueOnce(updated);

      const secondEmission = firstValueFrom(service.allAttachments$.pipe(skip(1)));
      (storageService.ready$ as BehaviorSubject<boolean>).next(true);

      const entries: SupportNameEntry[] = [{ supportName: 'SupportX', supportTower: 'TX' }];
      await service.addSupportNamesIfAbsent(entries);

      const result = await secondEmission;
      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });
  });

  describe('distinctSupportNames$', () => {
    it('should emit distinct support names when ready$ emits true', () => {
      const mockNames = ['Support A', 'Support B'];
      mockOrderByMock.uniqueKeys.mockResolvedValue(mockNames);

      return new Promise<void>((resolve) => {
        service.distinctSupportNames$.subscribe((result) => {
          expect(result).toEqual(mockNames);
          resolve();
        });
        (storageService.ready$ as BehaviorSubject<boolean>).next(true);
      });
    });

    it('should not emit before ready$ emits true', () => {
      const received: string[][] = [];

      service.distinctSupportNames$.subscribe((val) => received.push(val));

      // ready$ starts as false — no emission expected
      expect(received).toHaveLength(0);
    });

    it('should re-emit after addSupportNamesIfAbsent adds new entries', async () => {
      const initial: string[] = [];
      const updated = ['SupportX'];
      // call order: distinctSupportNames$ initial read → addSupportNamesIfAbsent existing check → distinctSupportNames$ refresh read
      mockOrderByMock.uniqueKeys
        .mockResolvedValueOnce(initial)
        .mockResolvedValueOnce(initial)
        .mockResolvedValueOnce(updated);

      const secondEmission = firstValueFrom(service.distinctSupportNames$.pipe(skip(1)));
      (storageService.ready$ as BehaviorSubject<boolean>).next(true);

      const entries: SupportNameEntry[] = [{ supportName: 'SupportX', supportTower: 'TX' }];
      await service.addSupportNamesIfAbsent(entries);

      const result = await secondEmission;
      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });
  });
});
