/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, take, BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';
import { AppDatabase } from '@infrastructure/database';

// Mock AppDatabase
vi.mock('@infrastructure/database', () => {
  return {
    AppDatabase: vi.fn().mockImplementation(function () {
      return {};
    })
  };
});

describe('StorageService', () => {
  let service: StorageService;
  let originalNavigator: Navigator;

  beforeEach(() => {
    // Save original navigator
    originalNavigator = global.navigator;

    // Reset AppDatabase mock
    vi.clearAllMocks();

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

  it('should initialize with ready$ as false', async () => {
    const isReady = await firstValueFrom(service.ready$.pipe(take(1)));
    expect(isReady).toBeFalsy();
  });

  it('should create database and set ready to true', async () => {
    const readySpy = vi.spyOn<BehaviorSubject<boolean>, 'next'>(service['_ready'], 'next');

    await service.createDatabase();

    expect(AppDatabase).toHaveBeenCalled();
    expect(service.db).toBeDefined();
    expect(readySpy).toHaveBeenCalledWith(true);

    // Verify ready$ emits true
    service.ready$.subscribe((isReady) => {
      expect(isReady).toBeTruthy();
    });
  });

  // it('should try to enable persistent storage if available', async () => {
  //   // Mock navigator.storage
  //   const persistMock = vi.fn().mockResolvedValue(true);
  //   const persistedMock = vi.fn().mockResolvedValue(false);

  //   global.navigator = {
  //     ...originalNavigator,
  //     storage: {
  //       persist: persistMock,
  //       persisted: persistedMock
  //     }
  //   };

  //   const consoleSpy = vi.spyOn(console, 'log');

  //   await service.setPersistentStorage();

  //   expect(persistedMock).toHaveBeenCalled();
  //   expect(persistMock).toHaveBeenCalled();
  //   expect(consoleSpy).toHaveBeenCalledWith('Persisted storage granted: true');
  // });

  // it('should not try to enable persistent storage if already enabled', async () => {
  //   // Mock navigator.storage with already persisted
  //   const persistMock = vi.fn().mockResolvedValue(true);
  //   const persistedMock = vi.fn().mockResolvedValue(true);

  //   global.navigator = {
  //     ...originalNavigator,
  //     storage: {
  //       persist: persistMock,
  //       persisted: persistedMock
  //     }
  //   };

  //   const consoleSpy = vi.spyOn(console, 'log');

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
      storage: null as unknown as StorageManager
    };

    // This should not throw an error
    await expect(service.setPersistentStorage()).resolves.not.toThrow();
  });

  it('should call persist when storage not yet persisted', async () => {
    const persistMock = vi.fn().mockResolvedValue(true);
    const persistedMock = vi.fn().mockResolvedValue(false);

    Object.defineProperty(global.navigator, 'storage', {
      value: { persist: persistMock, persisted: persistedMock },
      configurable: true
    });

    await service.setPersistentStorage();

    expect(persistedMock).toHaveBeenCalled();
    expect(persistMock).toHaveBeenCalled();
  });

  it('should not call persist when storage is already persisted', async () => {
    const persistMock = vi.fn().mockResolvedValue(true);
    const persistedMock = vi.fn().mockResolvedValue(true);

    Object.defineProperty(global.navigator, 'storage', {
      value: { persist: persistMock, persisted: persistedMock },
      configurable: true
    });

    await service.setPersistentStorage();

    expect(persistedMock).toHaveBeenCalled();
    expect(persistMock).not.toHaveBeenCalled();
  });

  it('should reset database by deleting and recreating', async () => {
    const deleteMock = vi.fn().mockResolvedValue(undefined);
    await service.createDatabase();
    service.db.delete = deleteMock;

    await service.resetDatabase();

    expect(deleteMock).toHaveBeenCalled();
    expect(service.db).toBeDefined();
  });

  it('should throw and log error when createDatabase fails', async () => {
    const error = new Error('DB init failed');
    (AppDatabase as unknown as vi.Mock).mockImplementationOnce(function () {
      throw error;
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(service.createDatabase()).rejects.toThrow('DB init failed');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('createDatabase'), error);
    consoleSpy.mockRestore();
  });
});
