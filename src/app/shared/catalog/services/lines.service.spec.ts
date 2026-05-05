/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { LinesService } from './lines.service';
import { StorageService } from '@services/storage/storage.service';
import { CatalogLineEntity } from '@infrastructure/database';
import { LineCsvDto } from '@infrastructure/dto';
import Papa from 'papaparse';
import { sortBy } from 'lodash';

// Mock Papa Parse
vi.mock('papaparse', () => ({
  __esModule: true,
  default: {
    parse: vi.fn()
  },
  parse: vi.fn()
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123')
}));

// Mock lodash
vi.mock('lodash', () => ({
  sortBy: vi.fn((arr: unknown[]) => arr),
  uniqBy: vi.fn((arr: unknown[], iteratee: (item: unknown) => unknown) => {
    const seen = new Set();
    return arr.filter((item: unknown) => {
      const key = iteratee(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  })
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

describe('LinesService', () => {
  let service: LinesService;
  let storageService: StorageService;
  let mockDb: MockDb;
  let mockLinesTable: MockTable;
  let mockMaintenanceTable: MockTable;

  beforeEach(() => {
    // Create mock database tables
    mockLinesTable = {
      count: vi.fn().mockResolvedValue(5),
      toArray: vi.fn().mockResolvedValue([]),
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined)
    };

    mockMaintenanceTable = {
      count: vi.fn().mockResolvedValue(0),
      toArray: vi.fn().mockResolvedValue([]),
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined)
    };

    mockDb = {
      catLines: mockLinesTable,
      catMaintenance: mockMaintenanceTable
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
        LinesService,
        { provide: StorageService, useValue: storageServiceSpy }
      ]
    });

    service = TestBed.inject(LinesService);
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

  describe('getLinesCount', () => {
    it('should return lines count from database', async () => {
      const result = await service.getLinesCount();
      expect(mockLinesTable.count).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should return undefined if database is not available', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      const result = await service.getLinesCount();
      expect(result).toBeUndefined();
    });
  });

  describe('getLines', () => {
    it('should return lines array from database', async () => {
      const mockLines: CatalogLineEntity[] = [
        {
          uuid: 'test-uuid-1',
          link_idr: 'LINK001',
          lit_idr: 'LIT001',
          lit_adr: 'LIT_ADR001',
          branch_idr: '1.0',
          branch_id: 'BRANCH001',
          branch_adr: 'BRANCH_ADR001',
          voltage_idr: 'TENSION001',
          voltage_adr: 'TENSION_ADR001',
          link_adr: 'LINK_ADR001'
        }
      ];
      mockLinesTable.toArray.mockResolvedValue(mockLines);

      const result = await service.getLines();
      expect(mockLinesTable.toArray).toHaveBeenCalled();
      expect(result).toEqual(mockLines);
    });

    it('should return undefined if database is not available', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      const result = await service.getLines();
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

    it('should import lines from CSV file successfully', async () => {
      const mockCsvData: LineCsvDto[] = [
        {
          link_idr: 'LINK001',
          lit_idr: 'LIT001',
          lit_adr: 'LIT_ADR001',
          branch_idr: 'BRANCH001',
          branch_adr: 'BRANCH_ADR001',
          voltage_idr: 'TENSION001',
          voltage_adr: 'TENSION_ADR001',
          link_adr: 'LINK_ADR001',
          section_id: 'SECTION001',
          section_type: 'SECTION_TYPE001',
          cable_id: 'CABLE001',
          cable_idr: 'CABLE_IDR001',
          cable_adr: 'CABLE_ADR001',
          electric_phase_number: 1,
          cable_bundle_amount: 1,
          opical_fiber_amount: 1,
          link_id: 'LINK001',
          lit_id: 'LIT001',
          branch_id: 'BRANCH001',
          voltage_id: 'TENSION001'
        }
      ];

      const mockCsvContent =
        'LIAISON_IDR,LIT_IDR,LIT_ADR,BRANCHE_IDR,BRANCHE_ADR,TENSION_ELECTRIQUE_IDR,TENSION_ELECTRIQUE_ADR\nLINK001,LIT001,LIT_ADR001,BRANCH001,BRANCH_ADR001,TENSION001,TENSION_ADR001';

      // Mock Papa Parse to call complete callback
      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<LineCsvDto>) => {
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
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/lines.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockLinesTable.clear).toHaveBeenCalled();
      expect(mockLinesTable.bulkAdd).toHaveBeenCalled();
    });

    it('should handle empty CSV data', async () => {
      const mockCsvContent =
        'LIAISON_IDR,LIT_IDR,LIT_ADR,BRANCHE_IDR,BRANCHE_ADR,TENSION_ELECTRIQUE_IDR,TENSION_ELECTRIQUE_ADR\n';

      // Mock Papa Parse to call complete callback with empty data
      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<LineCsvDto>) => {
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

      // HTTP request is issued synchronously by subscribe inside importFromFile
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/lines.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockLinesTable.clear).not.toHaveBeenCalled();
      expect(mockLinesTable.bulkAdd).not.toHaveBeenCalled();
    });

    it('should handle CSV data with null/undefined LIAISON_IDR', async () => {
      const mockCsvData: LineCsvDto[] = [
        {
          link_idr: '',
          lit_idr: 'LIT001',
          lit_adr: 'LIT_ADR001',
          branch_idr: 'BRANCH001',
          branch_adr: 'BRANCH_ADR001',
          voltage_idr: 'TENSION001',
          voltage_adr: 'TENSION_ADR001',
          section_id: 'SECTION001',
          section_type: 'SECTION_TYPE001',
          cable_id: 'CABLE001',
          cable_idr: 'CABLE_IDR001',
          cable_adr: 'CABLE_ADR001',
          electric_phase_number: 1,
          cable_bundle_amount: 1,
          opical_fiber_amount: 1,
          link_id: 'LINK001',
          lit_id: 'LIT001',
          branch_id: 'BRANCH001',
          voltage_id: 'TENSION001',
          link_adr: 'LINK_ADR001'
        },
        {
          link_idr: 'LINK002',
          lit_idr: 'LIT002',
          lit_adr: 'LIT_ADR002',
          branch_idr: 'BRANCH002',
          branch_adr: 'BRANCH_ADR002',
          voltage_idr: 'TENSION002',
          voltage_adr: 'TENSION_ADR002',
          section_id: 'SECTION002',
          section_type: 'SECTION_TYPE002',
          cable_id: 'CABLE002',
          cable_idr: 'CABLE_IDR002',
          cable_adr: 'CABLE_ADR002',
          electric_phase_number: 2,
          cable_bundle_amount: 2,
          opical_fiber_amount: 2,
          link_id: 'LINK002',
          lit_id: 'LIT002',
          branch_id: 'BRANCH002',
          voltage_id: 'TENSION002',
          link_adr: 'LINK_ADR002'
        }
      ];

      const mockCsvContent =
        'LIAISON_IDR,LIT_IDR,LIT_ADR,BRANCHE_IDR,BRANCHE_ADR,TENSION_ELECTRIQUE_IDR,TENSION_ELECTRIQUE_ADR\n,LIT001,LIT_ADR001,BRANCH001,BRANCH_ADR001,TENSION001,TENSION_ADR001\nLINK002,LIT002,LIT_ADR002,BRANCH002,BRANCH_ADR002,TENSION002,TENSION_ADR002';

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<LineCsvDto>) => {
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
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/lines.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      // Should only add the line with valid LIAISON_IDR
      expect(mockLinesTable.bulkAdd).toHaveBeenCalledWith([
        expect.objectContaining({
          uuid: 'mock-uuid-123',
          link_idr: 'LINK002',
          lit_idr: 'LIT002',
          lit_adr: 'LIT_ADR002',
          branch_idr: 'BRANCH002',
          branch_adr: 'BRANCH_ADR002',
          voltage_idr: 'TENSION002',
          voltage_adr: 'TENSION_ADR002'
        })
      ]);
    });

    it('should handle missing database gracefully', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;

      const mockCsvData: LineCsvDto[] = [
        {
          link_idr: '',
          lit_idr: 'LIT001',
          lit_adr: 'LIT_ADR001',
          branch_idr: 'BRANCH001',
          branch_adr: 'BRANCH_ADR001',
          voltage_idr: 'TENSION001',
          voltage_adr: 'TENSION_ADR001',
          section_id: 'SECTION001',
          section_type: 'SECTION_TYPE001',
          cable_id: 'CABLE001',
          cable_idr: 'CABLE_IDR001',
          cable_adr: 'CABLE_ADR001',
          electric_phase_number: 1,
          cable_bundle_amount: 1,
          opical_fiber_amount: 1,
          link_id: 'LINK001',
          lit_id: 'LIT001',
          branch_id: 'BRANCH001',
          voltage_id: 'TENSION001',
          link_adr: 'LINK_ADR001'
        }
      ];

      const mockCsvContent =
        'LIAISON_IDR,LIT_IDR,LIT_ADR,BRANCHE_IDR,BRANCHE_ADR,TENSION_ELECTRIQUE_IDR,TENSION_ELECTRIQUE_ADR\nLINK001,LIT001,LIT_ADR001,BRANCH001,BRANCH_ADR001,TENSION001,TENSION_ADR001';

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<LineCsvDto>) => {
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
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/lines.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      // Should not throw error
      await expect(importPromise).resolves.toBeUndefined();
    });

    it('should sort lines by electric_tension_level_adr', async () => {
      const mockCsvData: LineCsvDto[] = [
        {
          link_idr: '',
          lit_idr: 'LIT001',
          lit_adr: 'LIT_ADR001',
          branch_idr: 'BRANCH001',
          branch_adr: 'BRANCH_ADR001',
          voltage_idr: 'TENSION001',
          voltage_adr: 'TENSION_ADR001',
          section_id: 'SECTION001',
          section_type: 'SECTION_TYPE001',
          cable_id: 'CABLE001',
          cable_idr: 'CABLE_IDR001',
          cable_adr: 'CABLE_ADR001',
          electric_phase_number: 1,
          cable_bundle_amount: 1,
          opical_fiber_amount: 1,
          link_id: 'LINK001',
          lit_id: 'LIT001',
          branch_id: 'BRANCH001',
          voltage_id: 'TENSION001',
          link_adr: 'LINK_ADR001'
        }
      ];

      const mockCsvContent =
        'LIAISON_IDR,LIT_IDR,LIT_ADR,BRANCHE_IDR,BRANCHE_ADR,TENSION_ELECTRIQUE_IDR,TENSION_ELECTRIQUE_ADR\nLINK001,LIT001,LIT_ADR001,BRANCH001,BRANCH_ADR001,TENSION001,TENSION_ADR001';

      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<LineCsvDto>) => {
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
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/lines.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(sortBy as vi.Mock).toHaveBeenCalledWith(expect.any(Array), 'voltage_adr');
    });

    it('should handle HTTP error and return empty string', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
      const mockError = new ErrorEvent('Network error', {
        message: 'Failed to fetch'
      });

      // Mock Papa Parse to return empty data when HTTP error occurs
      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<LineCsvDto>) => {
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

      // HTTP request is issued synchronously by subscribe inside importFromFile
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/lines.csv`);
      expect(req.request.method).toBe('GET');
      req.error(mockError);

      await importPromise;

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error importing lines', expect.any(HttpErrorResponse));
      expect(mockLinesTable.clear).not.toHaveBeenCalled();
      expect(mockLinesTable.bulkAdd).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should apply default values for missing/null/undefined fields', async () => {
      const mockCsvData: LineCsvDto[] = [
        {
          link_idr: 'LINK001',
          link_adr: undefined as unknown as string,
          lit_idr: null as unknown as string,
          lit_adr: '',
          branch_id: undefined as unknown as string,
          branch_idr: null as unknown as string,
          branch_adr: '',
          voltage_idr: undefined as unknown as string,
          voltage_adr: null as unknown as string,
          section_id: 'SECTION001',
          section_type: 'SECTION_TYPE001',
          cable_id: 'CABLE001',
          cable_idr: 'CABLE_IDR001',
          cable_adr: 'CABLE_ADR001',
          electric_phase_number: 1,
          cable_bundle_amount: 1,
          opical_fiber_amount: 1,
          link_id: 'LINK001',
          lit_id: 'LIT001',
          voltage_id: 'TENSION001'
        }
      ];

      const mockCsvContent =
        'LIAISON_IDR,LIT_IDR,LIT_ADR,BRANCHE_IDR,BRANCHE_ADR,TENSION_ELECTRIQUE_IDR,TENSION_ELECTRIQUE_ADR\nLINK001,,,BRANCH001,,,';
      vi.mocked(Papa.parse).mockImplementation((data: string, options: Papa.ParseConfig<LineCsvDto>) => {
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
      const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/lines.csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCsvContent);

      await importPromise;

      expect(mockLinesTable.bulkAdd).toHaveBeenCalledWith([
        expect.objectContaining({
          uuid: 'mock-uuid-123',
          link_idr: 'LINK001',
          link_adr: '',
          lit_idr: '',
          lit_adr: '',
          branch_id: '',
          branch_idr: '',
          branch_adr: '',
          voltage_idr: 'NO VOLTAGE',
          voltage_adr: 'NO_VOLTAGE'
        })
      ]);
    });
  });
});
