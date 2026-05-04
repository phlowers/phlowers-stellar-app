/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { AttachmentService } from './attachment.service';
import { StorageService } from '@services/storage/storage.service';
import { CatalogAttachmentEntity } from '@infrastructure/database';
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
    // Create mock database tables
    mockAttachmentsTable = {
      count: vi.fn().mockResolvedValue(3),
      toArray: vi.fn().mockResolvedValue([]),
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined)
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
          support_name: 'Support 1',
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
          support_name: 'Support 2',
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

    it('should filter out attachments with missing support_adr', async () => {
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
          support_idr: 'idr2',
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

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/attachments.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add attachments with valid support_adr
      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalledWith([
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'Support 1',
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
          support_name: 'Support 3',
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

    it('should handle CSV data with mixed valid and invalid support_adr values', async () => {
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
          support_idr: 'idr2',
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
          support_idr: 'idr4',
          support_adr: null as unknown as string,
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

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/attachments.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add attachments with valid support_adr
      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalledWith([
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'Support 1',
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
          support_name: 'Support 3',
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
          support_name: 'Support 1',
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
          support_name: 'Support 2',
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
      const sortByMock = vi.fn().mockResolvedValue(mockAttachments);
      const equalsMock = { sortBy: sortByMock };
      const whereMock = { equals: vi.fn().mockReturnValue(equalsMock) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['where'] = vi.fn().mockReturnValue(whereMock);

      const result = await service.getAttachmentsBySupportName('Support A');

      expect((mockDb.catAttachments as unknown as Record<string, unknown>)['where']).toHaveBeenCalledWith(
        'support_name'
      );
      expect(whereMock.equals).toHaveBeenCalledWith('Support A');
      expect(sortByMock).toHaveBeenCalledWith('attachment_set');
      expect(result).toEqual(mockAttachments);
    });

    it('should return empty array when no attachment matches', async () => {
      const sortByMock = vi.fn().mockResolvedValue([]);
      const equalsMock = { sortBy: sortByMock };
      const whereMock = { equals: vi.fn().mockReturnValue(equalsMock) };
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
      const andMock = { first: firstMock };
      const equalsMock = { and: vi.fn().mockReturnValue(andMock) };
      const whereMock = { equals: vi.fn().mockReturnValue(equalsMock) };
      (mockDb.catAttachments as unknown as Record<string, unknown>)['where'] = vi.fn().mockReturnValue(whereMock);

      const result = await service.getAttachmentDetails('Support A', 2);

      expect((mockDb.catAttachments as unknown as Record<string, unknown>)['where']).toHaveBeenCalledWith(
        'support_name'
      );
      expect(whereMock.equals).toHaveBeenCalledWith('Support A');
      expect(equalsMock.and).toHaveBeenCalledWith(expect.any(Function));
      expect(firstMock).toHaveBeenCalled();
      expect(result).toEqual(mockAttachment);
    });

    it('should return undefined when no matching attachment is found', async () => {
      const firstMock = vi.fn().mockResolvedValue(undefined);
      const andMock = { first: firstMock };
      const equalsMock = { and: vi.fn().mockReturnValue(andMock) };
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
});
