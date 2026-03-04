/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { ObstacleTypesService } from './obstacle.services';
import { StorageService } from '@services/storage/storage.service';
import { CatalogObstacleTypeEntity } from '@core/infrastructure/database';
import { ObstacleTypeCsvDto } from '@core/infrastructure/dto';
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
  where?: jest.Mock;
}

interface MockDb {
  catObstacleTypes: MockTable;
}

describe('ObstacleTypesService', () => {
  let service: ObstacleTypesService;
  let storageService: StorageService;
  let mockDb: MockDb;
  let mockObstacleTypesTable: MockTable;

  beforeEach(() => {
    // Create mock database tables
    mockObstacleTypesTable = {
      count: jest.fn().mockResolvedValue(9),
      toArray: jest.fn().mockResolvedValue([]),
      bulkAdd: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
      where: jest.fn().mockReturnValue({
        equals: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(undefined)
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
      imports: [HttpClientTestingModule],
      providers: [ObstacleTypesService, { provide: StorageService, useValue: storageServiceSpy }]
    });

    service = TestBed.inject(ObstacleTypesService);
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

  describe('getObstacleTypes', () => {
    it('should return obstacle types array from database', async () => {
      const mockObstacleTypes: CatalogObstacleTypeEntity[] = [
        {
          obstacle_type: 'ordinary_ground',
          obstacle_type_name: 'Terrain ordinaire',
          details: 'Terrain ordinaire (non cultivé, présence de personnes exceptionnelles)'
        },
        {
          obstacle_type: 'vegetation',
          obstacle_type_name: 'Végétation',
          details: 'Végétation (il faut en plus intégrer la pousse des arbres)'
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
        obstacle_type_name: 'Végétation',
        details: 'Végétation (il faut en plus intégrer la pousse des arbres)'
      };

      mockObstacleTypesTable.where = jest.fn().mockReturnValue({
        equals: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(mockObstacleType)
        })
      });

      const result = await service.getObstacleType('vegetation');
      expect(mockObstacleTypesTable.where).toHaveBeenCalledWith('obstacle_type');
      expect(result).toEqual(mockObstacleType);
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

    it('should import obstacle types from CSV file successfully', async () => {
      const mockCsvData: ObstacleTypeCsvDto[] = [
        {
          obstacle_type: 'ordinary_ground',
          obstacle_type_name: 'Terrain ordinaire',
          details: 'Terrain ordinaire (non cultivé, présence de personnes exceptionnelles)'
        },
        {
          obstacle_type: 'vegetation',
          obstacle_type_name: 'Végétation',
          details: 'Végétation (il faut en plus intégrer la pousse des arbres)'
        }
      ];

      const mockCsvContent =
        'obstacle_type;obstacle_type_name;details\nordinary_ground;Terrain ordinaire;Terrain ordinaire (non cultivé, présence de personnes exceptionnelles)\nvegetation;Végétation;Végétation (il faut en plus intégrer la pousse des arbres)';

      // Mock Papa Parse to call complete callback
      (Papa.parse as jest.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ObstacleTypeCsvDto>) => {
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

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(`${window.location.origin}/data/obstacle_type_rte.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockObstacleTypesTable.clear).toHaveBeenCalled();
      expect(mockObstacleTypesTable.bulkAdd).toHaveBeenCalledWith([
        {
          obstacle_type: 'ordinary_ground',
          obstacle_type_name: 'Terrain ordinaire',
          details: 'Terrain ordinaire (non cultivé, présence de personnes exceptionnelles)'
        },
        {
          obstacle_type: 'vegetation',
          obstacle_type_name: 'Végétation',
          details: 'Végétation (il faut en plus intégrer la pousse des arbres)'
        }
      ]);
    });

    it('should handle empty CSV data', async () => {
      const mockCsvContent = 'obstacle_type;obstacle_type_name;details\n';

      // Mock Papa Parse to call complete callback with empty data
      (Papa.parse as jest.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ObstacleTypeCsvDto>) => {
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

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(`${window.location.origin}/data/obstacle_type_rte.csv`);
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
          obstacle_type_name: 'Végétation',
          details: 'Végétation (il faut en plus intégrer la pousse des arbres)'
        }
      ];

      const mockCsvContent =
        'obstacle_type;obstacle_type_name;details\n;Invalid;Should be filtered out\nvegetation;Végétation;Végétation (il faut en plus intégrer la pousse des arbres)';

      (Papa.parse as jest.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ObstacleTypeCsvDto>) => {
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

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mock the HTTP request
      const req = httpTestingController.expectOne(`${window.location.origin}/data/obstacle_type_rte.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add the entry with valid obstacle_type
      expect(mockObstacleTypesTable.bulkAdd).toHaveBeenCalledWith([
        {
          obstacle_type: 'vegetation',
          obstacle_type_name: 'Végétation',
          details: 'Végétation (il faut en plus intégrer la pousse des arbres)'
        }
      ]);
    });

    it('should handle HTTP error gracefully', async () => {
      // Mock Papa Parse to call complete callback with empty data (from empty string)
      (Papa.parse as jest.Mock).mockImplementation((data: string, options: Papa.ParseConfig<ObstacleTypeCsvDto>) => {
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

      // Wait for the HTTP request to be made
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate HTTP error
      const req = httpTestingController.expectOne(`${window.location.origin}/data/obstacle_type_rte.csv`);
      req.error(new ProgressEvent('error'));

      await importPromise;

      expect(mockObstacleTypesTable.clear).not.toHaveBeenCalled();
      expect(mockObstacleTypesTable.bulkAdd).not.toHaveBeenCalled();
    });
  });
});
