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
import { AppUpdateService } from '@services/app-update/app-update.service';
import { APP_UPDATE_ENABLED } from '@services/app-update/app-update.constantes';
import { LoggerService } from '@services/logger/logger.service';
import { AppConfigService } from '@core/config/app-config.service';
import { TranslocoService } from '@jsverse/transloco';

describe('initializeApp', () => {
  let mockStorageService: { setPersistentStorage: vi.Mock; createDatabase: vi.Mock };
  let mockAuthService: { initialize: vi.Mock };
  let mockAppUpdateService: { start: vi.Mock };
  let mockLoggerService: { error: vi.Mock; warn: vi.Mock; info: vi.Mock };
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
    mockAppUpdateService = { start: vi.fn().mockResolvedValue(undefined) };
    mockLoggerService = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    mockTranslocoService = {
      setActiveLang: vi.fn(),
      load: vi.fn().mockReturnValue(translationLoad$)
    };
    mockAppConfigService = { loadDefaultLang: vi.fn().mockResolvedValue('en') };

    TestBed.configureTestingModule({
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AppUpdateService, useValue: mockAppUpdateService },
        { provide: APP_UPDATE_ENABLED, useValue: true },
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

  it('should set the <html> lang attribute to the runtime language', async () => {
    mockAppConfigService.loadDefaultLang.mockResolvedValue('fr');

    await TestBed.runInInjectionContext(() => initializeApp());

    expect(document.documentElement.lang).toBe('fr');
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

  it('should log a welcome message with the app name, version and hash', async () => {
    await TestBed.runInInjectionContext(() => initializeApp());

    expect(mockLoggerService.info).toHaveBeenCalledWith(expect.stringMatching(/^Welcome to .+ v.+ hash .+/));
  });

  it('should start AppUpdateService without awaiting it', async () => {
    let started = false;
    mockAppUpdateService.start.mockReturnValue(
      new Promise((resolve) => {
        // Settles after initializeApp: proves the start is not awaited.
        setTimeout(() => {
          started = true;
          resolve(undefined);
        }, 0);
      })
    );

    const promise = TestBed.runInInjectionContext(() => initializeApp());
    await promise;

    expect(mockAppUpdateService.start).toHaveBeenCalledTimes(1);
    expect(started).toBe(false);
  });

  it('should not start AppUpdateService in dev mode (no service worker is generated by ng serve)', async () => {
    TestBed.overrideProvider(APP_UPDATE_ENABLED, { useValue: false });

    await TestBed.runInInjectionContext(() => initializeApp());

    expect(mockAppUpdateService.start).not.toHaveBeenCalled();
  });
});
