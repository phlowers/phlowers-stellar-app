/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { AppDB } from '@core/data/database';

// Mock AppDB
jest.mock('./database', () => {
  return {
    AppDB: jest.fn().mockImplementation(() => {
      return {};
    })
  };
});

describe('StorageService', () => {
  let service: StorageService;
  let originalNavigator: any;

  beforeEach(() => {
    // Save original navigator
    originalNavigator = global.navigator;

    // Reset AppDB mock
    jest.clearAllMocks();

    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
  });

  afterEach(() => {
    // Restore original navigator
    global.navigator = originalNavigator;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with ready$ as false', (done) => {
    service.ready$.subscribe((isReady) => {
      expect(isReady).toBeFalsy();
      done();
    });
  });

  it('should create database and set ready to true', async () => {
    const readySpy = jest.spyOn<any, any>(service['_ready'], 'next');

    await service.createDatabase();

    expect(AppDB).toHaveBeenCalled();
    expect(service.db).toBeDefined();
    expect(readySpy).toHaveBeenCalledWith(true);

    // Verify ready$ emits true
    service.ready$.subscribe((isReady) => {
      expect(isReady).toBeTruthy();
    });
  });

  // it('should try to enable persistent storage if available', async () => {
  //   // Mock navigator.storage
  //   const persistMock = jest.fn().mockResolvedValue(true);
  //   const persistedMock = jest.fn().mockResolvedValue(false);

  //   global.navigator = {
  //     ...originalNavigator,
  //     storage: {
  //       persist: persistMock,
  //       persisted: persistedMock
  //     }
  //   };

  //   const consoleSpy = jest.spyOn(console, 'log');

  //   await service.setPersistentStorage();

  //   expect(persistedMock).toHaveBeenCalled();
  //   expect(persistMock).toHaveBeenCalled();
  //   expect(consoleSpy).toHaveBeenCalledWith('Persisted storage granted: true');
  // });

  // it('should not try to enable persistent storage if already enabled', async () => {
  //   // Mock navigator.storage with already persisted
  //   const persistMock = jest.fn().mockResolvedValue(true);
  //   const persistedMock = jest.fn().mockResolvedValue(true);

  //   global.navigator = {
  //     ...originalNavigator,
  //     storage: {
  //       persist: persistMock,
  //       persisted: persistedMock
  //     }
  //   };

  //   const consoleSpy = jest.spyOn(console, 'log');

  //   await service.setPersistentStorage();

  //   expect(persistedMock).toHaveBeenCalled();
  //   expect(persistMock).not.toHaveBeenCalled();
  //   expect(consoleSpy).toHaveBeenCalledWith(
  //     'Persisted storage has already been granted'
  //   );
  // });

  it('should handle if persistent storage API is not available', async () => {
    // Mock navigator without storage
    global.navigator = {
      ...originalNavigator,
      storage: null
    };

    // This should not throw an error
    await expect(service.setPersistentStorage()).resolves.not.toThrow();
  });
});
