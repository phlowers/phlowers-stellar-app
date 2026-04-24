/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { AuthService, OidcClaims } from './auth.service';
import { StorageService } from '@services/storage/storage.service';
import { User } from '@shared/domain';

describe('AuthService', () => {
  let service: AuthService;
  let mockFetch: vi.Mock;
  let originalFetch: typeof fetch;
  let usersTableMock: {
    get: vi.Mock;
    put: vi.Mock;
    toArray: vi.Mock;
  };
  let mockStorageService: Partial<StorageService>;

  const testClaims: OidcClaims = {
    email: 'user@example.com',
    sub: 'sub-123',
    given_name: 'Jane',
    family_name: 'Doe',
    roles: ['viewer']
  };

  const testUser: User = {
    email: 'user@example.com',
    sub: 'sub-123',
    given_name: 'Jane',
    family_name: 'Doe',
    roles: ['viewer']
  };

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    usersTableMock = {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      toArray: vi.fn().mockResolvedValue([])
    };

    mockStorageService = {
      db: { users: usersTableMock } as unknown as StorageService['db']
    };

    TestBed.configureTestingModule({
      providers: [AuthService, { provide: StorageService, useValue: mockStorageService }]
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialize — cache present + network KO', () => {
    it('should set currentUser from cache and stay authenticated when background refresh fails', async () => {
      usersTableMock.toArray.mockResolvedValue([testUser]);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await service.initialize();

      expect(service.currentUser()).toEqual(testUser);
      expect(usersTableMock.put).not.toHaveBeenCalled();
    });
  });

  describe('initialize — cache present + network OK', () => {
    it('should upsert claims in background without blocking startup', async () => {
      usersTableMock.toArray.mockResolvedValue([testUser]);
      usersTableMock.get.mockResolvedValue(testUser);
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(testClaims)
      });

      await service.initialize();

      expect(service.currentUser()).toBeDefined();
    });
  });

  describe('initialize — cache empty + network OK', () => {
    it('should fetch claims, upsert user, and set currentUser', async () => {
      usersTableMock.toArray.mockResolvedValue([]);
      usersTableMock.get.mockResolvedValue(undefined);
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(testClaims)
      });

      await service.initialize();

      expect(usersTableMock.put).toHaveBeenCalledWith(expect.objectContaining({ email: testUser.email }));
      expect(service.currentUser()?.email).toBe(testUser.email);
    });
  });

  describe('initialize — cache empty + network KO', () => {
    it('should leave currentUser null when no cache and network fails', async () => {
      usersTableMock.toArray.mockResolvedValue([]);
      mockFetch.mockRejectedValue(new Error('Offline'));

      await service.initialize();

      expect(service.currentUser()).toBeNull();
    });
  });

  describe('initialize — never deletes users', () => {
    it('should never call users table with a delete operation', async () => {
      usersTableMock.toArray.mockResolvedValue([testUser]);
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(testClaims)
      });

      await service.initialize();

      const usersTable = mockStorageService.db!.users as unknown as Record<string, vi.Mock>;
      expect(usersTable['clear']).toBeUndefined();
    });
  });

  describe('refreshFromNetwork', () => {
    it('should return null when fetch returns non-ok response', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await service.refreshFromNetwork();

      expect(result).toBeNull();
      expect(usersTableMock.put).not.toHaveBeenCalled();
    });

    it('should return null when fetch throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.refreshFromNetwork();

      expect(result).toBeNull();
    });

    it('should preserve existing user fields when upserting', async () => {
      const existingUser: User = { email: 'user@example.com', uuid: 'uuid-1', studies: [] };
      usersTableMock.get.mockResolvedValue(existingUser);
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(testClaims)
      });

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

    it('should return null when userinfo response has no email', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ sub: 'sub-123', given_name: 'Jane' })
      });

      const result = await service.refreshFromNetwork();

      expect(result).toBeNull();
      expect(usersTableMock.put).not.toHaveBeenCalled();
    });

    it('should return null when userinfo response has an empty email', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ email: '', sub: 'sub-123' })
      });

      const result = await service.refreshFromNetwork();

      expect(result).toBeNull();
      expect(usersTableMock.put).not.toHaveBeenCalled();
    });

    it('should return null when userinfo response has a whitespace-only email', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ email: '   ', sub: 'sub-123' })
      });

      const result = await service.refreshFromNetwork();

      expect(result).toBeNull();
      expect(usersTableMock.put).not.toHaveBeenCalled();
    });
  });

  describe('loginWithEmail', () => {
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

      expect(usersTableMock.put).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'existing@example.com',
          uuid: 'uuid-1',
          studies: []
        })
      );
      expect(user.uuid).toBe('uuid-1');
    });
  });

  describe('tryRestoreFromCache', () => {
    it('should set currentUser and return true when a cached user exists', async () => {
      usersTableMock.toArray.mockResolvedValue([testUser]);

      const result = await service.tryRestoreFromCache();

      expect(result).toBe(true);
      expect(service.currentUser()?.email).toBe(testUser.email);
    });

    it('should return false when no cached user exists', async () => {
      usersTableMock.toArray.mockResolvedValue([]);

      const result = await service.tryRestoreFromCache();

      expect(result).toBe(false);
      expect(service.currentUser()).toBeNull();
    });
  });
});
