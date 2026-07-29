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
import { TranslocoService } from '@jsverse/transloco';

describe('initializeApp', () => {
  let mockStorageService: { setPersistentStorage: vi.Mock; createDatabase: vi.Mock };
  let mockAuthService: { initialize: vi.Mock };
  let mockUpdateService: { checkForUpdateOnce: vi.Mock };
  let mockLoggerService: { error: vi.Mock };
  let mockTranslocoService: { getActiveLang: vi.Mock; load: vi.Mock };
  let translationLoad$: Subject<unknown>;

  beforeEach(() => {
    translationLoad$ = new Subject<unknown>();

    mockStorageService = {
      setPersistentStorage: vi.fn().mockResolvedValue(undefined),
      createDatabase: vi.fn().mockResolvedValue(undefined)
    };
    mockAuthService = { initialize: vi.fn().mockResolvedValue(undefined) };
    mockUpdateService = { checkForUpdateOnce: vi.fn().mockResolvedValue(undefined) };
    mockLoggerService = { error: vi.fn() };
    mockTranslocoService = {
      getActiveLang: vi.fn().mockReturnValue('en'),
      load: vi.fn().mockReturnValue(translationLoad$)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UpdateService, useValue: mockUpdateService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: TranslocoService, useValue: mockTranslocoService }
      ]
    });
  });

  it('should not resolve until the translation file has finished loading', async () => {
    let resolved = false;
    const promise = TestBed.runInInjectionContext(() => initializeApp()).then(() => {
      resolved = true;
    });

    // Storage/auth chain already resolved (real microtasks), but translations haven't emitted yet.
    await Promise.resolve();
    await Promise.resolve();
    expect(resolved).toBe(false);

    translationLoad$.next({});
    translationLoad$.complete();
    await promise;

    expect(resolved).toBe(true);
  });

  it('should load translations for the active lang in parallel with storage/auth init', async () => {
    const promise = TestBed.runInInjectionContext(() => initializeApp());
    translationLoad$.next({});
    translationLoad$.complete();
    await promise;

    expect(mockTranslocoService.getActiveLang).toHaveBeenCalled();
    expect(mockTranslocoService.load).toHaveBeenCalledWith('en');
    expect(mockStorageService.setPersistentStorage).toHaveBeenCalled();
    expect(mockStorageService.createDatabase).toHaveBeenCalled();
    expect(mockAuthService.initialize).toHaveBeenCalled();
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
    translationLoad$.next({});
    translationLoad$.complete();
    await promise;

    expect(mockUpdateService.checkForUpdateOnce).toHaveBeenCalled();
    expect(updateCheckResolved).toBe(false);
  });
});
