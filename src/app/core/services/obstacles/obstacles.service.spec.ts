/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ObstaclesService } from './obstacles.service';
import { StorageService } from '@services/storage/storage.service';
import { CsvImportClientService } from '@shared/catalog/csv-import';
import type { CatalogObstacleTypeEntity } from '@infrastructure/database';

describe('ObstaclesService', () => {
  let service: ObstaclesService;
  let storageService: StorageService;
  let csvImportClient: { importCsv: vi.Mock };
  let table: { toArray: vi.Mock; where: vi.Mock };
  let firstFn: vi.Mock;

  beforeEach(() => {
    firstFn = vi.fn().mockResolvedValue(undefined);
    table = {
      toArray: vi.fn().mockResolvedValue([]),
      where: vi.fn().mockReturnValue({ equals: vi.fn().mockReturnValue({ first: firstFn }) })
    };
    const storageServiceSpy = {
      ready$: new BehaviorSubject<boolean>(false),
      db: { catObstacleTypes: table }
    } as unknown as StorageService;
    csvImportClient = {
      importCsv: vi.fn().mockResolvedValue({ type: 'done', csvKey: 'obstacles', totalRows: 0, totalKeys: 0 })
    };
    TestBed.configureTestingModule({
      providers: [
        ObstaclesService,
        { provide: StorageService, useValue: storageServiceSpy },
        { provide: CsvImportClientService, useValue: csvImportClient }
      ]
    });
    service = TestBed.inject(ObstaclesService);
    storageService = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('mirrors StorageService ready state', () => {
    expect(service.ready.value).toBe(false);
    (storageService.ready$ as BehaviorSubject<boolean>).next(true);
    expect(service.ready.value).toBe(true);
  });

  describe('selection signals', () => {
    it('initializes signals to null', () => {
      expect(service.selectedObstacleUuid()).toBeNull();
      expect(service.activePointIndex()).toBeNull();
    });
    it('setCurrentPointIndex updates activePointIndex', () => {
      service.setCurrentPointIndex(3);
      expect(service.activePointIndex()).toBe(3);
    });
    it('resetCurrentPointIndex resets activePointIndex to null', () => {
      service.setCurrentPointIndex(5);
      service.resetCurrentPointIndex();
      expect(service.activePointIndex()).toBeNull();
    });
    it('setSelectedObstacle sets both uuid and point index', () => {
      service.setSelectedObstacle('uuid-1', 2);
      expect(service.selectedObstacleUuid()).toBe('uuid-1');
      expect(service.activePointIndex()).toBe(2);
    });
    it('setSelectedObstacle accepts nulls', () => {
      service.setSelectedObstacle(null, null);
      expect(service.selectedObstacleUuid()).toBeNull();
      expect(service.activePointIndex()).toBeNull();
    });
  });

  describe('getObstacleTypes', () => {
    it('forwards toArray', async () => {
      const list: CatalogObstacleTypeEntity[] = [{ obstacle_type: 'a', obstacle_type_name: 'A', details: '' }];
      table.toArray.mockResolvedValue(list);
      expect(await service.getObstacleTypes()).toEqual(list);
    });
    it('returns undefined when db is missing', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      expect(await service.getObstacleTypes()).toBeUndefined();
    });
  });

  describe('getObstacleType', () => {
    it('queries by obstacle_type', async () => {
      const entity: CatalogObstacleTypeEntity = {
        obstacle_type: 'tree',
        obstacle_type_name: 'Tree',
        details: ''
      };
      firstFn.mockResolvedValue(entity);
      expect(await service.getObstacleType('tree')).toEqual(entity);
      expect(table.where).toHaveBeenCalledWith('obstacle_type');
    });
    it('returns undefined when db is missing', async () => {
      (storageService as unknown as { db: undefined }).db = undefined;
      expect(await service.getObstacleType('x')).toBeUndefined();
    });
  });

  describe('importFromFile', () => {
    it('delegates to CsvImportClientService with the obstacles key', async () => {
      await service.importFromFile();
      expect(csvImportClient.importCsv).toHaveBeenCalledWith('obstacles', { expectedHash: undefined });
    });
    it('propagates errors from the client instead of swallowing them', async () => {
      csvImportClient.importCsv.mockRejectedValue(new Error('worker boom'));
      await expect(service.importFromFile()).rejects.toThrow('worker boom');
    });
  });
});
