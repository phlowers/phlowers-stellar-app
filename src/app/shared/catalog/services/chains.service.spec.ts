/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';

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
      providers: [ChainsService, { provide: StorageService, useValue: storageServiceSpy }]
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

      // Mock Papa Parse to call complete callback
      vi.mocked(Papa.parse).mockImplementation((_url: string, options: Papa.ParseConfig<ChainCsvDto>) => {
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
      // Mock Papa Parse to call complete callback with empty data
      vi.mocked(Papa.parse).mockImplementation((_url: string, options: Papa.ParseConfig<ChainCsvDto>) => {
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

      vi.mocked(Papa.parse).mockImplementation((_url: string, options: Papa.ParseConfig<ChainCsvDto>) => {
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

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<ChainCsvDto>) => {
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

      vi.mocked(Papa.parse).mockImplementation((_url: string, options: Papa.ParseConfig<ChainCsvDto>) => {
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

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<ChainCsvDto>) => {
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
      expect(mockChainsTable.clear).toHaveBeenCalled();
      expect(mockChainsTable.bulkAdd).toHaveBeenCalled();
    });

    it('should call Papa.parse with download:true, worker:true and the chains URL', async () => {
      vi.mocked(Papa.parse).mockImplementation((_url: string, options: Papa.ParseConfig<ChainCsvDto>) => {
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
        expect.stringContaining('/data/chains.csv'),
        expect.objectContaining({ download: true, worker: true })
      );
    });

    it('should not store data when Papa.parse calls error callback', async () => {
      vi.mocked(Papa.parse).mockImplementation((_url: string, options: Papa.ParseConfig<ChainCsvDto>) => {
        if (options.error) {
          options.error(new Error('Network error') as Papa.ParseError, undefined!);
        }
      });

      await service.importFromFile();

      expect(mockChainsTable.clear).not.toHaveBeenCalled();
      expect(mockChainsTable.bulkAdd).not.toHaveBeenCalled();
    });
  });
});
