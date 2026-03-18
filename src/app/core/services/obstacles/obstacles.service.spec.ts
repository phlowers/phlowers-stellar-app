/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { ObstaclesService } from './obstacles.service';
import { StorageService } from '@services/storage/storage.service';
import { CatalogObstacleTypeEntity } from '@infrastructure/database';
import { ObstacleTypeCsvDto } from '@infrastructure/dto';
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
  where?: vi.Mock;
}

interface MockDb {
  catObstacleTypes: MockTable;
}

describe('ObstaclesService', () => {
  let service: ObstaclesService;
  let storageService: StorageService;
  let mockDb: MockDb;
  let mockObstacleTypesTable: MockTable;
  let httpTestingController: import('@angular/common/http/testing').HttpTestingController;

  beforeEach(() => {
    // Create mock database tables
    mockObstacleTypesTable = {
      count: vi.fn().mockResolvedValue(9),
      toArray: vi.fn().mockResolvedValue([]),
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(undefined)
        })
      })
    };

    mockDb = {
      catObstacleTypes: mockObstacleTypesTable
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
        ObstaclesService,
        { provide: StorageService, useValue: storageServiceSpy }
      ]
    });

    service = TestBed.inject(ObstaclesService);
    storageService = TestBed.inject(StorageService);
    httpTestingController = TestBed.inject(HttpTestingController);
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

  describe('getObstacleTypes', () => {
    it('should return obstacle types array from database', async () => {
      const mockObstacleTypes: CatalogObstacleTypeEntity[] = [
        {
          obstacle_type: 'ordinary_ground',
          obstacle_type_name: 'Ordinary ground',
          details: 'Ordinary ground (uncultivated, occasional presence of people)'
        },
        {
          obstacle_type: 'vegetation',
          obstacle_type_name: 'Vegetation',
          details: 'Vegetation (must also account for tree growth)'
        }
      ];
      mockObstacleTypesTable.toArray.mockResolvedValue(mockObstacleTypes);

      const result = await service.getObstacleTypes();
      expect(mockObstacleTypesTable.toArray).toHaveBeenCalled();
      expect(result).toEqual(mockObstacleTypes);
    });

    it('should return undefined if database is not available', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      const result = await service.getObstacleTypes();
      expect(result).toBeUndefined();
    });
  });

  describe('getObstacleType', () => {
    it('should return a specific obstacle type by key', async () => {
      const mockObstacleType: CatalogObstacleTypeEntity = {
        obstacle_type: 'vegetation',
        obstacle_type_name: 'Vegetation',
        details: 'Vegetation (must also account for tree growth)'
      };

      mockObstacleTypesTable.where = vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockObstacleType)
        })
      });

      const result = await service.getObstacleType('vegetation');
      expect(mockObstacleTypesTable.where).toHaveBeenCalledWith('obstacle_type');
      expect(result).toEqual(mockObstacleType);
    });
  });

  describe('importFromFile', () => {
    // Modern HTTP mocking: use vi.fn() and spy on fetch or HttpClient if needed

    it('should import obstacle types from CSV file successfully', async () => {
      const mockCsvData: ObstacleTypeCsvDto[] = [
        {
          obstacle_type: 'ordinary_ground',
          obstacle_type_name: 'Ordinary ground',
          details: 'Ordinary ground (uncultivated, occasional presence of people)'
        },
        {
          obstacle_type: 'vegetation',
          obstacle_type_name: 'Vegetation',
          details: 'Vegetation (must also account for tree growth)'
        }
      ];

      const mockCsvContent =
        'obstacle_type;obstacle_type_name;details\nordinary_ground;Ordinary ground;Ordinary ground (uncultivated, occasional presence of people)\nvegetation;Vegetation;Vegetation (must also account for tree growth)';

      // Mock Papa Parse to call complete callback
      (Papa.parse as vi.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ObstacleTypeCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: mockCsvData,
              errors: [],
              meta: {
                delimiter: ';',
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

      // Lancer l'import et intercepter la requête HTTP
      const importPromise = service.importFromFile();
      const req = httpTestingController.expectOne((req) => req.url.includes('obstacle_type_rte.csv'));
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);
      await importPromise;

      expect(mockObstacleTypesTable.clear).toHaveBeenCalled();
      expect(mockObstacleTypesTable.bulkAdd).toHaveBeenCalledWith([
        {
          obstacle_type: 'ordinary_ground',
          obstacle_type_name: 'Ordinary ground',
          details: 'Ordinary ground (uncultivated, occasional presence of people)'
        },
        {
          obstacle_type: 'vegetation',
          obstacle_type_name: 'Vegetation',
          details: 'Vegetation (must also account for tree growth)'
        }
      ]);
    });

    it('should handle empty CSV data', async () => {
      const mockCsvContent = 'obstacle_type;obstacle_type_name;details\n';

      // Mock Papa Parse to call complete callback with empty data
      (Papa.parse as vi.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ObstacleTypeCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: [],
              errors: [],
              meta: {
                delimiter: ';',
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
      const req = httpTestingController.expectOne((req) => req.url.includes('obstacle_type_rte.csv'));
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);
      await importPromise;

      expect(mockObstacleTypesTable.clear).not.toHaveBeenCalled();
      expect(mockObstacleTypesTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should filter out entries with empty obstacle_type', async () => {
      const mockCsvData: ObstacleTypeCsvDto[] = [
        {
          obstacle_type: '',
          obstacle_type_name: 'Invalid',
          details: 'Should be filtered out'
        },
        {
          obstacle_type: 'vegetation',
          obstacle_type_name: 'Vegetation',
          details: 'Vegetation (must also account for tree growth)'
        }
      ];

      const mockCsvContent =
        'obstacle_type;obstacle_type_name;details\n;Invalid;Should be filtered out\nvegetation;Vegetation;Vegetation (must also account for tree growth)';

      (Papa.parse as vi.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ObstacleTypeCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: mockCsvData,
              errors: [],
              meta: {
                delimiter: ';',
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
      const req = httpTestingController.expectOne((req) => req.url.includes('obstacle_type_rte.csv'));
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);
      await importPromise;

      // Should only add the entry with valid obstacle_type
      expect(mockObstacleTypesTable.bulkAdd).toHaveBeenCalledWith([
        {
          obstacle_type: 'vegetation',
          obstacle_type_name: 'Vegetation',
          details: 'Vegetation (must also account for tree growth)'
        }
      ]);
    });

    it('should handle HTTP error gracefully', async () => {
      // Mock Papa Parse to call complete callback with empty data (from empty string)
      (Papa.parse as vi.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ObstacleTypeCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: [],
              errors: [],
              meta: {
                delimiter: ';',
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
      const req = httpTestingController.expectOne((req) => req.url.includes('obstacle_type_rte.csv'));
      expect(req.request.method).toBe('GET');
      req.flush('', { status: 404, statusText: 'Not Found' });
      await importPromise;

      expect(mockObstacleTypesTable.clear).not.toHaveBeenCalled();
      expect(mockObstacleTypesTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should import all 9 obstacle types from full CSV data', async () => {
      const fullCsvData: ObstacleTypeCsvDto[] = [
        { obstacle_type: 'ordinary_ground', obstacle_type_name: 'Ordinary ground', details: 'Ordinary ground' },
        { obstacle_type: 'agricultural_land', obstacle_type_name: 'Agricultural land', details: 'Agricultural land' },
        {
          obstacle_type: 'high_clearance_equipment_area',
          obstacle_type_name: 'High clearance equipment area',
          details: 'Area for operation of agricultural or industrial equipment of large height H (>5m)'
        },
        { obstacle_type: 'traffic_lane', obstacle_type_name: 'Traffic lane', details: 'Traffic lane' },
        {
          obstacle_type: 'high_clearance_vehicle_route',
          obstacle_type_name: 'High clearance vehicle route',
          details: 'Route for vehicles of large height H (>5m)'
        },
        { obstacle_type: 'silo_proximity', obstacle_type_name: 'Silo proximity', details: 'Proximity to silo' },
        {
          obstacle_type: 'accessible_building',
          obstacle_type_name: 'Accessible building',
          details: 'Building accessible to people and protruding parts'
        },
        {
          obstacle_type: 'non_accessible_structure',
          obstacle_type_name: 'Non-accessible structure',
          details: 'Ground structures and protruding parts of buildings not normally accessible to people'
        },
        { obstacle_type: 'vegetation', obstacle_type_name: 'Vegetation', details: 'Vegetation' }
      ];

      (Papa.parse as vi.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ObstacleTypeCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: fullCsvData,
              errors: [],
              meta: {
                delimiter: ';',
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
      const req = httpTestingController.expectOne((req) => req.url.includes('obstacle_type_rte.csv'));
      expect(req.request.method).toBe('GET');
      req.flush('csv-content');
      await importPromise;

      expect(mockObstacleTypesTable.clear).toHaveBeenCalled();
      expect(mockObstacleTypesTable.bulkAdd).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ obstacle_type: 'ordinary_ground' }),
          expect.objectContaining({ obstacle_type: 'vegetation' }),
          expect.objectContaining({ obstacle_type: 'accessible_building' })
        ])
      );
      const addedEntities = mockObstacleTypesTable.bulkAdd.mock.calls[0][0];
      expect(addedEntities).toHaveLength(9);
    });

    it('should correctly parse CSV with semicolon delimiter', async () => {
      const csvContent =
        'obstacle_type;obstacle_type_name;details\nvegetation;Vegetation;Vegetation (must also account for tree growth)';

      (Papa.parse as vi.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ObstacleTypeCsvDto>) => {
        expect(options.delimiter).toBe(';');
        expect(options.header).toBe(true);
        expect(options.skipEmptyLines).toBe(true);
        if (options.complete) {
          options.complete(
            {
              data: [
                {
                  obstacle_type: 'vegetation',
                  obstacle_type_name: 'Vegetation',
                  details: 'Vegetation (must also account for tree growth)'
                }
              ],
              errors: [],
              meta: {
                delimiter: ';',
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
      const req = httpTestingController.expectOne((req) => req.url.includes('obstacle_type_rte.csv'));
      expect(req.request.method).toBe('GET');
      req.flush(csvContent);
      await importPromise;

      expect(Papa.parse).toHaveBeenCalledWith(
        csvContent,
        expect.objectContaining({
          header: true,
          delimiter: ';',
          skipEmptyLines: true
        })
      );
    });

    it('should not store data when database is not available during import', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const mockCsvData: ObstacleTypeCsvDto[] = [
        {
          obstacle_type: 'vegetation',
          obstacle_type_name: 'Vegetation',
          details: 'Vegetation'
        }
      ];

      (Papa.parse as vi.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ObstacleTypeCsvDto>) => {
        if (options.complete) {
          options.complete(
            {
              data: mockCsvData,
              errors: [],
              meta: {
                delimiter: ';',
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
      const req = httpTestingController.expectOne((req) => req.url.includes('obstacle_type_rte.csv'));
      expect(req.request.method).toBe('GET');
      req.flush('csv-content');
      await importPromise;

      // bulkAdd should NOT have been called since db is undefined
      expect(mockObstacleTypesTable.clear).not.toHaveBeenCalled();
      expect(mockObstacleTypesTable.bulkAdd).not.toHaveBeenCalled();
    });
  });

  describe('getObstacleType - edge cases', () => {
    it('should return undefined when obstacle type is not found', async () => {
      mockObstacleTypesTable.where = vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(undefined)
        })
      });

      const result = await service.getObstacleType('nonexistent_type');
      expect(result).toBeUndefined();
    });

    it('should return undefined when database is not available', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      const result = await service.getObstacleType('vegetation');
      expect(result).toBeUndefined();
    });
  });

  describe('ready state', () => {
    it('should follow storage service ready state transitions', () => {
      const readySubject = storageService.ready$ as BehaviorSubject<boolean>;

      expect(service.ready.value).toBe(false);

      readySubject.next(true);
      expect(service.ready.value).toBe(true);

      readySubject.next(false);
      expect(service.ready.value).toBe(false);

      readySubject.next(true);
      expect(service.ready.value).toBe(true);
    });
  });
});
