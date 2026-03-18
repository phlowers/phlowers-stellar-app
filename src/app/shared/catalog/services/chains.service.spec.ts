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
import { ChainsService } from './chains.service';
import { StorageService } from '@services/storage/storage.service';
import { CatalogChainEntity } from '@infrastructure/database';
import { ChainCsvDto } from '@infrastructure/dto';
import Papa from 'papaparse';

// Mock Papa Parse
vi.mock('papaparse', () => ({
  __esModule: true,
  default: {
    parse: vi.fn()
  },
  parse: vi.fn()
}));

interface MockTable {
  count: vi.Mock;
  toArray: vi.Mock;
  bulkAdd: vi.Mock;
  clear?: vi.Mock;
}

interface MockDb {
  catLines: MockTable;
  catChains: MockTable;
}

describe('ChainsService', () => {
  let service: ChainsService;
  let storageService: StorageService;
  let mockDb: MockDb;
  let mockChainsTable: MockTable;

  beforeEach(() => {
    // Create mock database tables
    mockChainsTable = {
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
      catChains: mockChainsTable
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
      const mockChains: CatalogChainEntity[] = [
        {
          chain_name: 'Chain 1',
          mean_length: 100.5,
          mean_mass: 2.3,
          chain_surface: 100,
          v_chain: false,
          chain_type: 'type1',
          uuid: 'uuid1'
        },
        {
          chain_name: 'Chain 2',
          mean_length: 150.0,
          mean_mass: 3.1,
          chain_surface: 150,
          v_chain: true,
          chain_type: 'type2',
          uuid: 'uuid2'
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
      const mockCsvData: ChainCsvDto[] = [
        {
          chain_name: 'Chain 1',
          mean_length: '100,5',
          mean_mass: '2,3',
          chain_surface: '100',
          v_chain: 'false',
          chain_type: 'type1',
          uuid: 'uuid1'
        },
        {
          chain_name: 'Chain 2',
          mean_length: '150,0',
          mean_mass: '3,1',
          chain_surface: '150',
          v_chain: 'true',
          chain_type: 'type2',
          uuid: 'uuid2'
        }
      ];

      const mockCsvContent = 'name,length,weight\nChain 1,100,5,2,3\nChain 2,150,0,3,1';

      // Mock Papa Parse to call complete callback
      (Papa.parse as vi.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ChainCsvDto>) => {
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
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/chains.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockChainsTable.clear).toHaveBeenCalled();
      expect(mockChainsTable.bulkAdd).toHaveBeenCalledWith([
        {
          chain_name: 'Chain 1',
          mean_length: 100.5,
          mean_mass: 2.3,
          chain_surface: 100,
          v_chain: false,
          chain_type: 'type1',
          uuid: 'uuid1'
        },
        {
          chain_name: 'Chain 2',
          mean_length: 150.0,
          mean_mass: 3.1,
          chain_surface: 150,
          v_chain: true,
          chain_type: 'type2',
          uuid: 'uuid2'
        }
      ]);
    });

    it('should handle empty CSV data', async () => {
      const mockCsvContent = 'name,length,weight\n';

      // Mock Papa Parse to call complete callback with empty data
      (Papa.parse as vi.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ChainCsvDto>) => {
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
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/chains.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockChainsTable.clear).not.toHaveBeenCalled();
      expect(mockChainsTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should handle CSV data with null/undefined name', async () => {
      const mockCsvData: ChainCsvDto[] = [
        {
          chain_name: '',
          mean_length: '100,5',
          mean_mass: '2,3',
          chain_surface: '100',
          v_chain: 'false',
          chain_type: 'type1',
          uuid: 'uuid1'
        },
        {
          chain_name: 'Chain 2',
          mean_length: '150,0',
          mean_mass: '3,1',
          chain_surface: '150',
          v_chain: 'true',
          chain_type: 'type2',
          uuid: 'uuid2'
        }
      ];

      const mockCsvContent = 'name,length,weight\n,100,5,2,3\nChain 2,150,0,3,1';

      (Papa.parse as vi.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ChainCsvDto>) => {
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
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/chains.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add the chain with valid name
      expect(mockChainsTable.bulkAdd).toHaveBeenCalledWith([
        {
          chain_name: 'Chain 2',
          mean_length: 150.0,
          mean_mass: 3.1,
          chain_surface: 150,
          v_chain: true,
          chain_type: 'type2',
          uuid: 'uuid2'
        }
      ]);
    });

    it('should handle missing database gracefully', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const mockCsvData: ChainCsvDto[] = [
        {
          chain_name: 'Chain 1',
          mean_length: '100,5',
          mean_mass: '2,3',
          chain_surface: '100',
          v_chain: 'false',
          chain_type: 'type1',
          uuid: 'uuid1'
        }
      ];

      const mockCsvContent = 'name,length,weight\nChain 1,100,5,2,3';

      (Papa.parse as vi.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ChainCsvDto>) => {
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
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/chains.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      // Should not throw error
      await expect(importPromise).resolves.toBeUndefined();
    });

    it('should handle CSV data with mixed valid and invalid name values', async () => {
      const mockCsvData: ChainCsvDto[] = [
        {
          chain_name: 'Chain 1',
          mean_length: '100,5',
          mean_mass: '2,3',
          chain_surface: '100',
          v_chain: 'false',
          chain_type: 'type1',
          uuid: 'uuid1'
        },
        {
          chain_name: '',
          mean_length: '150,0',
          mean_mass: '3,1',
          chain_surface: '150',
          v_chain: 'true',
          chain_type: 'type2',
          uuid: 'uuid2'
        },
        {
          chain_name: 'Chain 3',
          mean_length: '200,0',
          mean_mass: '4,2',
          chain_surface: '200',
          v_chain: 'false',
          chain_type: 'type3',
          uuid: 'uuid3'
        }
      ];

      const mockCsvContent =
        'name,length,weight,surface,v\nChain 1,100,5,2,3,false\n,150,0,3,1,true\nChain 3,200,0,4,2,false';

      (Papa.parse as vi.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ChainCsvDto>) => {
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
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/chains.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add chains with valid name
      expect(mockChainsTable.bulkAdd).toHaveBeenCalledWith([
        {
          chain_name: 'Chain 1',
          mean_length: 100.5,
          mean_mass: 2.3,
          chain_surface: 100,
          v_chain: false,
          chain_type: 'type1',
          uuid: 'uuid1'
        },
        {
          chain_name: 'Chain 3',
          mean_length: 200.0,
          mean_mass: 4.2,
          chain_surface: 200,
          v_chain: false,
          chain_type: 'type3',
          uuid: 'uuid3'
        }
      ]);
    });

    it('should clear chains table before adding new data', async () => {
      const mockCsvData: ChainCsvDto[] = [
        {
          chain_name: 'Chain 1',
          mean_length: '100,5',
          mean_mass: '2,3',
          chain_surface: '100',
          v_chain: 'false',
          chain_type: 'type1',
          uuid: 'uuid1'
        }
      ];

      const mockCsvContent = 'name,length,weight\nChain 1,100,5,2,3';

      (Papa.parse as vi.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ChainCsvDto>) => {
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
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/chains.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Verify clear is called before bulkAdd
      expect(mockChainsTable.clear).toHaveBeenCalled();
      expect(mockChainsTable.bulkAdd).toHaveBeenCalled();
    });
  });
});
