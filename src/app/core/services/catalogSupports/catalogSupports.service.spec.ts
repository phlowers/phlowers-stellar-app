/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { CatalogSupportsService } from './catalogSupports.service';
import { StorageService } from '../storage/storage.service';
import { CatalogSupport } from '@core/data/database/interfaces/support';
import { Table } from 'dexie';

describe('CatalogSupportsService', () => {
  let service: CatalogSupportsService;
  let mockStorageService: Partial<StorageService>;

  const mockCatalogSupports: CatalogSupport[] = [
    { name: 'Support Type A' },
    { name: 'Support Type B' },
    { name: 'Support Type C' }
  ];

  beforeEach(() => {
    const mockSupportsCatalogTable: Partial<Table<CatalogSupport, string>> = {
      toArray: jest.fn()
    };

    mockStorageService = {
      db: {
        catalogSupports: mockSupportsCatalogTable as Table<
          CatalogSupport,
          string
        >
      } as Partial<StorageService['db']> as StorageService['db']
    };

    TestBed.configureTestingModule({
      providers: [
        CatalogSupportsService,
        { provide: StorageService, useValue: mockStorageService }
      ]
    });

    service = TestBed.inject(CatalogSupportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCatalogSupports', () => {
    it('should return an array of catalog supports when db exists and has data', async () => {
      const mockToArray = jest.fn().mockResolvedValue(mockCatalogSupports);
      mockStorageService.db = {
        catalogSupports: {
          toArray: mockToArray
        } as Partial<Table<CatalogSupport, string>> as Table<
          CatalogSupport,
          string
        >
      } as StorageService['db'];

      const result = await service.getCatalogSupports();

      expect(result).toEqual(mockCatalogSupports);
      expect(mockToArray).toHaveBeenCalled();
    });

    it('should return an empty array when db exists but catalogSupports is empty', async () => {
      const mockToArray = jest.fn().mockResolvedValue([]);
      mockStorageService.db = {
        catalogSupports: {
          toArray: mockToArray
        } as Partial<Table<CatalogSupport, string>> as Table<
          CatalogSupport,
          string
        >
      } as StorageService['db'];

      const result = await service.getCatalogSupports();

      expect(result).toEqual([]);
      expect(mockToArray).toHaveBeenCalled();
    });

    it('should return an empty array when db is undefined', async () => {
      mockStorageService.db = undefined;

      const result = await service.getCatalogSupports();

      expect(result).toEqual([]);
    });

    it('should return an empty array when db exists but catalogSupports is undefined', async () => {
      mockStorageService.db = {
        catalogSupports: undefined
      } as Partial<StorageService['db']> as StorageService['db'];

      const result = await service.getCatalogSupports();

      expect(result).toEqual([]);
    });

    it('should handle errors from toArray gracefully', async () => {
      const error = new Error('Database error');
      const mockToArray = jest.fn().mockRejectedValue(error);
      mockStorageService.db = {
        catalogSupports: {
          toArray: mockToArray
        } as Partial<Table<CatalogSupport, string>> as Table<
          CatalogSupport,
          string
        >
      } as StorageService['db'];

      await expect(service.getCatalogSupports()).rejects.toThrow(
        'Database error'
      );
    });
  });
});
