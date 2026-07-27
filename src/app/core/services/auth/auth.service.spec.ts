/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AuthResyncService } from './auth-resync.service';
import { OidcClaims } from '@services/auth/oidc-claims.interface';
import { StorageService } from '@services/storage/storage.service';
import { NotificationService } from '@services/notification/notification.service';
import { User } from '@shared/domain';

import { TranslocoTestingModule } from '@jsverse/transloco';
interface UserinfoBody extends Partial<OidcClaims> {
  authenticated: boolean;
  oidcEnabled: boolean;
}

const userinfoOk = (body: UserinfoBody): Response =>
  ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body)
  }) as unknown as Response;

const userinfoStatus = (status: number): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue({})
  }) as unknown as Response;

describe('AuthService', () => {
  let service: AuthService;
  let authResyncService: AuthResyncService;
  let mockFetch: vi.Mock & typeof fetch;
  let originalFetch: typeof fetch;
  let usersTableMock: {
    get: vi.Mock;
    put: vi.Mock;
    toArray: vi.Mock;
  };
  let mockStorageService: Partial<StorageService>;
  let notificationServiceMock: { error: vi.Mock; warning: vi.Mock; success: vi.Mock; info: vi.Mock };

  const testClaims: OidcClaims = {
    email: 'user@example.com',
    sub: 'sub-123',
    given_name: 'Jane',
    family_name: 'Doe',
    roles: ['viewer']
  };

  const testOidcUser: User = {
    email: 'user@example.com',
    sub: 'sub-123',
    given_name: 'Jane',
    family_name: 'Doe',
    roles: ['viewer']
  };

  const testEmailOnlyUser: User = {
    email: 'user@example.com'
  };

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn() as vi.Mock & typeof fetch;
    globalThis.fetch = mockFetch;
    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      value: true
    });

    usersTableMock = {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      toArray: vi.fn().mockResolvedValue([])
    };

    mockStorageService = {
      db: { users: usersTableMock } as unknown as StorageService['db']
    };

    notificationServiceMock = {
      error: vi.fn(),
      warning: vi.fn(),
      success: vi.fn(),
      info: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        })],
      providers: [
        AuthService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });
    service = TestBed.inject(AuthService);
    authResyncService = TestBed.inject(AuthResyncService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default oidcEnabled to true and modeResolved to false (strict by default)', () => {
    expect(service.oidcEnabled()).toBe(true);
    expect(service.modeResolved()).toBe(false);
    expect(service.emailFallbackAllowed()).toBe(false);
  });

  describe('initialize — server returns active OIDC session', () => {
    it('should set oidcEnabled=true, upsert user, and set currentUser', async () => {
      mockFetch.mockResolvedValue(userinfoOk({ authenticated: true, oidcEnabled: true, ...testClaims }));

      await service.initialize();
      // No cached user: the network probe now runs in the background (never
      // blocks APP_INITIALIZER) — flush microtasks/macrotasks before asserting.
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(service.oidcEnabled()).toBe(true);
      expect(service.modeResolved()).toBe(true);
      expect(usersTableMock.put).toHaveBeenCalledWith(
        expect.objectContaining({ email: testOidcUser.email, sub: 'sub-123' })
      );
      expect(service.currentUser()?.email).toBe(testOidcUser.email);
    });
  });

  describe('initialize — fallback mode, no session, cache empty', () => {
    it('should set oidcEnabled=false and leave currentUser null', async () => {
      mockFetch.mockResolvedValue(userinfoOk({ authenticated: false, oidcEnabled: false }));

      await service.initialize();
      // No cached user: the network probe now runs in the background — flush it.
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(service.oidcEnabled()).toBe(false);
      expect(service.modeResolved()).toBe(true);
      expect(service.emailFallbackAllowed()).toBe(true);
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('initialize — fallback mode, cached email-only user', () => {
    it('should restore the cached email-only user from IndexedDB', async () => {
      mockFetch.mockResolvedValue(userinfoOk({ authenticated: false, oidcEnabled: false }));
      usersTableMock.toArray.mockResolvedValue([testEmailOnlyUser]);

      await service.initialize();
      // Email-only cache has no `sub`: the fast path is skipped and the mode/cache
      // fallback resolution now runs in the background — flush it.
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(service.currentUser()).toEqual(testEmailOnlyUser);
    });
  });

  describe('initialize — OIDC mode, no session, cache holds OIDC user (offline reuse)', () => {
    it('should restore a cached user that has a sub claim', async () => {
      mockFetch.mockResolvedValue(userinfoOk({ authenticated: false, oidcEnabled: true }));
      usersTableMock.toArray.mockResolvedValue([testOidcUser]);

      await service.initialize();

      expect(service.oidcEnabled()).toBe(true);
      expect(service.currentUser()).toEqual(testOidcUser);
    });
  });

  describe('initialize — OIDC mode rejects stale email-only cache', () => {
    it('should NOT restore a cached email-only user when oidcEnabled=true', async () => {
      mockFetch.mockResolvedValue(userinfoOk({ authenticated: false, oidcEnabled: true }));
      usersTableMock.toArray.mockResolvedValue([testEmailOnlyUser]);

      await service.initialize();

      expect(service.oidcEnabled()).toBe(true);
      expect(service.currentUser()).toBeNull();
    });

    it('should clear a user optimistically restored by the guard before the mode resolved', async () => {
      mockFetch.mockResolvedValue(userinfoOk({ authenticated: false, oidcEnabled: true }));
      usersTableMock.toArray.mockResolvedValue([testEmailOnlyUser]);
      // Simulates tryRestoreFromCache having restored the cached email-only
      // user while the mode probe was still in flight.
      service.currentUser.set(testEmailOnlyUser);

      await service.initialize();
      // The mode/cache resolution runs in the background — flush it.
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(service.oidcEnabled()).toBe(true);
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('initialize — network failure (offline)', () => {
    it('should trust an OIDC cached user instantly and eventually resolve the mode in the background', async () => {
      mockFetch.mockRejectedValue(new Error('Offline'));
      usersTableMock.toArray.mockResolvedValue([testOidcUser]);

      await service.initialize();
      // Cache-first: the cached OIDC user is trusted immediately; the network
      // resync runs in the background, so flush microtasks before asserting
      // the mode has resolved.
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Cache-first: the cached OIDC user is available immediately.
      expect(service.currentUser()).toEqual(testOidcUser);

      // The background resync (fire-and-forget) eventually settles modeResolved.
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(service.modeResolved()).toBe(true);
      expect(service.oidcEnabled()).toBe(true);
      expect(service.currentUser()).toEqual(testOidcUser);
    });

    it('should reject an email-only cached user when offline (strict default)', async () => {
      mockFetch.mockRejectedValue(new Error('Offline'));
      usersTableMock.toArray.mockResolvedValue([testEmailOnlyUser]);

      await service.initialize();

      expect(service.currentUser()).toBeNull();
    });

    it('should leave currentUser null when no cache and network fails', async () => {
      mockFetch.mockRejectedValue(new Error('Offline'));
      usersTableMock.toArray.mockResolvedValue([]);

      await service.initialize();

      expect(service.currentUser()).toBeNull();
    });
  });

  describe('initialize — server returns HTTP 401 (legacy contract)', () => {
    it('should treat 401 as OIDC required', async () => {
      mockFetch.mockResolvedValue(userinfoStatus(401));

      await service.initialize();
      // No cached user: the network probe now runs in the background — flush it.
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(service.oidcEnabled()).toBe(true);
      expect(service.modeResolved()).toBe(true);
      expect(service.serverSessionInvalid()).toBe(true);
    });
  });

  describe('initialize — cache-first fast path (instant startup for a proven OIDC user)', () => {
    it('should publish the cached OIDC user without waiting for the network probe', async () => {
      let resolveFetch: (value: Response) => void = () => undefined;
      mockFetch.mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
      );
      usersTableMock.toArray.mockResolvedValue([testOidcUser]);

      await service.initialize();

      // The cached user must be available immediately, before the (still
      // pending) network probe has any chance to resolve.
      expect(service.currentUser()).toEqual(testOidcUser);

      // Unblock the pending background probe so it doesn't leak into other tests.
      resolveFetch(userinfoOk({ authenticated: true, oidcEnabled: true, ...testClaims }));
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  describe('initialize — background resync after cache-first restore proves a mismatch', () => {
    it('should keep the cached user instantly available, then flag the mismatch once the background probe resolves', async () => {
      mockFetch.mockResolvedValue(userinfoStatus(403));
      usersTableMock.toArray.mockResolvedValue([testOidcUser]);

      await service.initialize();
      // Cache-first trusts the cached user momentarily, then the background
      // resync observes the 403 mismatch and drops it. Flush microtasks.
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Cache-first: the previously-authenticated user renders immediately.
      // Apache remains the authoritative enforcement layer for any real
      // protected request from this point on (see connexion-gaia.md §2).
      expect(service.currentUser()).toEqual(testOidcUser);

      // Flush the background resync microtasks.
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(service.serverSessionInvalid()).toBe(true);
    });
  });

  describe('initialize — backend 501 keeps offline cache usable', () => {
    it('should restore cached OIDC user when server returns 501', async () => {
      mockFetch.mockResolvedValue(userinfoStatus(501));
      usersTableMock.toArray.mockResolvedValue([testOidcUser]);

      await service.initialize();

      expect(service.serverSessionInvalid()).toBe(false);
      expect(service.currentUser()).toEqual(testOidcUser);
    });
  });

  describe('initialize — offline keeps cache restore despite previous mismatch', () => {
    it('should restore cached OIDC user when browser is offline', async () => {
      service.serverSessionInvalid.set(true);
      Object.defineProperty(globalThis.navigator, 'onLine', {
        configurable: true,
        value: false
      });
      mockFetch.mockRejectedValue(new Error('Offline'));
      usersTableMock.toArray.mockResolvedValue([testOidcUser]);

      await service.initialize();

      expect(service.currentUser()).toEqual(testOidcUser);
    });
  });

  describe('reconnect sync', () => {
    it('should refresh claims on browser online event when a cached user is active', async () => {
      usersTableMock.toArray.mockResolvedValue([testOidcUser]);
      mockFetch
        .mockRejectedValueOnce(new Error('Offline'))
        .mockResolvedValueOnce(
          userinfoOk({ authenticated: true, oidcEnabled: true, ...testClaims, given_name: 'Updated' })
        );

      await service.initialize();
      expect(service.currentUser()?.given_name).toBe('Jane');

      Object.defineProperty(globalThis.navigator, 'onLine', {
        configurable: true,
        value: true
      });
      globalThis.dispatchEvent(new Event('online'));
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(service.currentUser()?.given_name).toBe('Updated');
    });

    it('should not refresh on browser online event when no cached user exists', async () => {
      usersTableMock.toArray.mockResolvedValue([]);
      mockFetch.mockRejectedValueOnce(new Error('Offline'));

      await service.initialize();
      expect(service.currentUser()).toBeNull();

      Object.defineProperty(globalThis.navigator, 'onLine', {
        configurable: true,
        value: true
      });
      globalThis.dispatchEvent(new Event('online'));
      await Promise.resolve();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry the OIDC login redirect when reconnect sync still proves the session invalid', async () => {
      globalThis.sessionStorage.clear();
      usersTableMock.toArray.mockResolvedValue([testOidcUser]);
      mockFetch.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(userinfoStatus(401));

      await service.initialize();
      expect(service.currentUser()).toEqual(testOidcUser);

      const redirectSpy = vi.spyOn(authResyncService, 'navigateToOidcLogin').mockImplementation(() => undefined);

      Object.defineProperty(globalThis.navigator, 'onLine', {
        configurable: true,
        value: true
      });
      globalThis.dispatchEvent(new Event('online'));
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(service.serverSessionInvalid()).toBe(true);
      expect(redirectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('initialize — never deletes users', () => {
    it('should never call clear on the users table', async () => {
      mockFetch.mockResolvedValue(userinfoOk({ authenticated: true, oidcEnabled: true, ...testClaims }));

      await service.initialize();

      const usersTable = mockStorageService.db!.users as unknown as Record<string, unknown>;
      expect(usersTable['clear']).toBeUndefined();
    });
  });

  describe('refreshFromNetwork', () => {
    it('should return null when fetch returns non-ok response', async () => {
      mockFetch.mockResolvedValue(userinfoStatus(500));
      const result = await service.refreshFromNetwork();
      expect(result).toBeNull();
      expect(usersTableMock.put).not.toHaveBeenCalled();
    });

    it('should return null when fetch throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const result = await service.refreshFromNetwork();
      expect(result).toBeNull();
    });

    it('should pass an AbortSignal to the userinfo fetch so a hanging network never blocks startup', async () => {
      mockFetch.mockResolvedValue(userinfoOk({ authenticated: false, oidcEnabled: false }));
      await service.refreshFromNetwork();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/userinfo'),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('should treat an aborted (timed-out) fetch as a transient error, never as a proven mismatch', async () => {
      mockFetch.mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'));

      const result = await service.refreshFromNetwork();

      expect(result).toBeNull();
      expect(service.serverSessionInvalid()).toBe(false);
      expect(service.modeResolved()).toBe(true);
    });

    it('should preserve existing user fields when upserting OIDC claims', async () => {
      const existingUser: User = { email: 'user@example.com', uuid: 'uuid-1', studies: [] };
      usersTableMock.get.mockResolvedValue(existingUser);
      mockFetch.mockResolvedValue(userinfoOk({ authenticated: true, oidcEnabled: true, ...testClaims }));

      await service.refreshFromNetwork();

      expect(usersTableMock.put).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          uuid: 'uuid-1',
          studies: [],
          sub: 'sub-123',
          given_name: 'Jane'
        })
      );
    });

    it('should return null when userinfo is authenticated but missing email', async () => {
      mockFetch.mockResolvedValue(userinfoOk({ authenticated: true, oidcEnabled: true, sub: 'sub-123' }));
      const result = await service.refreshFromNetwork();
      expect(result).toBeNull();
      expect(usersTableMock.put).not.toHaveBeenCalled();
    });

    it('should return null when userinfo email is whitespace-only', async () => {
      mockFetch.mockResolvedValue(userinfoOk({ authenticated: true, oidcEnabled: true, email: '   ', sub: 'sub-123' }));
      const result = await service.refreshFromNetwork();
      expect(result).toBeNull();
    });

    it('should return null when authenticated=false even with claims-shaped body', async () => {
      mockFetch.mockResolvedValue(userinfoOk({ authenticated: false, oidcEnabled: false, ...testClaims }));
      const result = await service.refreshFromNetwork();
      expect(result).toBeNull();
    });

    it('should return null when response is not valid JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new Error('bad json'))
      } as unknown as Response);
      const result = await service.refreshFromNetwork();
      expect(result).toBeNull();
    });
  });

  describe('loginWithEmail — fallback mode allowed', () => {
    beforeEach(() => {
      service.oidcEnabled.set(false);
      service.modeResolved.set(true);
    });

    it('should create a user with the given email and set currentUser', async () => {
      usersTableMock.get.mockResolvedValue(undefined);
      const user = await service.loginWithEmail('new@example.com');
      expect(usersTableMock.put).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }));
      expect(service.currentUser()?.email).toBe('new@example.com');
      expect(user.email).toBe('new@example.com');
    });

    it('should preserve existing user fields when email matches an existing user', async () => {
      const existingUser: User = { email: 'existing@example.com', uuid: 'uuid-1', studies: [] };
      usersTableMock.get.mockResolvedValue(existingUser);
      const user = await service.loginWithEmail('existing@example.com');
      expect(user.uuid).toBe('uuid-1');
    });
  });

  describe('loginWithEmail — OIDC mode forbids email login', () => {
    it('should throw and notify when oidcEnabled is true', async () => {
      service.oidcEnabled.set(true);

      await expect(service.loginWithEmail('hacker@example.com')).rejects.toThrow();
      expect(usersTableMock.put).not.toHaveBeenCalled();
      expect(notificationServiceMock.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('tryRestoreFromCache', () => {
    it('should set currentUser and return true when an OIDC cached user exists', async () => {
      usersTableMock.toArray.mockResolvedValue([testOidcUser]);
      const result = await service.tryRestoreFromCache();
      expect(result).toBe(true);
      expect(service.currentUser()?.email).toBe(testOidcUser.email);
    });

    it('should return false when no cached user exists', async () => {
      usersTableMock.toArray.mockResolvedValue([]);
      const result = await service.tryRestoreFromCache();
      expect(result).toBe(false);
      expect(service.currentUser()).toBeNull();
    });

    it('should reject an email-only cached user when the resolved mode is OIDC', async () => {
      service.oidcEnabled.set(true);
      service.modeResolved.set(true);
      usersTableMock.toArray.mockResolvedValue([testEmailOnlyUser]);
      const result = await service.tryRestoreFromCache();
      expect(result).toBe(false);
      expect(service.currentUser()).toBeNull();
    });

    it('should restore an email-only cached user while the mode is still unresolved', async () => {
      // Regression test: on a fresh page load `oidcEnabled` holds its strict
      // default (true) until the /auth/userinfo probe lands. The guard must
      // not discard a cached fallback-mode user on that default, otherwise
      // every full reload bounces to /login (dev-mode race).
      service.oidcEnabled.set(true);
      service.modeResolved.set(false);
      usersTableMock.toArray.mockResolvedValue([testEmailOnlyUser]);
      const result = await service.tryRestoreFromCache();
      expect(result).toBe(true);
      expect(service.currentUser()).toEqual(testEmailOnlyUser);
    });

    it('should accept an email-only cached user in fallback mode', async () => {
      service.oidcEnabled.set(false);
      usersTableMock.toArray.mockResolvedValue([testEmailOnlyUser]);
      const result = await service.tryRestoreFromCache();
      expect(result).toBe(true);
      expect(service.currentUser()).toEqual(testEmailOnlyUser);
    });

    it('should refuse cache restore when server mismatch is explicit and browser is online', async () => {
      service.serverSessionInvalid.set(true);
      usersTableMock.toArray.mockResolvedValue([testOidcUser]);

      const result = await service.tryRestoreFromCache();

      expect(result).toBe(false);
      expect(service.currentUser()).toBeNull();
    });

    it('should allow cache restore when server mismatch is set but browser is offline', async () => {
      service.serverSessionInvalid.set(true);
      Object.defineProperty(globalThis.navigator, 'onLine', {
        configurable: true,
        value: false
      });
      usersTableMock.toArray.mockResolvedValue([testOidcUser]);

      const result = await service.tryRestoreFromCache();

      expect(result).toBe(true);
      expect(service.currentUser()).toEqual(testOidcUser);
    });
  });

  describe('markServerMismatchFromStatus', () => {
    it('should set mismatch for explicit auth status', () => {
      service.markServerMismatchFromStatus(403);
      expect(service.serverSessionInvalid()).toBe(true);
    });

    it('should ignore non-auth status', () => {
      service.markServerMismatchFromStatus(500);
      expect(service.serverSessionInvalid()).toBe(false);
    });

    it('should ignore 501 status', () => {
      service.markServerMismatchFromStatus(501);
      expect(service.serverSessionInvalid()).toBe(false);
    });
  });
});
