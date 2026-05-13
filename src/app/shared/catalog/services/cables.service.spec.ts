/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';

import { BehaviorSubject } from 'rxjs';
import { CablesService } from './cables.service';
import { StorageService } from '@services/storage/storage.service';
import { CatalogCableEntity } from '@infrastructure/database';
import { CableCsvDto } from '@infrastructure/dto';
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
  catCables: MockTable;
}

describe('CablesService', () => {
  let service: CablesService;
  let storageService: StorageService;
  let mockDb: MockDb;
  let mockCablesTable: MockTable;

  beforeEach(() => {
    // Create mock database tables
    mockCablesTable = {
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
      catCables: mockCablesTable
    };

    // Create spy for StorageService
    const storageServiceSpy = {
      ready$: new BehaviorSubject<boolean>(false),
      db: mockDb
    } as unknown as StorageService;

    TestBed.configureTestingModule({
      providers: [CablesService, { provide: StorageService, useValue: storageServiceSpy }]
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
      const mockCables: CatalogCableEntity[] = [
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
          is_polynomial: false,
          diameter_heart: undefined,
          section_conductor: undefined,
          section_heart: undefined,
          solar_absorption: undefined,
          emissivity: undefined,
          electric_resistance_20: undefined,
          linear_resistance_temperature_coef: undefined,
          radial_thermal_conductivity: undefined,
          has_magnetic_heart: undefined,
          rts_cable: undefined,
          rts_layer_1: undefined,
          nb_strand_layer_1: undefined,
          rts_layer_2: undefined,
          nb_strand_layer_2: undefined,
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: undefined,
          is_bimetallic: undefined
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
          is_polynomial: false,
          diameter_heart: undefined,
          section_conductor: undefined,
          section_heart: undefined,
          solar_absorption: undefined,
          emissivity: undefined,
          electric_resistance_20: undefined,
          linear_resistance_temperature_coef: undefined,
          radial_thermal_conductivity: undefined,
          has_magnetic_heart: undefined,
          rts_cable: undefined,
          rts_layer_1: undefined,
          nb_strand_layer_1: undefined,
          rts_layer_2: undefined,
          nb_strand_layer_2: undefined,
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: undefined,
          is_bimetallic: undefined
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
    it('should import cables from CSV file successfully', async () => {
      const mockCsvData: CableCsvDto[] = [
        {
          cable_id: 'cable1',
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
          is_polynomial: 'false',
          diameter_heart: '0',
          section_conductor: '0',
          section_heart: '0',
          solar_absorption: '0',
          emissivity: '0',
          electric_resistance_20: '0',
          linear_resistance_temperature_coef: '0',
          radial_thermal_conductivity: '0',
          has_magnetic_heart: 'false',
          rts_cable: '64800',
          rts_layer_1: '4398.0',
          nb_strand_layer_1: '12.0',
          rts_layer_2: '4398.0',
          nb_strand_layer_2: '6.0',
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: '1.5',
          is_bimetallic: 'false'
        },
        {
          cable_id: 'cable2',
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
          is_polynomial: 'false',
          diameter_heart: '0',
          section_conductor: '0',
          section_heart: '0',
          solar_absorption: '0',
          emissivity: '0',
          electric_resistance_20: '0',
          linear_resistance_temperature_coef: '0',
          radial_thermal_conductivity: '0',
          has_magnetic_heart: 'false',
          rts_cable: '64800',
          rts_layer_1: '4398.0',
          nb_strand_layer_1: '12.0',
          rts_layer_2: '4398.0',
          nb_strand_layer_2: '6.0',
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: '1.5',
          is_bimetallic: 'false'
        }
      ];

      // Mock Papa Parse to call complete callback
      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<CableCsvDto>) => {
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

      expect(mockCablesTable.clear).toHaveBeenCalled();
      expect(mockCablesTable.bulkAdd).toHaveBeenCalledWith([
        {
          id: 'cable1',
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
          is_polynomial: false,
          diameter_heart: 0,
          section_conductor: 0,
          section_heart: 0,
          solar_absorption: 0,
          emissivity: 0,
          electric_resistance_20: 0,
          linear_resistance_temperature_coef: 0,
          radial_thermal_conductivity: 0,
          has_magnetic_heart: false,
          rts_cable: 64800,
          rts_layer_1: 4398,
          nb_strand_layer_1: 12,
          rts_layer_2: 4398,
          nb_strand_layer_2: 6,
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: 1.5,
          is_bimetallic: false
        },
        {
          id: 'cable2',
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
          is_polynomial: false,
          diameter_heart: 0,
          section_conductor: 0,
          section_heart: 0,
          solar_absorption: 0,
          emissivity: 0,
          electric_resistance_20: 0,
          linear_resistance_temperature_coef: 0,
          radial_thermal_conductivity: 0,
          has_magnetic_heart: false,
          rts_cable: 64800,
          rts_layer_1: 4398,
          nb_strand_layer_1: 12,
          rts_layer_2: 4398,
          nb_strand_layer_2: 6,
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: 1.5,
          is_bimetallic: false
        }
      ]);
    });

    it('should handle empty CSV data', async () => {
      // Mock Papa Parse to call complete callback with empty data
      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<CableCsvDto>) => {
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

      expect(mockCablesTable.clear).not.toHaveBeenCalled();
      expect(mockCablesTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should handle CSV data with null/undefined name', async () => {
      const mockCsvData: CableCsvDto[] = [
        {
          cable_id: 'cable1',
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
          is_polynomial: 'false',
          diameter_heart: '0',
          section_conductor: '0',
          section_heart: '0',
          solar_absorption: '0',
          emissivity: '0',
          electric_resistance_20: '0',
          linear_resistance_temperature_coef: '0',
          radial_thermal_conductivity: '0',
          has_magnetic_heart: 'false',
          rts_cable: '64800',
          rts_layer_1: '4398.0',
          nb_strand_layer_1: '12.0',
          rts_layer_2: '4398.0',
          nb_strand_layer_2: '6.0',
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: '1.5',
          is_bimetallic: 'false'
        },
        {
          cable_id: 'cable2',
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
          is_polynomial: 'false',
          diameter_heart: '0',
          section_conductor: '0',
          section_heart: '0',
          solar_absorption: '0',
          emissivity: '0',
          electric_resistance_20: '0',
          linear_resistance_temperature_coef: '0',
          radial_thermal_conductivity: '0',
          has_magnetic_heart: 'false',
          rts_cable: '64800',
          rts_layer_1: '4398.0',
          nb_strand_layer_1: '12.0',
          rts_layer_2: '4398.0',
          nb_strand_layer_2: '6.0',
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: '1.5',
          is_bimetallic: 'false'
        }
      ];

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<CableCsvDto>) => {
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

      // Should only add the cable with valid name
      expect(mockCablesTable.bulkAdd).toHaveBeenCalledWith([
        {
          id: 'cable2',
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
          is_polynomial: false,
          diameter_heart: 0,
          section_conductor: 0,
          section_heart: 0,
          solar_absorption: 0,
          emissivity: 0,
          electric_resistance_20: 0,
          linear_resistance_temperature_coef: 0,
          radial_thermal_conductivity: 0,
          has_magnetic_heart: false,
          rts_cable: 64800,
          rts_layer_1: 4398,
          nb_strand_layer_1: 12,
          rts_layer_2: 4398,
          nb_strand_layer_2: 6,
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: 1.5,
          is_bimetallic: false
        }
      ]);
    });

    it('should handle missing database gracefully', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const mockCsvData: CableCsvDto[] = [
        {
          cable_id: 'cable1',
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
          is_polynomial: 'false',
          diameter_heart: '0',
          section_conductor: '0',
          section_heart: '0',
          solar_absorption: '0',
          emissivity: '0',
          electric_resistance_20: '0',
          linear_resistance_temperature_coef: '0',
          radial_thermal_conductivity: '0',
          has_magnetic_heart: 'false',
          rts_cable: '64800',
          rts_layer_1: '4398.0',
          nb_strand_layer_1: '12.0',
          rts_layer_2: '4398.0',
          nb_strand_layer_2: '6.0',
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: '1.5',
          is_bimetallic: 'false'
        }
      ];

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<CableCsvDto>) => {
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
      const mockCsvData: CableCsvDto[] = [
        {
          cable_id: 'cable1',
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
          is_polynomial: 'false',
          diameter_heart: '0',
          section_conductor: '0',
          section_heart: '0',
          solar_absorption: '0',
          emissivity: '0',
          electric_resistance_20: '0',
          linear_resistance_temperature_coef: '0',
          radial_thermal_conductivity: '0',
          has_magnetic_heart: 'false',
          rts_cable: '64800',
          rts_layer_1: '4398.0',
          nb_strand_layer_1: '12.0',
          rts_layer_2: '4398.0',
          nb_strand_layer_2: '6.0',
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: '1.5',
          is_bimetallic: 'false'
        },
        {
          cable_id: 'cable2',
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
          is_polynomial: 'false',
          diameter_heart: '0',
          section_conductor: '0',
          section_heart: '0',
          solar_absorption: '0',
          emissivity: '0',
          electric_resistance_20: '0',
          linear_resistance_temperature_coef: '0',
          radial_thermal_conductivity: '0',
          has_magnetic_heart: 'false',
          rts_cable: '64800',
          rts_layer_1: '4398.0',
          nb_strand_layer_1: '12.0',
          rts_layer_2: '4398.0',
          nb_strand_layer_2: '6.0',
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: '1.5',
          is_bimetallic: 'false'
        },
        {
          cable_id: 'cable3',
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
          is_polynomial: 'false',
          diameter_heart: '0',
          section_conductor: '0',
          section_heart: '0',
          solar_absorption: '0',
          emissivity: '0',
          electric_resistance_20: '0',
          linear_resistance_temperature_coef: '0',
          radial_thermal_conductivity: '0',
          has_magnetic_heart: 'false',
          rts_cable: '64800',
          rts_layer_1: '4398.0',
          nb_strand_layer_1: '12.0',
          rts_layer_2: '4398.0',
          nb_strand_layer_2: '6.0',
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: '1.5',
          is_bimetallic: 'false'
        }
      ];

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<CableCsvDto>) => {
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

      // Should only add cables with valid name
      expect(mockCablesTable.bulkAdd).toHaveBeenCalledWith([
        {
          id: 'cable1',
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
          is_polynomial: false,
          diameter_heart: 0,
          section_conductor: 0,
          section_heart: 0,
          solar_absorption: 0,
          emissivity: 0,
          electric_resistance_20: 0,
          linear_resistance_temperature_coef: 0,
          radial_thermal_conductivity: 0,
          has_magnetic_heart: false,
          rts_cable: 64800,
          rts_layer_1: 4398,
          nb_strand_layer_1: 12,
          rts_layer_2: 4398,
          nb_strand_layer_2: 6,
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: 1.5,
          is_bimetallic: false
        },
        {
          id: 'cable3',
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
          is_polynomial: false,
          diameter_heart: 0,
          section_conductor: 0,
          section_heart: 0,
          solar_absorption: 0,
          emissivity: 0,
          electric_resistance_20: 0,
          linear_resistance_temperature_coef: 0,
          radial_thermal_conductivity: 0,
          has_magnetic_heart: false,
          rts_cable: 64800,
          rts_layer_1: 4398,
          nb_strand_layer_1: 12,
          rts_layer_2: 4398,
          nb_strand_layer_2: 6,
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: 1.5,
          is_bimetallic: false
        }
      ]);
    });

    it('should clear cables table before adding new data', async () => {
      const mockCsvData: CableCsvDto[] = [
        {
          cable_id: 'cable1',
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
          is_polynomial: 'false',
          diameter_heart: '0',
          section_conductor: '0',
          section_heart: '0',
          solar_absorption: '0',
          emissivity: '0',
          electric_resistance_20: '0',
          linear_resistance_temperature_coef: '0',
          radial_thermal_conductivity: '0',
          has_magnetic_heart: 'false',
          rts_cable: '64800',
          rts_layer_1: '4398.0',
          nb_strand_layer_1: '12.0',
          rts_layer_2: '4398.0',
          nb_strand_layer_2: '6.0',
          rts_layer_3: undefined,
          nb_strand_layer_3: undefined,
          rts_layer_4: undefined,
          nb_strand_layer_4: undefined,
          rts_layer_5: undefined,
          nb_strand_layer_5: undefined,
          rts_layer_6: undefined,
          nb_strand_layer_6: undefined,
          rts_layer_7: undefined,
          nb_strand_layer_7: undefined,
          rts_layer_8: undefined,
          nb_strand_layer_8: undefined,
          safety_coefficient: '1.5',
          is_bimetallic: 'false'
        }
      ];

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<CableCsvDto>) => {
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
      expect(mockCablesTable.clear).toHaveBeenCalled();
      expect(mockCablesTable.bulkAdd).toHaveBeenCalled();
    });

    it('should call Papa.parse with download:true, worker:true and the cables URL', async () => {
      vi.mocked(Papa.parse).mockImplementation((_url: string, options: Papa.ParseConfig<CableCsvDto>) => {
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
        expect.stringContaining('/data/cables.csv'),
        expect.objectContaining({ download: true, worker: true })
      );
    });

    it('should not store data when Papa.parse calls error callback', async () => {
      vi.mocked(Papa.parse).mockImplementation((_url: string, options: Papa.ParseConfig<CableCsvDto>) => {
        if (options.error) {
          options.error(new Error('Network error') as Papa.ParseError, undefined!);
        }
      });

      await service.importFromFile();

      expect(mockCablesTable.clear).not.toHaveBeenCalled();
      expect(mockCablesTable.bulkAdd).not.toHaveBeenCalled();
    });
  });
});
