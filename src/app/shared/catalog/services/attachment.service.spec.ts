/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, of, skip } from 'rxjs';
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
  clear: vi.Mock;
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

  beforeEach(() => {
    globalThis.localStorage.removeItem('catalog:distinct_support_names');

    // Create mock database tables
    mockAttachmentsTable = {
      count: vi.fn().mockResolvedValue(3),
      toArray: vi.fn().mockResolvedValue([]),
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      orderBy: vi.fn().mockReturnValue({ uniqueKeys: vi.fn().mockResolvedValue([]) })
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
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AttachmentService,
        { provide: StorageService, useValue: storageServiceSpy }
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
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
      httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpTestingController.verify();
    });

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

      const mockCsvContent =
        'support_id_catalog,support_idr,support_adr,support_tower,support_family,position,X,Y,Z,L\ncatalog1,idr1,Support 1,tower1,Family 1,1,0,0,10.5,2.0\ncatalog2,idr2,Support 2,tower2,Family 2,2,0,0,11.0,2.5';

      // Mock Papa Parse to call complete callback
      vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
        const options = args[1] as Papa.ParseConfig<AttachmentCsvDto>;
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

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/attachments.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

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
      const mockCsvContent =
        'support_id_catalog,support_idr,support_adr,support_tower,support_family,position,X,Y,Z,L\n';

      // Mock Papa Parse to call complete callback with empty data
      vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
        const options = args[1] as Papa.ParseConfig<AttachmentCsvDto>;
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

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/attachments.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

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

      const mockCsvContent =
        'support_id_catalog,support_idr,support_adr,support_tower,support_family,position,X,Y,Z,L\ncat1,idr1,Support 1,tower1,Family 1,1,0,0,10.5,2.0\ncat2,idr2,,tower2,Family 2,2,0,0,11.0,2.5\ncat3,idr3,Support 3,tower3,Family 3,3,0,0,12.0,3.0';

      vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
        const options = args[1] as Papa.ParseConfig<AttachmentCsvDto>;
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

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/attachments.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

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

      const mockCsvContent =
        'support_id_catalog,support_idr,support_adr,support_tower,support_family,position,X,Y,Z,L\ncat1,idr1,Support 1,tower1,Family 1,1,0,0,10.5,2.0';

      vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
        const options = args[1] as Papa.ParseConfig<AttachmentCsvDto>;
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

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/attachments.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      // Should not throw error
      await expect(importPromise).resolves.toBeUndefined();
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

      const mockCsvContent =
        'support_id_catalog,support_idr,support_adr,support_tower,support_family,position,X,Y,Z,L\nFamily 1,Support 1,1,10.5,2.0\nFamily 2,,2,11.0,2.5\nFamily 3,Support 3,3,12.0,3.0\nFamily 4,,4,13.0,3.5';

      vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
        const options = args[1] as Papa.ParseConfig<AttachmentCsvDto>;
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

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/attachments.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

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

      const mockCsvContent =
        'support_id_catalog,support_idr,support_adr,support_tower,support_family,position,X,Y,Z,L\nFamily 1,Support 1,1,10.5,2.0';

      vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
        const options = args[1] as Papa.ParseConfig<AttachmentCsvDto>;
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

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/attachments.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Verify clear is called before bulkAdd
      expect(mockAttachmentsTable.clear).toHaveBeenCalled();
      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalled();
    });

    it('should handle HTTP errors gracefully', async () => {
      // Mock Papa Parse to call complete callback with empty data when HTTP error occurs
      vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
        const options = args[1] as Papa.ParseConfig<AttachmentCsvDto>;
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

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request to return an error
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/attachments.csv`);
      expect(req.request.method).toBe('GET');
      req.flush('Error', { status: 404, statusText: 'Not Found' });

      await importPromise;

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

      const mockCsvContent =
        'support_id_catalog,support_idr,support_adr,support_tower,support_family,position,X,Y,Z,L\nFamily 1,Support 1,1,10.5,2.0\nFamily 2,Support 2,2,11,2.5';

      vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
        const options = args[1] as Papa.ParseConfig<AttachmentCsvDto>;
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

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/attachments.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

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
      mockAttachmentsTable.toArray.mockResolvedValue([
        { uuid: 'u1', created_at: '', updated_at: '', support_name: 'SupportA', support_tower: 'tower1' },
        { uuid: 'u2', created_at: '', updated_at: '', support_name: 'SupportB', support_tower: 'tower2' }
      ] as CatalogAttachmentEntity[]);

      const entries: SupportNameEntry[] = [
        { supportName: 'SupportA', supportTower: 'tower1' },
        { supportName: 'SupportB', supportTower: 'tower2' }
      ];

      await service.addSupportNamesIfAbsent(entries);

      expect(mockAttachmentsTable.toArray).toHaveBeenCalled();
      expect(mockAttachmentsTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should bulkAdd entries whose support name is absent', async () => {
      mockAttachmentsTable.toArray.mockResolvedValue([
        { uuid: 'u1', created_at: '', updated_at: '', support_name: 'SupportA', support_tower: 'tower1' }
      ] as CatalogAttachmentEntity[]);

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
      mockAttachmentsTable.toArray.mockResolvedValue([]);

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
      mockAttachmentsTable.toArray.mockResolvedValue([]);

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

      expect(mockAttachmentsTable.toArray).not.toHaveBeenCalled();
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
      // call order: allAttachments$ initial read → addSupportNamesIfAbsent existing check → allAttachments$ refresh read
      mockAttachmentsTable.toArray
        .mockResolvedValueOnce(initial)
        .mockResolvedValueOnce(initial)
        .mockResolvedValueOnce(updated);

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
      const mockNames = ['Alpha', 'Bravo'];
      const orderByMock = { uniqueKeys: vi.fn().mockResolvedValue(mockNames) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['orderBy'] = vi.fn().mockReturnValue(orderByMock);

      return new Promise<void>((resolve) => {
        service.distinctSupportNames$.subscribe((result) => {
          expect(result).toEqual(['Alpha', 'Bravo']);
          resolve();
        });
        (storageService.ready$ as BehaviorSubject<boolean>).next(true);
      });
    });

    it('should not emit before ready$ emits true', async () => {
      const received: string[][] = [];
      const orderByMock = { uniqueKeys: vi.fn().mockResolvedValue(['Type1']) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['orderBy'] = vi.fn().mockReturnValue(orderByMock);

      // Subscribe BEFORE ready$ emits
      const sub = service.distinctSupportNames$.subscribe((val) => {
        received.push(val);
      });

      // Before ready$, should not have emitted yet
      expect(received).toHaveLength(0);

      // Emit ready$ and wait for async operations
      (storageService.ready$ as BehaviorSubject<boolean>).next(true);

      // Wait for the async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Verify emission happened AFTER ready$
      expect(received.length).toBeGreaterThan(0);
      sub.unsubscribe();
    });

    it('should re-emit after addSupportNamesIfAbsent triggers refresh', async () => {
      const orderByMock = { uniqueKeys: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(['NewSupport']) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['orderBy'] = vi.fn().mockReturnValue(orderByMock);
      mockAttachmentsTable.toArray.mockResolvedValue([]);
      mockAttachmentsTable.bulkAdd.mockResolvedValue(undefined);

      const secondEmission = firstValueFrom(service.distinctSupportNames$.pipe(skip(1)));
      (storageService.ready$ as BehaviorSubject<boolean>).next(true);

      const entries: SupportNameEntry[] = [{ supportName: 'NewSupport', supportTower: '' }];
      await service.addSupportNamesIfAbsent(entries);

      const result = await secondEmission;
      expect(result).toEqual(['NewSupport']);
    });

    it('should replay last value to late subscribers (shareReplay)', async () => {
      const orderByMock = { uniqueKeys: vi.fn().mockResolvedValue(['Alpha', 'Bravo']) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['orderBy'] = vi.fn().mockReturnValue(orderByMock);

      // First subscriber triggers query
      (storageService.ready$ as BehaviorSubject<boolean>).next(true);
      const firstResult = await firstValueFrom(service.distinctSupportNames$);

      expect(firstResult).toEqual(['Alpha', 'Bravo']);
      expect(orderByMock.uniqueKeys).toHaveBeenCalledTimes(1);

      // Second subscriber (late) should get cached value WITHOUT new query
      const secondResult = await firstValueFrom(service.distinctSupportNames$);
      expect(secondResult).toEqual(['Alpha', 'Bravo']);
      expect(orderByMock.uniqueKeys).toHaveBeenCalledTimes(1); // No additional call
    });

    it('should re-emit after importFromFile triggers refresh', async () => {
      const orderByMock = { uniqueKeys: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(['Imported']) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['orderBy'] = vi.fn().mockReturnValue(orderByMock);

      mockAttachmentsTable.clear.mockResolvedValue(undefined);
      mockAttachmentsTable.bulkAdd.mockResolvedValue(undefined);

      const secondEmission = firstValueFrom(service.distinctSupportNames$.pipe(skip(1)));
      (storageService.ready$ as BehaviorSubject<boolean>).next(true);

      // Mock HTTP response for CSV
      const mockCsv = 'support_name,support_tower\nImported,Tower1';
      vi.spyOn(service['http'], 'get').mockReturnValue(of(mockCsv));

      await service.importFromFile();

      const result = await secondEmission;
      expect(result).toEqual(['Imported']);
    });

    it('should emit cached value first, then fresh DB value', async () => {
      // Pre-populate cache BEFORE creating service
      globalThis.localStorage.setItem('catalog:distinct_support_names', JSON.stringify(['Cached1', 'Cached2']));

      // Reconfigure TestBed to create a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          AttachmentService,
          { provide: StorageService, useValue: storageService }
        ]
      });
      const freshService = TestBed.inject(AttachmentService);

      const orderByMock = { uniqueKeys: vi.fn().mockResolvedValue(['Fresh1', 'Fresh2']) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['orderBy'] = vi.fn().mockReturnValue(orderByMock);

      const emissions: string[][] = [];
      const sub = freshService.distinctSupportNames$.subscribe((val) => {
        emissions.push(val);
      });

      // Wait for cache emission (synchronous)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Emit ready$ for DB value
      (storageService.ready$ as BehaviorSubject<boolean>).next(true);

      // Wait for DB emission
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(emissions[0]).toEqual(['Cached1', 'Cached2']); // Cache first
      expect(emissions[1]).toEqual(['Fresh1', 'Fresh2']); // DB second
      sub.unsubscribe();
    });

    it('should handle corrupted cache gracefully', async () => {
      // Set corrupted cache (not an array)
      globalThis.localStorage.setItem('catalog:distinct_support_names', '{"not":"an array"}');

      const orderByMock = { uniqueKeys: vi.fn().mockResolvedValue(['Fresh1', 'Fresh2']) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['orderBy'] = vi.fn().mockReturnValue(orderByMock);

      (storageService.ready$ as BehaviorSubject<boolean>).next(true);
      const result = await firstValueFrom(service.distinctSupportNames$);

      // Should ignore corrupted cache and use DB value
      expect(result).toEqual(['Fresh1', 'Fresh2']);
    });

    it('should filter out non-string values from cache', async () => {
      // Set cache with mixed types BEFORE creating service
      globalThis.localStorage.setItem(
        'catalog:distinct_support_names',
        JSON.stringify(['Valid', 123, null, 'Another', ''])
      );

      // Reconfigure TestBed to create a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          AttachmentService,
          { provide: StorageService, useValue: storageService }
        ]
      });
      const freshService = TestBed.inject(AttachmentService);

      const orderByMock = { uniqueKeys: vi.fn().mockResolvedValue(['Fresh1']) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['orderBy'] = vi.fn().mockReturnValue(orderByMock);

      const emissions: string[][] = [];
      const sub = freshService.distinctSupportNames$.subscribe((val) => {
        emissions.push(val);
      });

      // Wait for cache emission (synchronous)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Emit ready$ for DB value
      (storageService.ready$ as BehaviorSubject<boolean>).next(true);

      // Wait for DB emission
      await new Promise((resolve) => setTimeout(resolve, 100));

      // First emission should have filtered cache (only valid strings, no empty strings)
      expect(emissions[0]).toEqual(['Valid', 'Another']);
      // Second emission from DB
      expect(emissions[1]).toEqual(['Fresh1']);
      sub.unsubscribe();
    });
  });
});
