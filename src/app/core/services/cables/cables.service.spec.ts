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
import { CablesService } from './cables.service';
import { StorageService } from '../storage/storage.service';
import { Cable, RteCablesCsvFile } from '../../data/database/interfaces/cable';
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
  cables: MockTable;
}

describe('CablesService', () => {
  let service: CablesService;
  let storageService: StorageService;
  let mockDb: MockDb;
  let mockCablesTable: MockTable;

  beforeEach(() => {
    // Create mock database tables
    mockCablesTable = {
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
      cables: mockCablesTable
    };

    // Create spy for StorageService
    const storageServiceSpy = {
      ready$: new BehaviorSubject<boolean>(false),
      db: mockDb
    } as unknown as StorageService;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CablesService,
        { provide: StorageService, useValue: storageServiceSpy }
      ]
    });

    service = TestBed.inject(CablesService);
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

  describe('getCables', () => {
    it('should return cables array from database', async () => {
      const mockCables: Cable[] = [
        {
          name: 'Cable 1',
          data_source: 'RTE',
          section: 100,
          diameter: 10.5,
          young_modulus: 200000,
          linear_mass: 0.5,
          dilatation_coefficient: 0.000012,
          temperature_reference: 20,
          stress_strain_a0: 1.0,
          stress_strain_a1: 0.1,
          stress_strain_a2: 0.01,
          stress_strain_a3: 0.001,
          stress_strain_a4: 0.0001,
          stress_strain_b0: 0.5,
          stress_strain_b1: 0.05,
          stress_strain_b2: 0.005,
          stress_strain_b3: 0.0005,
          stress_strain_b4: 0.00005,
          is_narcisse: false
        },
        {
          name: 'Cable 2',
          data_source: 'RTE',
          section: 150,
          diameter: 12.0,
          young_modulus: 180000,
          linear_mass: 0.6,
          dilatation_coefficient: 0.000011,
          temperature_reference: 20,
          stress_strain_a0: 1.1,
          stress_strain_a1: 0.11,
          stress_strain_a2: 0.011,
          stress_strain_a3: 0.0011,
          stress_strain_a4: 0.00011,
          stress_strain_b0: 0.55,
          stress_strain_b1: 0.055,
          stress_strain_b2: 0.0055,
          stress_strain_b3: 0.00055,
          stress_strain_b4: 0.000055,
          is_narcisse: false
        }
      ];
      mockCablesTable.toArray.mockResolvedValue(mockCables);

      const result = await service.getCables();
      expect(mockCablesTable.toArray).toHaveBeenCalled();
      expect(result).toEqual(mockCables);
    });

    it('should return undefined if database is not available', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      const result = await service.getCables();
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

    it('should import cables from CSV file successfully', async () => {
      const mockCsvData: RteCablesCsvFile[] = [
        {
          name: 'Cable 1',
          data_source: 'RTE',
          section: '100',
          diameter: '10.5',
          young_modulus: '200000',
          linear_mass: '0.5',
          dilatation_coefficient: '0.000012',
          temperature_reference: '20',
          stress_strain_a0: '1.0',
          stress_strain_a1: '0.1',
          stress_strain_a2: '0.01',
          stress_strain_a3: '0.001',
          stress_strain_a4: '0.0001',
          stress_strain_b0: '0.5',
          stress_strain_b1: '0.05',
          stress_strain_b2: '0.005',
          stress_strain_b3: '0.0005',
          stress_strain_b4: '0.00005',
          is_narcisse: 'false'
        },
        {
          name: 'Cable 2',
          data_source: 'RTE',
          section: '150',
          diameter: '12.0',
          young_modulus: '180000',
          linear_mass: '0.6',
          dilatation_coefficient: '0.000011',
          temperature_reference: '20',
          stress_strain_a0: '1.1',
          stress_strain_a1: '0.11',
          stress_strain_a2: '0.011',
          stress_strain_a3: '0.0011',
          stress_strain_a4: '0.00011',
          stress_strain_b0: '0.55',
          stress_strain_b1: '0.055',
          stress_strain_b2: '0.0055',
          stress_strain_b3: '0.00055',
          stress_strain_b4: '0.000055',
          is_narcisse: 'false'
        }
      ];

      const mockCsvContent =
        'name,data_source,section,diameter,young_modulus,linear_mass,dilatation_coefficient,temperature_reference,stress_strain_a0,stress_strain_a1,stress_strain_a2,stress_strain_a3,stress_strain_a4,stress_strain_b0,stress_strain_b1,stress_strain_b2,stress_strain_b3,stress_strain_b4\nCable 1,RTE,100,10.5,200000,0.5,0.000012,20,1.0,0.1,0.01,0.001,0.0001,0.5,0.05,0.005,0.0005,0.00005\nCable 2,RTE,150,12.0,180000,0.6,0.000011,20,1.1,0.11,0.011,0.0011,0.00011,0.55,0.055,0.0055,0.00055,0.000055';

      // Mock Papa Parse to call complete callback
      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteCablesCsvFile>) => {
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
        `${window.location.origin}/data/cables.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockCablesTable.clear).toHaveBeenCalled();
      expect(mockCablesTable.bulkAdd).toHaveBeenCalledWith([
        {
          name: 'Cable 1',
          data_source: 'RTE',
          section: 100,
          diameter: 10.5,
          young_modulus: 200000,
          linear_mass: 0.5,
          dilatation_coefficient: 0.000012,
          temperature_reference: 20,
          stress_strain_a0: 1.0,
          stress_strain_a1: 0.1,
          stress_strain_a2: 0.01,
          stress_strain_a3: 0.001,
          stress_strain_a4: 0.0001,
          stress_strain_b0: 0.5,
          stress_strain_b1: 0.05,
          stress_strain_b2: 0.005,
          stress_strain_b3: 0.0005,
          stress_strain_b4: 0.00005,
          is_narcisse: false
        },
        {
          name: 'Cable 2',
          data_source: 'RTE',
          section: 150,
          diameter: 12.0,
          young_modulus: 180000,
          linear_mass: 0.6,
          dilatation_coefficient: 0.000011,
          temperature_reference: 20,
          stress_strain_a0: 1.1,
          stress_strain_a1: 0.11,
          stress_strain_a2: 0.011,
          stress_strain_a3: 0.0011,
          stress_strain_a4: 0.00011,
          stress_strain_b0: 0.55,
          stress_strain_b1: 0.055,
          stress_strain_b2: 0.0055,
          stress_strain_b3: 0.00055,
          stress_strain_b4: 0.000055,
          is_narcisse: false
        }
      ]);
    });

    it('should handle empty CSV data', async () => {
      const mockCsvContent =
        'name,data_source,section,diameter,young_modulus,linear_mass,dilatation_coefficient,temperature_reference,stress_strain_a0,stress_strain_a1,stress_strain_a2,stress_strain_a3,stress_strain_a4,stress_strain_b0,stress_strain_b1,stress_strain_b2,stress_strain_b3,stress_strain_b4\n';

      // Mock Papa Parse to call complete callback with empty data
      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteCablesCsvFile>) => {
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
        `${window.location.origin}/data/cables.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockCablesTable.clear).not.toHaveBeenCalled();
      expect(mockCablesTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should handle CSV data with null/undefined name', async () => {
      const mockCsvData: RteCablesCsvFile[] = [
        {
          name: '',
          data_source: 'RTE',
          section: '100',
          diameter: '10.5',
          young_modulus: '200000',
          linear_mass: '0.5',
          dilatation_coefficient: '0.000012',
          temperature_reference: '20',
          stress_strain_a0: '1.0',
          stress_strain_a1: '0.1',
          stress_strain_a2: '0.01',
          stress_strain_a3: '0.001',
          stress_strain_a4: '0.0001',
          stress_strain_b0: '0.5',
          stress_strain_b1: '0.05',
          stress_strain_b2: '0.005',
          stress_strain_b3: '0.0005',
          stress_strain_b4: '0.00005',
          is_narcisse: 'false'
        },
        {
          name: 'Cable 2',
          data_source: 'RTE',
          section: '150',
          diameter: '12.0',
          young_modulus: '180000',
          linear_mass: '0.6',
          dilatation_coefficient: '0.000011',
          temperature_reference: '20',
          stress_strain_a0: '1.1',
          stress_strain_a1: '0.11',
          stress_strain_a2: '0.011',
          stress_strain_a3: '0.0011',
          stress_strain_a4: '0.00011',
          stress_strain_b0: '0.55',
          stress_strain_b1: '0.055',
          stress_strain_b2: '0.0055',
          stress_strain_b3: '0.00055',
          stress_strain_b4: '0.000055',
          is_narcisse: 'false'
        }
      ];

      const mockCsvContent =
        'name,data_source,section,diameter,young_modulus,linear_mass,dilatation_coefficient,temperature_reference,stress_strain_a0,stress_strain_a1,stress_strain_a2,stress_strain_a3,stress_strain_a4,stress_strain_b0,stress_strain_b1,stress_strain_b2,stress_strain_b3,stress_strain_b4\n,RTE,100,10.5,200000,0.5,0.000012,20,1.0,0.1,0.01,0.001,0.0001,0.5,0.05,0.005,0.0005,0.00005\nCable 2,RTE,150,12.0,180000,0.6,0.000011,20,1.1,0.11,0.011,0.0011,0.00011,0.55,0.055,0.0055,0.00055,0.000055';

      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteCablesCsvFile>) => {
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
        `${window.location.origin}/data/cables.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add the cable with valid name
      expect(mockCablesTable.bulkAdd).toHaveBeenCalledWith([
        {
          name: 'Cable 2',
          data_source: 'RTE',
          section: 150,
          diameter: 12.0,
          young_modulus: 180000,
          linear_mass: 0.6,
          dilatation_coefficient: 0.000011,
          temperature_reference: 20,
          stress_strain_a0: 1.1,
          stress_strain_a1: 0.11,
          stress_strain_a2: 0.011,
          stress_strain_a3: 0.0011,
          stress_strain_a4: 0.00011,
          stress_strain_b0: 0.55,
          stress_strain_b1: 0.055,
          stress_strain_b2: 0.0055,
          stress_strain_b3: 0.00055,
          stress_strain_b4: 0.000055,
          is_narcisse: false
        }
      ]);
    });

    it('should handle missing database gracefully', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const mockCsvData: RteCablesCsvFile[] = [
        {
          name: 'Cable 1',
          data_source: 'RTE',
          section: '100',
          diameter: '10.5',
          young_modulus: '200000',
          linear_mass: '0.5',
          dilatation_coefficient: '0.000012',
          temperature_reference: '20',
          stress_strain_a0: '1.0',
          stress_strain_a1: '0.1',
          stress_strain_a2: '0.01',
          stress_strain_a3: '0.001',
          stress_strain_a4: '0.0001',
          stress_strain_b0: '0.5',
          stress_strain_b1: '0.05',
          stress_strain_b2: '0.005',
          stress_strain_b3: '0.0005',
          stress_strain_b4: '0.00005',
          is_narcisse: 'false'
        }
      ];

      const mockCsvContent =
        'name,data_source,section,diameter,young_modulus,linear_mass,dilatation_coefficient,temperature_reference,stress_strain_a0,stress_strain_a1,stress_strain_a2,stress_strain_a3,stress_strain_a4,stress_strain_b0,stress_strain_b1,stress_strain_b2,stress_strain_b3,stress_strain_b4\nCable 1,RTE,100,10.5,200000,0.5,0.000012,20,1.0,0.1,0.01,0.001,0.0001,0.5,0.05,0.005,0.0005,0.00005';

      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteCablesCsvFile>) => {
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
        `${window.location.origin}/data/cables.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      // Should not throw error
      await expect(importPromise).resolves.toBeUndefined();
    });

    it('should handle CSV data with mixed valid and invalid name values', async () => {
      const mockCsvData: RteCablesCsvFile[] = [
        {
          name: 'Cable 1',
          data_source: 'RTE',
          section: '100',
          diameter: '10.5',
          young_modulus: '200000',
          linear_mass: '0.5',
          dilatation_coefficient: '0.000012',
          temperature_reference: '20',
          stress_strain_a0: '1.0',
          stress_strain_a1: '0.1',
          stress_strain_a2: '0.01',
          stress_strain_a3: '0.001',
          stress_strain_a4: '0.0001',
          stress_strain_b0: '0.5',
          stress_strain_b1: '0.05',
          stress_strain_b2: '0.005',
          stress_strain_b3: '0.0005',
          stress_strain_b4: '0.00005',
          is_narcisse: 'false'
        },
        {
          name: '',
          data_source: 'RTE',
          section: '150',
          diameter: '12.0',
          young_modulus: '180000',
          linear_mass: '0.6',
          dilatation_coefficient: '0.000011',
          temperature_reference: '20',
          stress_strain_a0: '1.1',
          stress_strain_a1: '0.11',
          stress_strain_a2: '0.011',
          stress_strain_a3: '0.0011',
          stress_strain_a4: '0.00011',
          stress_strain_b0: '0.55',
          stress_strain_b1: '0.055',
          stress_strain_b2: '0.0055',
          stress_strain_b3: '0.00055',
          stress_strain_b4: '0.000055',
          is_narcisse: 'false'
        },
        {
          name: 'Cable 3',
          data_source: 'RTE',
          section: '200',
          diameter: '15.0',
          young_modulus: '190000',
          linear_mass: '0.7',
          dilatation_coefficient: '0.00001',
          temperature_reference: '20',
          stress_strain_a0: '1.2',
          stress_strain_a1: '0.12',
          stress_strain_a2: '0.012',
          stress_strain_a3: '0.0012',
          stress_strain_a4: '0.00012',
          stress_strain_b0: '0.6',
          stress_strain_b1: '0.06',
          stress_strain_b2: '0.006',
          stress_strain_b3: '0.0006',
          stress_strain_b4: '0.00006',
          is_narcisse: 'false'
        }
      ];

      const mockCsvContent =
        'name,data_source,section,diameter,young_modulus,linear_mass,dilatation_coefficient,temperature_reference,stress_strain_a0,stress_strain_a1,stress_strain_a2,stress_strain_a3,stress_strain_a4,stress_strain_b0,stress_strain_b1,stress_strain_b2,stress_strain_b3,stress_strain_b4\nCable 1,RTE,100,10.5,200000,0.5,0.000012,20,1.0,0.1,0.01,0.001,0.0001,0.5,0.05,0.005,0.0005,0.00005\n,RTE,150,12.0,180000,0.6,0.000011,20,1.1,0.11,0.011,0.0011,0.00011,0.55,0.055,0.0055,0.00055,0.000055\nCable 3,RTE,200,15.0,190000,0.7,0.000010,20,1.2,0.12,0.012,0.0012,0.00012,0.6,0.06,0.006,0.0006,0.00006';

      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteCablesCsvFile>) => {
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
        `${window.location.origin}/data/cables.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add cables with valid name
      expect(mockCablesTable.bulkAdd).toHaveBeenCalledWith([
        {
          name: 'Cable 1',
          data_source: 'RTE',
          section: 100,
          diameter: 10.5,
          young_modulus: 200000,
          linear_mass: 0.5,
          dilatation_coefficient: 0.000012,
          temperature_reference: 20,
          stress_strain_a0: 1.0,
          stress_strain_a1: 0.1,
          stress_strain_a2: 0.01,
          stress_strain_a3: 0.001,
          stress_strain_a4: 0.0001,
          stress_strain_b0: 0.5,
          stress_strain_b1: 0.05,
          stress_strain_b2: 0.005,
          stress_strain_b3: 0.0005,
          stress_strain_b4: 0.00005,
          is_narcisse: false
        },
        {
          name: 'Cable 3',
          data_source: 'RTE',
          section: 200,
          diameter: 15.0,
          young_modulus: 190000,
          linear_mass: 0.7,
          dilatation_coefficient: 0.00001,
          temperature_reference: 20,
          stress_strain_a0: 1.2,
          stress_strain_a1: 0.12,
          stress_strain_a2: 0.012,
          stress_strain_a3: 0.0012,
          stress_strain_a4: 0.00012,
          stress_strain_b0: 0.6,
          stress_strain_b1: 0.06,
          stress_strain_b2: 0.006,
          stress_strain_b3: 0.0006,
          stress_strain_b4: 0.00006,
          is_narcisse: false
        }
      ]);
    });

    it('should clear cables table before adding new data', async () => {
      const mockCsvData: RteCablesCsvFile[] = [
        {
          name: 'Cable 1',
          data_source: 'RTE',
          section: '100',
          diameter: '10.5',
          young_modulus: '200000',
          linear_mass: '0.5',
          dilatation_coefficient: '0.000012',
          temperature_reference: '20',
          stress_strain_a0: '1.0',
          stress_strain_a1: '0.1',
          stress_strain_a2: '0.01',
          stress_strain_a3: '0.001',
          stress_strain_a4: '0.0001',
          stress_strain_b0: '0.5',
          stress_strain_b1: '0.05',
          stress_strain_b2: '0.005',
          stress_strain_b3: '0.0005',
          stress_strain_b4: '0.00005',
          is_narcisse: 'false'
        }
      ];

      const mockCsvContent =
        'name,data_source,section,diameter,young_modulus,linear_mass,dilatation_coefficient,temperature_reference,stress_strain_a0,stress_strain_a1,stress_strain_a2,stress_strain_a3,stress_strain_a4,stress_strain_b0,stress_strain_b1,stress_strain_b2,stress_strain_b3,stress_strain_b4\nCable 1,RTE,100,10.5,200000,0.5,0.000012,20,1.0,0.1,0.01,0.001,0.0001,0.5,0.05,0.005,0.0005,0.00005';

      (Papa.parse as jest.Mock).mockImplementation(
        (data: string, options: Papa.ParseConfig<RteCablesCsvFile>) => {
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
        `${window.location.origin}/data/cables.csv`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Verify clear is called before bulkAdd
      expect(mockCablesTable.clear).toHaveBeenCalled();
      expect(mockCablesTable.bulkAdd).toHaveBeenCalled();
    });
  });
});
