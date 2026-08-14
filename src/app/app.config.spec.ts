/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { initializeApp } from './app.config';
import { StorageService } from '@services/storage/storage.service';
import { AuthService } from '@services/auth/auth.service';
import { UpdateService } from '@services/worker_update/worker_update.service';
import { LoggerService } from '@services/logger/logger.service';
import { AppConfigService } from '@core/config/app-config.service';
import { TranslocoService } from '@jsverse/transloco';

describe('initializeApp', () => {
  let mockStorageService: { setPersistentStorage: vi.Mock; createDatabase: vi.Mock };
  let mockAuthService: { initialize: vi.Mock };
  let mockUpdateService: { checkForUpdateOnce: vi.Mock };
  let mockLoggerService: { error: vi.Mock; warn: vi.Mock };
  let mockTranslocoService: { setActiveLang: vi.Mock; load: vi.Mock };
  let mockAppConfigService: { loadDefaultLang: vi.Mock };
  let translationLoad$: Subject<unknown>;

  beforeEach(() => {
    translationLoad$ = new Subject<unknown>();

    mockStorageService = {
      setPersistentStorage: vi.fn().mockResolvedValue(undefined),
      createDatabase: vi.fn().mockResolvedValue(undefined)
    };
    mockAuthService = { initialize: vi.fn().mockResolvedValue(undefined) };
    mockUpdateService = { checkForUpdateOnce: vi.fn().mockResolvedValue(undefined) };
    mockLoggerService = { error: vi.fn(), warn: vi.fn() };
    mockTranslocoService = {
      setActiveLang: vi.fn(),
      load: vi.fn().mockReturnValue(translationLoad$)
    };
    mockAppConfigService = { loadDefaultLang: vi.fn().mockResolvedValue('en') };

    TestBed.configureTestingModule({
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UpdateService, useValue: mockUpdateService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: TranslocoService, useValue: mockTranslocoService },
        { provide: AppConfigService, useValue: mockAppConfigService }
      ]
    });
  });

  it('should resolve without waiting for the translation file to finish loading', async () => {
    let resolved = false;
    const promise = TestBed.runInInjectionContext(() => initializeApp()).then(() => {
      resolved = true;
    });

    // translationLoad$ never emits (simulates a slow/stuck i18n fetch) —
    // initializeApp must resolve anyway since the load is fire-and-forget.
    await promise;

    expect(resolved).toBe(true);
  });

  it('should resolve the runtime language via AppConfigService and start loading its translations', async () => {
    const promise = TestBed.runInInjectionContext(() => initializeApp());
    await promise;

    expect(mockAppConfigService.loadDefaultLang).toHaveBeenCalled();
    expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('en');
    expect(mockTranslocoService.load).toHaveBeenCalledWith('en');
    expect(mockStorageService.setPersistentStorage).toHaveBeenCalled();
    expect(mockStorageService.createDatabase).toHaveBeenCalled();
    expect(mockAuthService.initialize).toHaveBeenCalled();
  });

  it('should log a warning if the background translation load fails, without rejecting', async () => {
    const promise = TestBed.runInInjectionContext(() => initializeApp());
    await promise;

    translationLoad$.error(new Error('network error'));
    await Promise.resolve();
    await Promise.resolve();

    expect(mockLoggerService.warn).toHaveBeenCalledWith(
      'AppConfig: translations failed to load in the background',
      expect.any(Error)
    );
  });

  it('should not await UpdateService.checkForUpdateOnce()', async () => {
    let updateCheckResolved = false;
    mockUpdateService.checkForUpdateOnce.mockReturnValue(
      new Promise((resolve) => {
        // Never resolves during this test — proves it is not awaited by initializeApp.
        setTimeout(() => {
          updateCheckResolved = true;
          resolve(undefined);
        }, 0);
      })
    );

    const promise = TestBed.runInInjectionContext(() => initializeApp());
    await promise;

    expect(mockUpdateService.checkForUpdateOnce).toHaveBeenCalled();
    expect(updateCheckResolved).toBe(false);
  });
});
