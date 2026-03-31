import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { UserService } from '@services/user/user.service';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
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
      ready$: new BehaviorSubject<boolean>(false),
      db: { users: { toArray: vi.fn().mockResolvedValue([]) } }
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: StorageService, useValue: mockStorageService }
      ]
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    // Reset URL to clean state
    globalThis.history?.replaceState(null, '', '/');
  });

  /** Set URL query params to simulate an OIDC callback redirect. */
  function setOidcUrlParams(email: string, displayName?: string): void {
    const params = new URLSearchParams({ oidc_email: email });
    if (displayName) {
      params.set('oidc_name', displayName);
    }
    globalThis.history?.replaceState(null, '', `/?${params.toString()}`);
  }

  it('should start with no authenticated user', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  describe('initialize', () => {
    it('should set up persistent storage and create database', async () => {
      await service.initialize();

      expect(mockStorageService.setPersistentStorage).toHaveBeenCalledTimes(1);
      expect(mockStorageService.createDatabase).toHaveBeenCalledTimes(1);
    });

    it('should authenticate when OIDC callback params are in the URL', async () => {
      setOidcUrlParams('user@example.com', 'Test User');

      mockUserService.getUser.mockResolvedValueOnce(null).mockResolvedValueOnce({ email: 'user@example.com' });

      await service.initialize();

      expect(mockUserService.createUser).toHaveBeenCalledWith({ email: 'user@example.com' });
      expect(service.currentUser()).toEqual({ email: 'user@example.com' });
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should clean URL params after reading them', async () => {
      setOidcUrlParams('user@example.com', 'Test');

      mockUserService.getUser.mockResolvedValueOnce(null).mockResolvedValueOnce({ email: 'user@example.com' });

      await service.initialize();

      expect(globalThis.location.search).toBe('');
    });

    it('should skip user creation when local user matches OIDC identity', async () => {
      setOidcUrlParams('user@example.com');

      mockUserService.getUser.mockResolvedValue({ email: 'user@example.com' });

      await service.initialize();

      expect(mockUserService.createUser).not.toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should reset database when OIDC user differs from local user', async () => {
      setOidcUrlParams('new@example.com');

      mockUserService.getUser
        .mockResolvedValueOnce({ email: 'old@example.com' })
        .mockResolvedValueOnce({ email: 'new@example.com' });

      await service.initialize();

      expect(mockStorageService.resetDatabase).toHaveBeenCalledTimes(1);
      expect(mockUserService.createUser).toHaveBeenCalledWith({ email: 'new@example.com' });
    });

    it('should fall back to IndexedDB user when no URL params (returning user)', async () => {
      const offlineUser = { email: 'cached@example.com', uuid: 'abc' };
      mockUserService.getUser.mockResolvedValue(offlineUser);

      await service.initialize();

      expect(service.currentUser()).toEqual(offlineUser);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should be unauthenticated when no URL params and no local user', async () => {
      mockUserService.getUser.mockResolvedValue(null);

      await service.initialize();

      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should not throw and set isAuthenticated to false on database failure', async () => {
      mockStorageService.createDatabase.mockRejectedValue(new Error('IndexedDB blocked'));

      await service.initialize();

      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
    });

    it('should tolerate createUser throwing (race condition)', async () => {
      setOidcUrlParams('user@example.com');

      mockUserService.getUser.mockResolvedValueOnce(null).mockResolvedValueOnce({ email: 'user@example.com' });
      mockUserService.createUser.mockRejectedValue(new Error('User already exists'));

      await service.initialize();

      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.email).toBe('user@example.com');
    });
  });
});
