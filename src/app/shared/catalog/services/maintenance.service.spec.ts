/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';

import { BehaviorSubject } from 'rxjs';
import { MaintenanceService } from './maintenance.service';
import { StorageService } from '@services/storage/storage.service';
import { CatalogMaintenanceEntity } from '@infrastructure/database';
import { MaintenanceCsvDto } from '@infrastructure/dto';
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
  catMaintenance: MockTable;
}

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let storageService: StorageService;
  let mockDb: MockDb;
  let mockMaintenanceTable: MockTable;

  beforeEach(() => {
    // Create mock database tables
    mockMaintenanceTable = {
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
      catMaintenance: mockMaintenanceTable
    };

    // Create spy for StorageService
    const storageServiceSpy = {
      ready$: new BehaviorSubject<boolean>(false),
      db: mockDb
    } as unknown as StorageService;

    TestBed.configureTestingModule({
      providers: [MaintenanceService, { provide: StorageService, useValue: storageServiceSpy }]
    });

    service = TestBed.inject(MaintenanceService);
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

  describe('getMaintenance', () => {
    it('should return maintenance array from database', async () => {
      const mockMaintenance: CatalogMaintenanceEntity[] = [
        {
          maintenance_center: 'Maintenance Center 1',
          maintenance_center_id: 'CM001',
          regional_team: 'Regional Center 1',
          regional_team_id: 'GMR001',
          maintenance_team: 'Team 1',
          maintenance_team_id: 'EEL001'
        },
        {
          maintenance_center: 'Maintenance Center 2',
          maintenance_center_id: 'CM002',
          regional_team: 'Regional Center 2',
          regional_team_id: 'GMR002',
          maintenance_team: 'Team 2',
          maintenance_team_id: 'EEL002'
        }
      ];
      mockMaintenanceTable.toArray.mockResolvedValue(mockMaintenance);

      const result = await service.getMaintenance();
      expect(mockMaintenanceTable.toArray).toHaveBeenCalled();
      expect(result).toEqual(mockMaintenance);
    });

    it('should return undefined if database is not available', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      const result = await service.getMaintenance();
      expect(result).toBeUndefined();
    });
  });

  describe('importFromFile', () => {
    it('should import maintenance teams from CSV file successfully', async () => {
      const mockCsvData: MaintenanceCsvDto[] = [
        {
          maintenance_center_id: 'CM001',
          maintenance_center: 'Maintenance Center 1',
          regional_team_id: 'GMR001',
          regional_team: 'Regional Center 1',
          maintenance_team_id: 'EEL001',
          maintenance_team: 'Team 1'
        },
        {
          maintenance_center_id: 'CM002',
          maintenance_center: 'Maintenance Center 2',
          regional_team_id: 'GMR002',
          regional_team: 'Regional Center 2',
          maintenance_team_id: 'EEL002',
          maintenance_team: 'Team 2'
        }
      ];

      // Mock Papa Parse to call complete callback
      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<MaintenanceCsvDto>) => {
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

      expect(mockMaintenanceTable.clear).toHaveBeenCalled();
      expect(mockMaintenanceTable.bulkAdd).toHaveBeenCalledWith([
        {
          maintenance_center_id: 'CM001',
          maintenance_center: 'Maintenance Center 1',
          regional_team_id: 'GMR001',
          regional_team: 'Regional Center 1',
          maintenance_team_id: 'EEL001',
          maintenance_team: 'Team 1'
        },
        {
          maintenance_center_id: 'CM002',
          maintenance_center: 'Maintenance Center 2',
          regional_team_id: 'GMR002',
          regional_team: 'Regional Center 2',
          maintenance_team_id: 'EEL002',
          maintenance_team: 'Team 2'
        }
      ]);
    });

    it('should handle empty CSV data', async () => {
      // Mock Papa Parse to call complete callback with empty data
      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<MaintenanceCsvDto>) => {
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

      expect(mockMaintenanceTable.clear).not.toHaveBeenCalled();
      expect(mockMaintenanceTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should handle CSV data with null/undefined EEL_CUR', async () => {
      const mockCsvData: MaintenanceCsvDto[] = [
        {
          maintenance_center_id: 'CM001',
          maintenance_center: 'Maintenance Center 1',
          regional_team_id: 'GMR001',
          regional_team: 'Regional Center 1',
          maintenance_team_id: '',
          maintenance_team: 'Team 1'
        },
        {
          maintenance_center_id: 'CM002',
          maintenance_center: 'Maintenance Center 2',
          regional_team_id: 'GMR002',
          regional_team: 'Regional Center 2',
          maintenance_team_id: 'EEL002',
          maintenance_team: 'Team 2'
        }
      ];

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<MaintenanceCsvDto>) => {
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

      // Should only add the maintenance team with valid maintenance_team_id
      expect(mockMaintenanceTable.bulkAdd).toHaveBeenCalledWith([
        {
          maintenance_center_id: 'CM002',
          maintenance_center: 'Maintenance Center 2',
          regional_team_id: 'GMR002',
          regional_team: 'Regional Center 2',
          maintenance_team_id: 'EEL002',
          maintenance_team: 'Team 2'
        }
      ]);
    });

    it('should handle missing database gracefully', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const mockCsvData: MaintenanceCsvDto[] = [
        {
          maintenance_center_id: 'CM001',
          maintenance_center: 'Maintenance Center 1',
          regional_team_id: 'GMR001',
          regional_team: 'Regional Center 1',
          maintenance_team_id: 'EEL001',
          maintenance_team: 'Team 1'
        }
      ];

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<MaintenanceCsvDto>) => {
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

    it('should handle CSV data with mixed valid and invalid EEL_CUR values', async () => {
      const mockCsvData: MaintenanceCsvDto[] = [
        {
          maintenance_center_id: 'CM001',
          maintenance_center: 'Maintenance Center 1',
          regional_team_id: 'GMR001',
          regional_team: 'Regional Center 1',
          maintenance_team_id: 'EEL001',
          maintenance_team: 'Team 1'
        },
        {
          maintenance_center_id: 'CM002',
          maintenance_center: 'Maintenance Center 2',
          regional_team_id: 'GMR002',
          regional_team: 'Regional Center 2',
          maintenance_team_id: '',
          maintenance_team: 'Team 2'
        },
        {
          maintenance_center_id: 'CM003',
          maintenance_center: 'Maintenance Center 3',
          regional_team_id: 'GMR003',
          regional_team: 'Regional Center 3',
          maintenance_team_id: 'EEL003',
          maintenance_team: 'Team 3'
        }
      ];

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<MaintenanceCsvDto>) => {
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

      // Should only add maintenance teams with valid maintenance_team_id
      expect(mockMaintenanceTable.bulkAdd).toHaveBeenCalledWith([
        {
          maintenance_center_id: 'CM001',
          maintenance_center: 'Maintenance Center 1',
          regional_team_id: 'GMR001',
          regional_team: 'Regional Center 1',
          maintenance_team_id: 'EEL001',
          maintenance_team: 'Team 1'
        },
        {
          maintenance_center_id: 'CM003',
          maintenance_center: 'Maintenance Center 3',
          regional_team_id: 'GMR003',
          regional_team: 'Regional Center 3',
          maintenance_team_id: 'EEL003',
          maintenance_team: 'Team 3'
        }
      ]);
    });

    it('should clear maintenance table before adding new data', async () => {
      const mockCsvData: MaintenanceCsvDto[] = [
        {
          maintenance_center_id: 'CM001',
          maintenance_center: 'Maintenance Center 1',
          regional_team_id: 'GMR001',
          regional_team: 'Regional Center 1',
          maintenance_team_id: 'EEL001',
          maintenance_team: 'Team 1'
        }
      ];

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<MaintenanceCsvDto>) => {
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
      expect(mockMaintenanceTable.clear).toHaveBeenCalled();
      expect(mockMaintenanceTable.bulkAdd).toHaveBeenCalled();
    });

    it('should call Papa.parse with download:true, worker:true and the maintenance-teams URL', async () => {
      vi.mocked(Papa.parse).mockImplementation((_url: string, options: Papa.ParseConfig<MaintenanceCsvDto>) => {
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
        expect.stringContaining('/data/maintenance-teams.csv'),
        expect.objectContaining({ download: true, worker: true })
      );
    });

    it('should not store data when Papa.parse calls error callback', async () => {
      vi.mocked(Papa.parse).mockImplementation((_url: string, options: Papa.ParseConfig<MaintenanceCsvDto>) => {
        if (options.error) {
          options.error(new Error('Network error') as Papa.ParseError, undefined!);
        }
      });

      await service.importFromFile();

      expect(mockMaintenanceTable.clear).not.toHaveBeenCalled();
      expect(mockMaintenanceTable.bulkAdd).not.toHaveBeenCalled();
    });
  });
});
