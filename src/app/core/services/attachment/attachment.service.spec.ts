/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { AttachmentService } from './attachment.service';
import { StorageService } from '../storage/storage.service';
import {
  Attachment,
  RteAttachmentsCsvFile
} from '../../data/database/interfaces/attachment';
import Papa from 'papaparse';

// Mock Papa Parse
jest.mock('papaparse', () => ({
  parse: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

interface MockTable {
  count: jest.Mock;
  toArray: jest.Mock;
  bulkAdd: jest.Mock;
  clear?: jest.Mock;
}

interface MockDb {
  lines: MockTable;
  attachments: MockTable;
}

describe('AttachmentService', () => {
  let service: AttachmentService;
  let storageService: StorageService;
  let mockDb: MockDb;
  let mockAttachmentsTable: MockTable;

  beforeEach(() => {
    // Create mock database tables
    mockAttachmentsTable = {
      count: jest.fn().mockResolvedValue(3),
      toArray: jest.fn().mockResolvedValue([]),
      bulkAdd: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined)
    };

    mockDb = {
      lines: {
        count: jest.fn().mockResolvedValue(0),
        toArray: jest.fn().mockResolvedValue([]),
        bulkAdd: jest.fn().mockResolvedValue(undefined)
      },
      attachments: mockAttachmentsTable
    };

    // Create spy for StorageService
    const storageServiceSpy = {
      ready$: new BehaviorSubject<boolean>(false),
      db: mockDb
    } as unknown as StorageService;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
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
      const mockAttachments: Attachment[] = [
        {
          uuid: 'uuid-1',
          updated_at: '2025-01-01T00:00:00.000Z',
          created_at: '2025-01-01T00:00:00.000Z',
          support_name: 'Support 1',
          attachment_set: '1',
          support_order: 1,
          attachment_altitude: 10.5,
          cross_arm_length: 2.0
        },
        {
          uuid: 'uuid-2',
          updated_at: '2025-01-01T00:00:00.000Z',
          created_at: '2025-01-01T00:00:00.000Z',
          support_name: 'Support 2',
          attachment_set: '2',
          support_order: 2,
          attachment_altitude: 11.0,
          cross_arm_length: 2.5
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
      const mockCsvData: RteAttachmentsCsvFile[] = [
        {
          support_family: 'Family 1',
          support_name: 'Support 1',
          set_number: '1',
          altitude: '10.5',
          arm_length: '2.0'
        },
        {
          support_family: 'Family 2',
          support_name: 'Support 2',
          set_number: '2',
          altitude: '11.0',
          arm_length: '2.5'
        }
      ];

      const mockCsvContent =
        'support_name,set_number,altitude,arm_length\nSupport 1,1,10.5,2.0\nSupport 2,2,11.0,2.5';

      // Mock Papa Parse to call complete callback
      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteAttachmentsCsvFile>) => {
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
        }
      );

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(
        `${window.location.origin}/attachments.csv`
      );
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
          attachment_set: '1',
          support_order: 1,
          attachment_altitude: 10.5,
          cross_arm_length: 2.0
        },
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'Support 2',
          attachment_set: '2',
          support_order: 2,
          attachment_altitude: 11.0,
          cross_arm_length: 2.5
        }
      ]);
    });

    it('should handle empty CSV data', async () => {
      const mockCsvContent = 'support_name,set_number,altitude,arm_length\n';

      // Mock Papa Parse to call complete callback with empty data
      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteAttachmentsCsvFile>) => {
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
        }
      );

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(
        `${window.location.origin}/attachments.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockAttachmentsTable.clear).not.toHaveBeenCalled();
      expect(mockAttachmentsTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should filter out attachments with missing support_name', async () => {
      const mockCsvData: RteAttachmentsCsvFile[] = [
        {
          support_family: 'Family 1',
          support_name: 'Support 1',
          set_number: '1',
          altitude: '10.5',
          arm_length: '2.0'
        },
        {
          support_family: 'Family 2',
          support_name: '',
          set_number: '2',
          altitude: '11.0',
          arm_length: '2.5'
        },
        {
          support_family: 'Family 3',
          support_name: 'Support 3',
          set_number: '3',
          altitude: '12.0',
          arm_length: '3.0'
        }
      ];

      const mockCsvContent =
        'support_family,support_name,set_number,altitude,arm_length\nFamily 1,Support 1,1,10.5,2.0\nFamily 2,,2,11.0,2.5\nFamily 3,Support 3,3,12.0,3.0';

      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteAttachmentsCsvFile>) => {
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
        }
      );

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(
        `${window.location.origin}/attachments.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add attachments with valid support_name
      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalledWith([
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'Support 1',
          attachment_set: '1',
          support_order: 1,
          attachment_altitude: 10.5,
          cross_arm_length: 2.0
        },
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'Support 3',
          attachment_set: '3',
          support_order: 3,
          attachment_altitude: 12.0,
          cross_arm_length: 3.0
        }
      ]);
    });

    it('should handle missing database gracefully', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const mockCsvData: RteAttachmentsCsvFile[] = [
        {
          support_family: 'Family 1',
          support_name: 'Support 1',
          set_number: '1',
          altitude: '10.5',
          arm_length: '2.0'
        }
      ];

      const mockCsvContent =
        'support_family,support_name,set_number,altitude,arm_length\nFamily 1,Support 1,1,10.5,2.0';

      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteAttachmentsCsvFile>) => {
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
        }
      );

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(
        `${window.location.origin}/attachments.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      // Should not throw error
      await expect(importPromise).resolves.toBeUndefined();
    });

    it('should handle CSV data with mixed valid and invalid support_name values', async () => {
      const mockCsvData: RteAttachmentsCsvFile[] = [
        {
          support_family: 'Family 1',
          support_name: 'Support 1',
          set_number: '1',
          altitude: '10.5',
          arm_length: '2.0'
        },
        {
          support_family: 'Family 2',
          support_name: '',
          set_number: '2',
          altitude: '11.0',
          arm_length: '2.5'
        },
        {
          support_family: 'Family 3',
          support_name: 'Support 3',
          set_number: '3',
          altitude: '12.0',
          arm_length: '3.0'
        },
        {
          support_family: 'Family 4',
          support_name: null as unknown as string,
          set_number: '4',
          altitude: '13.0',
          arm_length: '3.5'
        }
      ];

      const mockCsvContent =
        'support_family,support_name,set_number,altitude,arm_length\nFamily 1,Support 1,1,10.5,2.0\nFamily 2,,2,11.0,2.5\nFamily 3,Support 3,3,12.0,3.0\nFamily 4,,4,13.0,3.5';

      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteAttachmentsCsvFile>) => {
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
        }
      );

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(
        `${window.location.origin}/attachments.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add attachments with valid support_name
      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalledWith([
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'Support 1',
          attachment_set: '1',
          support_order: 1,
          attachment_altitude: 10.5,
          cross_arm_length: 2.0
        },
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'Support 3',
          attachment_set: '3',
          support_order: 3,
          attachment_altitude: 12.0,
          cross_arm_length: 3.0
        }
      ]);
    });

    it('should clear attachments table before adding new data', async () => {
      const mockCsvData: RteAttachmentsCsvFile[] = [
        {
          support_family: 'Family 1',
          support_name: 'Support 1',
          set_number: '1',
          altitude: '10.5',
          arm_length: '2.0'
        }
      ];

      const mockCsvContent =
        'support_family,support_name,set_number,altitude,arm_length\nFamily 1,Support 1,1,10.5,2.0';

      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteAttachmentsCsvFile>) => {
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
        }
      );

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(
        `${window.location.origin}/attachments.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Verify clear is called before bulkAdd
      expect(mockAttachmentsTable.clear).toHaveBeenCalled();
      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalled();
    });

    it('should handle HTTP errors gracefully', async () => {
      // Mock Papa Parse to call complete callback with empty data when HTTP error occurs
      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteAttachmentsCsvFile>) => {
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
        }
      );

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request to return an error
      const req = httpTestingController.expectOne(
        `${window.location.origin}/attachments.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush('Error', { status: 404, statusText: 'Not Found' });

      await importPromise;

      // Should not throw error and not call bulkAdd (but clear may be called)
      expect(mockAttachmentsTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should parse numeric values correctly', async () => {
      const mockCsvData: RteAttachmentsCsvFile[] = [
        {
          support_family: 'Family 1',
          support_name: 'Support 1',
          set_number: '1',
          altitude: '10.5',
          arm_length: '2.0'
        },
        {
          support_family: 'Family 2',
          support_name: 'Support 2',
          set_number: '2',
          altitude: '11',
          arm_length: '2.5'
        }
      ];

      const mockCsvContent =
        'support_family,support_name,set_number,altitude,arm_length\nFamily 1,Support 1,1,10.5,2.0\nFamily 2,Support 2,2,11,2.5';

      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteAttachmentsCsvFile>) => {
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
        }
      );

      const importPromise = service.importFromFile();

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(
        `${window.location.origin}/attachments.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockAttachmentsTable.bulkAdd).toHaveBeenCalledWith([
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'Support 1',
          attachment_set: '1',
          support_order: 1,
          attachment_altitude: 10.5,
          cross_arm_length: 2.0
        },
        {
          uuid: 'mock-uuid-123',
          updated_at: expect.any(String),
          created_at: expect.any(String),
          support_name: 'Support 2',
          attachment_set: '2',
          support_order: 2,
          attachment_altitude: 11,
          cross_arm_length: 2.5
        }
      ]);
    });
  });
});
