/**
 * Functional tests for the authentication flow.
 *
 * These tests validate the complete auth lifecycle integrating
 * AuthService and authGuard together:
 * - OIDC callback URL params → user stored in IndexedDB → guard allows
 * - No params + existing IndexedDB user → offline access
 * - No params + no user → guard redirects to login
 * - User switch via different OIDC identity → database reset
 * - Ctrl+F5 persistence via IndexedDB
 */
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { AuthService } from '@services/auth/auth.service';
import { UserService } from '@services/user/user.service';
import { StorageService } from '@services/storage/storage.service';
import { WINDOW } from '@core/tokens/window.token';
import { authGuard } from '@core/guards/auth.guard';
import { environment } from '@src/environments/environment';
import { BehaviorSubject } from 'rxjs';

@Component({ standalone: true, template: '<p>Home</p>' })
class MockHomeComponent {}

const MOCK_ROUTE = {} as ActivatedRouteSnapshot;
const MOCK_STATE = {} as RouterStateSnapshot;

/** Set URL query params to simulate an OIDC callback redirect. */
function setOidcUrlParams(email: string, displayName?: string): void {
  const params = new URLSearchParams({ oidc_email: email });
  if (displayName) {
    params.set('oidc_name', displayName);
  }
  globalThis.history?.replaceState(null, '', `/?${params.toString()}`);
}

describe('Authentication Flow - Functional Tests', () => {
  let authService: AuthService;
  let mockUserService: {
    getUser: ReturnType<typeof vi.fn>;
    createUser: ReturnType<typeof vi.fn>;
    user$: BehaviorSubject<unknown>;
  };
  let mockStorageService: {
    setPersistentStorage: ReturnType<typeof vi.fn>;
    createDatabase: ReturnType<typeof vi.fn>;
    resetDatabase: ReturnType<typeof vi.fn>;
    ready$: BehaviorSubject<boolean>;
    db: unknown;
  };
  let mockWindow: { location: { href: string } };

  beforeEach(() => {
    mockUserService = {
      getUser: vi.fn().mockResolvedValue(null),
      createUser: vi.fn().mockResolvedValue(undefined),
      user$: new BehaviorSubject(null)
    };

    mockStorageService = {
      setPersistentStorage: vi.fn().mockResolvedValue(undefined),
      createDatabase: vi.fn().mockResolvedValue(undefined),
      resetDatabase: vi.fn().mockResolvedValue(undefined),
      ready$: new BehaviorSubject<boolean>(true),
      db: { users: { toArray: vi.fn().mockResolvedValue([]) } }
    };

    mockWindow = { location: { href: '/' } };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: MockHomeComponent, canActivate: [authGuard] }]),
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: WINDOW, useValue: mockWindow }
      ]
    });

    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    globalThis.history?.replaceState(null, '', '/');
  });

  describe('Scenario: First login with OIDC callback params → guard allows access', () => {
    it('should create local user, authenticate, and guard should return true', async () => {
      setOidcUrlParams('alice@company.com', 'Alice');

      mockUserService.getUser
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ email: 'alice@company.com', uuid: '1' });

      await authService.initialize();

      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.currentUser()?.email).toBe('alice@company.com');
      expect(mockUserService.createUser).toHaveBeenCalledWith({ email: 'alice@company.com' });

      TestBed.runInInjectionContext(() => {
        expect(authGuard(MOCK_ROUTE, MOCK_STATE)).toBe(true);
      });
    });
  });

  describe('Scenario: Returning user (no params, user in IndexedDB)', () => {
    it('should reuse existing local user without database reset', async () => {
      mockUserService.getUser.mockResolvedValue({ email: 'alice@company.com', uuid: '1' });

      await authService.initialize();

      expect(authService.isAuthenticated()).toBe(true);
      expect(mockUserService.createUser).not.toHaveBeenCalled();
      expect(mockStorageService.resetDatabase).not.toHaveBeenCalled();

      TestBed.runInInjectionContext(() => {
        expect(authGuard(MOCK_ROUTE, MOCK_STATE)).toBe(true);
      });
    });
  });

  describe('Scenario: Offline access (no params, existing local user)', () => {
    it('should grant access using cached IndexedDB user', async () => {
      mockUserService.getUser.mockResolvedValue({ email: 'alice@company.com', uuid: '1' });

      await authService.initialize();

      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.currentUser()?.email).toBe('alice@company.com');

      TestBed.runInInjectionContext(() => {
        expect(authGuard(MOCK_ROUTE, MOCK_STATE)).toBe(true);
      });
    });
  });

  describe('Scenario: No params and no local user → guard redirects', () => {
    it('should deny access and redirect to OIDC login URL', async () => {
      mockUserService.getUser.mockResolvedValue(null);

      await authService.initialize();

      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.currentUser()).toBeNull();

      TestBed.runInInjectionContext(() => {
        const result = authGuard(MOCK_ROUTE, MOCK_STATE);
        expect(result).toBe(false);
        expect(mockWindow.location.href).toBe(environment.oidcLoginUrl);
      });
    });
  });

  describe('Scenario: User switch (different OIDC identity)', () => {
    it('should reset database, create new user, and grant access', async () => {
      setOidcUrlParams('bob@company.com', 'Bob');

      mockUserService.getUser
        .mockResolvedValueOnce({ email: 'alice@company.com', uuid: '1' })
        .mockResolvedValueOnce({ email: 'bob@company.com', uuid: '2' });

      await authService.initialize();

      expect(mockStorageService.resetDatabase).toHaveBeenCalledTimes(1);
      expect(mockUserService.createUser).toHaveBeenCalledWith({ email: 'bob@company.com' });
      expect(authService.currentUser()?.email).toBe('bob@company.com');

      TestBed.runInInjectionContext(() => {
        expect(authGuard(MOCK_ROUTE, MOCK_STATE)).toBe(true);
      });
    });
  });

  describe('Scenario: Persistence — user never disconnected (Ctrl+F5)', () => {
    it('should remain authenticated across successive initializations', async () => {
      // First initialization: user arrives from OIDC callback
      setOidcUrlParams('alice@company.com', 'Alice');
      mockUserService.getUser
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ email: 'alice@company.com', uuid: '1' });

      await authService.initialize();
      expect(authService.isAuthenticated()).toBe(true);

      // Simulate Ctrl+F5: no URL params, but user is in IndexedDB
      globalThis.history?.replaceState(null, '', '/');
      vi.clearAllMocks();
      mockUserService.getUser.mockResolvedValue({ email: 'alice@company.com', uuid: '1' });

      await authService.initialize();
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.currentUser()?.email).toBe('alice@company.com');
      expect(mockStorageService.resetDatabase).not.toHaveBeenCalled();
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: createUser race condition — User already exists', () => {
    it('should not crash if createUser throws and still authenticate', async () => {
      setOidcUrlParams('alice@company.com');

      mockUserService.getUser
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ email: 'alice@company.com', uuid: '1' });
      mockUserService.createUser.mockRejectedValue(new Error('User already exists'));

      await authService.initialize();

      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.currentUser()?.email).toBe('alice@company.com');
    });
  });

  describe('Scenario: initialize never throws even on catastrophic failure', () => {
    it('should set isAuthenticated to false if database fails', async () => {
      mockStorageService.createDatabase.mockRejectedValue(new Error('IndexedDB blocked'));

      await authService.initialize();

      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.currentUser()).toBeNull();
    });
  });
});
