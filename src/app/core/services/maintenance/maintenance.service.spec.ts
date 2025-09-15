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
import { MaintenanceService } from './maintenance.service';
import { StorageService } from '../storage/storage.service';
import {
  MaintenanceData,
  RteMaintenanceTeamsCsvFile
} from '../../data/database/interfaces/maintenance';
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
  maintenance: MockTable;
}

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let storageService: StorageService;
  let mockDb: MockDb;
  let mockMaintenanceTable: MockTable;

  beforeEach(() => {
    // Create mock database tables
    mockMaintenanceTable = {
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
      maintenance: mockMaintenanceTable
    };

    // Create spy for StorageService
    const storageServiceSpy = {
      ready$: new BehaviorSubject<boolean>(false),
      db: mockDb
    } as unknown as StorageService;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        MaintenanceService,
        { provide: StorageService, useValue: storageServiceSpy }
      ]
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
      const mockMaintenance: MaintenanceData[] = [
        {
          cm_id: 'CM001',
          cm_name: 'Maintenance Center 1',
          gmr_id: 'GMR001',
          gmr_name: 'Regional Center 1',
          eel_id: 'EEL001',
          eel_name: 'Team 1'
        },
        {
          cm_id: 'CM002',
          cm_name: 'Maintenance Center 2',
          gmr_id: 'GMR002',
          gmr_name: 'Regional Center 2',
          eel_id: 'EEL002',
          eel_name: 'Team 2'
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
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
      httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpTestingController.verify();
    });

    it('should import maintenance teams from CSV file successfully', async () => {
      const mockCsvData: RteMaintenanceTeamsCsvFile[] = [
        {
          CM_CUR: 'CM001',
          CM_DESIGNATION: 'Maintenance Center 1',
          GMR_CUR: 'GMR001',
          GMR_DESIGNATION: 'Regional Center 1',
          EEL_CUR: 'EEL001',
          EEL_DESIGNATION: 'Team 1'
        },
        {
          CM_CUR: 'CM002',
          CM_DESIGNATION: 'Maintenance Center 2',
          GMR_CUR: 'GMR002',
          GMR_DESIGNATION: 'Regional Center 2',
          EEL_CUR: 'EEL002',
          EEL_DESIGNATION: 'Team 2'
        }
      ];

      const mockCsvContent =
        'CM_CUR,CM_DESIGNATION,GMR_CUR,GMR_DESIGNATION,EEL_CUR,EEL_DESIGNATION\nCM001,Maintenance Center 1,GMR001,Regional Center 1,EEL001,Team 1\nCM002,Maintenance Center 2,GMR002,Regional Center 2,EEL002,Team 2';

      // Mock Papa Parse to call complete callback
      (Papa.parse as jest.Mock).mockImplementation(
        (
          data: string,
          options: Papa.ParseConfig<RteMaintenanceTeamsCsvFile>
        ) => {
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
        `${window.location.origin}/maintenance-teams.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockMaintenanceTable.clear).toHaveBeenCalled();
      expect(mockMaintenanceTable.bulkAdd).toHaveBeenCalledWith([
        {
          cm_id: 'CM001',
          cm_name: 'Maintenance Center 1',
          gmr_id: 'GMR001',
          gmr_name: 'Regional Center 1',
          eel_id: 'EEL001',
          eel_name: 'Team 1'
        },
        {
          cm_id: 'CM002',
          cm_name: 'Maintenance Center 2',
          gmr_id: 'GMR002',
          gmr_name: 'Regional Center 2',
          eel_id: 'EEL002',
          eel_name: 'Team 2'
        }
      ]);
    });

    it('should handle empty CSV data', async () => {
      const mockCsvContent =
        'CM_CUR,CM_DESIGNATION,GMR_CUR,GMR_DESIGNATION,EEL_CUR,EEL_DESIGNATION\n';

      // Mock Papa Parse to call complete callback with empty data
      (Papa.parse as jest.Mock).mockImplementation(
        (
          data: string,
          options: Papa.ParseConfig<RteMaintenanceTeamsCsvFile>
        ) => {
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
        `${window.location.origin}/maintenance-teams.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockMaintenanceTable.clear).not.toHaveBeenCalled();
      expect(mockMaintenanceTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should handle CSV data with null/undefined EEL_CUR', async () => {
      const mockCsvData: RteMaintenanceTeamsCsvFile[] = [
        {
          CM_CUR: 'CM001',
          CM_DESIGNATION: 'Maintenance Center 1',
          GMR_CUR: 'GMR001',
          GMR_DESIGNATION: 'Regional Center 1',
          EEL_CUR: '',
          EEL_DESIGNATION: 'Team 1'
        },
        {
          CM_CUR: 'CM002',
          CM_DESIGNATION: 'Maintenance Center 2',
          GMR_CUR: 'GMR002',
          GMR_DESIGNATION: 'Regional Center 2',
          EEL_CUR: 'EEL002',
          EEL_DESIGNATION: 'Team 2'
        }
      ];

      const mockCsvContent =
        'CM_CUR,CM_DESIGNATION,GMR_CUR,GMR_DESIGNATION,EEL_CUR,EEL_DESIGNATION\nCM001,Maintenance Center 1,GMR001,Regional Center 1,,Team 1\nCM002,Maintenance Center 2,GMR002,Regional Center 2,EEL002,Team 2';

      (Papa.parse as jest.Mock).mockImplementation(
        (
          data: string,
          options: Papa.ParseConfig<RteMaintenanceTeamsCsvFile>
        ) => {
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
        `${window.location.origin}/maintenance-teams.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add the maintenance team with valid EEL_CUR
      expect(mockMaintenanceTable.bulkAdd).toHaveBeenCalledWith([
        {
          cm_id: 'CM002',
          cm_name: 'Maintenance Center 2',
          gmr_id: 'GMR002',
          gmr_name: 'Regional Center 2',
          eel_id: 'EEL002',
          eel_name: 'Team 2'
        }
      ]);
    });

    it('should handle missing database gracefully', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const mockCsvData: RteMaintenanceTeamsCsvFile[] = [
        {
          CM_CUR: 'CM001',
          CM_DESIGNATION: 'Maintenance Center 1',
          GMR_CUR: 'GMR001',
          GMR_DESIGNATION: 'Regional Center 1',
          EEL_CUR: 'EEL001',
          EEL_DESIGNATION: 'Team 1'
        }
      ];

      const mockCsvContent =
        'CM_CUR,CM_DESIGNATION,GMR_CUR,GMR_DESIGNATION,EEL_CUR,EEL_DESIGNATION\nCM001,Maintenance Center 1,GMR001,Regional Center 1,EEL001,Team 1';

      (Papa.parse as jest.Mock).mockImplementation(
        (
          data: string,
          options: Papa.ParseConfig<RteMaintenanceTeamsCsvFile>
        ) => {
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
        `${window.location.origin}/maintenance-teams.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      // Should not throw error
      await expect(importPromise).resolves.toBeUndefined();
    });

    it('should handle CSV data with mixed valid and invalid EEL_CUR values', async () => {
      const mockCsvData: RteMaintenanceTeamsCsvFile[] = [
        {
          CM_CUR: 'CM001',
          CM_DESIGNATION: 'Maintenance Center 1',
          GMR_CUR: 'GMR001',
          GMR_DESIGNATION: 'Regional Center 1',
          EEL_CUR: 'EEL001',
          EEL_DESIGNATION: 'Team 1'
        },
        {
          CM_CUR: 'CM002',
          CM_DESIGNATION: 'Maintenance Center 2',
          GMR_CUR: 'GMR002',
          GMR_DESIGNATION: 'Regional Center 2',
          EEL_CUR: '',
          EEL_DESIGNATION: 'Team 2'
        },
        {
          CM_CUR: 'CM003',
          CM_DESIGNATION: 'Maintenance Center 3',
          GMR_CUR: 'GMR003',
          GMR_DESIGNATION: 'Regional Center 3',
          EEL_CUR: 'EEL003',
          EEL_DESIGNATION: 'Team 3'
        }
      ];

      const mockCsvContent =
        'CM_CUR,CM_DESIGNATION,GMR_CUR,GMR_DESIGNATION,EEL_CUR,EEL_DESIGNATION\nCM001,Maintenance Center 1,GMR001,Regional Center 1,EEL001,Team 1\nCM002,Maintenance Center 2,GMR002,Regional Center 2,,Team 2\nCM003,Maintenance Center 3,GMR003,Regional Center 3,EEL003,Team 3';

      (Papa.parse as jest.Mock).mockImplementation(
        (
          data: string,
          options: Papa.ParseConfig<RteMaintenanceTeamsCsvFile>
        ) => {
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
        `${window.location.origin}/maintenance-teams.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add maintenance teams with valid EEL_CUR
      expect(mockMaintenanceTable.bulkAdd).toHaveBeenCalledWith([
        {
          cm_id: 'CM001',
          cm_name: 'Maintenance Center 1',
          gmr_id: 'GMR001',
          gmr_name: 'Regional Center 1',
          eel_id: 'EEL001',
          eel_name: 'Team 1'
        },
        {
          cm_id: 'CM003',
          cm_name: 'Maintenance Center 3',
          gmr_id: 'GMR003',
          gmr_name: 'Regional Center 3',
          eel_id: 'EEL003',
          eel_name: 'Team 3'
        }
      ]);
    });

    it('should clear maintenance table before adding new data', async () => {
      const mockCsvData: RteMaintenanceTeamsCsvFile[] = [
        {
          CM_CUR: 'CM001',
          CM_DESIGNATION: 'Maintenance Center 1',
          GMR_CUR: 'GMR001',
          GMR_DESIGNATION: 'Regional Center 1',
          EEL_CUR: 'EEL001',
          EEL_DESIGNATION: 'Team 1'
        }
      ];

      const mockCsvContent =
        'CM_CUR,CM_DESIGNATION,GMR_CUR,GMR_DESIGNATION,EEL_CUR,EEL_DESIGNATION\nCM001,Maintenance Center 1,GMR001,Regional Center 1,EEL001,Team 1';

      (Papa.parse as jest.Mock).mockImplementation(
        (
          data: string,
          options: Papa.ParseConfig<RteMaintenanceTeamsCsvFile>
        ) => {
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
        `${window.location.origin}/maintenance-teams.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Verify clear is called before bulkAdd
      expect(mockMaintenanceTable.clear).toHaveBeenCalled();
      expect(mockMaintenanceTable.bulkAdd).toHaveBeenCalled();
    });
  });
});
