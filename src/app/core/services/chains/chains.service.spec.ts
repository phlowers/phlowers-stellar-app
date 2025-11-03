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
import { ChainsService } from './chains.service';
import { StorageService } from '../storage/storage.service';
import { Chain, RteChainsCsvFile } from '../../data/database/interfaces/chain';
import Papa from 'papaparse';

// Mock Papa Parse
jest.mock('papaparse', () => ({
  parse: jest.fn()
}));

interface MockTable {
  count: jest.Mock;
  toArray: jest.Mock;
  bulkAdd: jest.Mock;
  clear?: jest.Mock;
}

interface MockDb {
  lines: MockTable;
  chains: MockTable;
}

describe('ChainsService', () => {
  let service: ChainsService;
  let storageService: StorageService;
  let mockDb: MockDb;
  let mockChainsTable: MockTable;

  beforeEach(() => {
    // Create mock database tables
    mockChainsTable = {
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
      chains: mockChainsTable
    };

    // Create spy for StorageService
    const storageServiceSpy = {
      ready$: new BehaviorSubject<boolean>(false),
      db: mockDb
    } as unknown as StorageService;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ChainsService,
        { provide: StorageService, useValue: storageServiceSpy }
      ]
    });

    service = TestBed.inject(ChainsService);
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

  describe('getChains', () => {
    it('should return chains array from database', async () => {
      const mockChains: Chain[] = [
        {
          name: 'Chain 1',
          length: 100.5,
          weight: 2.3,
          surface: 100,
          v: false
        },
        {
          name: 'Chain 2',
          length: 150.0,
          weight: 3.1,
          surface: 150,
          v: true
        }
      ];
      mockChainsTable.toArray.mockResolvedValue(mockChains);

      const result = await service.getChains();
      expect(mockChainsTable.toArray).toHaveBeenCalled();
      expect(result).toEqual(mockChains);
    });

    it('should return undefined if database is not available', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      const result = await service.getChains();
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

    it('should import chains from CSV file successfully', async () => {
      const mockCsvData: RteChainsCsvFile[] = [
        {
          name: 'Chain 1',
          length: '100,5',
          weight: '2,3',
          surface: '100',
          v: 'false'
        },
        {
          name: 'Chain 2',
          length: '150,0',
          weight: '3,1',
          surface: '150',
          v: 'true'
        }
      ];

      const mockCsvContent =
        'name,length,weight\nChain 1,100,5,2,3\nChain 2,150,0,3,1';

      // Mock Papa Parse to call complete callback
      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteChainsCsvFile>) => {
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
        `${window.location.origin}/data/chains.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockChainsTable.clear).toHaveBeenCalled();
      expect(mockChainsTable.bulkAdd).toHaveBeenCalledWith([
        {
          name: 'Chain 1',
          length: 100.5,
          weight: 2.3,
          surface: 100,
          v: false
        },
        {
          name: 'Chain 2',
          length: 150.0,
          weight: 3.1,
          surface: 150,
          v: true
        }
      ]);
    });

    it('should handle empty CSV data', async () => {
      const mockCsvContent = 'name,length,weight\n';

      // Mock Papa Parse to call complete callback with empty data
      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteChainsCsvFile>) => {
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
        `${window.location.origin}/data/chains.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockChainsTable.clear).not.toHaveBeenCalled();
      expect(mockChainsTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should handle CSV data with null/undefined name', async () => {
      const mockCsvData: RteChainsCsvFile[] = [
        {
          name: '',
          length: '100,5',
          weight: '2,3',
          surface: '100',
          v: 'false'
        },
        {
          name: 'Chain 2',
          length: '150,0',
          weight: '3,1',
          surface: '150',
          v: 'true'
        }
      ];

      const mockCsvContent =
        'name,length,weight\n,100,5,2,3\nChain 2,150,0,3,1';

      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteChainsCsvFile>) => {
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
        `${window.location.origin}/data/chains.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add the chain with valid name
      expect(mockChainsTable.bulkAdd).toHaveBeenCalledWith([
        {
          name: 'Chain 2',
          length: 150.0,
          weight: 3.1,
          surface: 150,
          v: true
        }
      ]);
    });

    it('should handle missing database gracefully', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const mockCsvData: RteChainsCsvFile[] = [
        {
          name: 'Chain 1',
          length: '100,5',
          weight: '2,3',
          surface: '100',
          v: 'false'
        }
      ];

      const mockCsvContent = 'name,length,weight\nChain 1,100,5,2,3';

      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteChainsCsvFile>) => {
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
        `${window.location.origin}/data/chains.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      // Should not throw error
      await expect(importPromise).resolves.toBeUndefined();
    });

    it('should handle CSV data with mixed valid and invalid name values', async () => {
      const mockCsvData: RteChainsCsvFile[] = [
        {
          name: 'Chain 1',
          length: '100,5',
          weight: '2,3',
          surface: '100',
          v: 'false'
        },
        {
          name: '',
          length: '150,0',
          weight: '3,1',
          surface: '150',
          v: 'true'
        },
        {
          name: 'Chain 3',
          length: '200,0',
          weight: '4,2',
          surface: '200',
          v: 'false'
        }
      ];

      const mockCsvContent =
        'name,length,weight,surface,v\nChain 1,100,5,2,3,false\n,150,0,3,1,true\nChain 3,200,0,4,2,false';

      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteChainsCsvFile>) => {
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
        `${window.location.origin}/data/chains.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add chains with valid name
      expect(mockChainsTable.bulkAdd).toHaveBeenCalledWith([
        {
          name: 'Chain 1',
          length: 100.5,
          weight: 2.3,
          surface: 100,
          v: false
        },
        {
          name: 'Chain 3',
          length: 200.0,
          weight: 4.2,
          surface: 200,
          v: false
        }
      ]);
    });

    it('should clear chains table before adding new data', async () => {
      const mockCsvData: RteChainsCsvFile[] = [
        {
          name: 'Chain 1',
          length: '100,5',
          weight: '2,3',
          surface: '100',
          v: 'false'
        }
      ];

      const mockCsvContent = 'name,length,weight\nChain 1,100,5,2,3';

      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteChainsCsvFile>) => {
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
        `${window.location.origin}/data/chains.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Verify clear is called before bulkAdd
      expect(mockChainsTable.clear).toHaveBeenCalled();
      expect(mockChainsTable.bulkAdd).toHaveBeenCalled();
    });
  });
});
