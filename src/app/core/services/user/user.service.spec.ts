import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { UserEntity } from '@infrastructure/database';
import { StorageService } from '@core/services/storage/storage.service';
import { BehaviorSubject } from 'rxjs';

describe('UserService', () => {
  let service: UserService;
  let storageServiceMock: Partial<StorageService>;
  let usersTableMock: { get: vi.Mock; put: vi.Mock; toArray: vi.Mock; add: vi.Mock; clear: vi.Mock };
  let readySubject: BehaviorSubject<boolean>;

  const testUser: UserEntity = { email: 'test@example.com' };

  beforeEach(() => {
    usersTableMock = {
      get: vi.fn(),
      put: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn(),
      clear: vi.fn()
    };
    readySubject = new BehaviorSubject<boolean>(true);
    storageServiceMock = {
      db: { users: usersTableMock } as unknown as StorageService['db'],
      ready$: readySubject.asObservable()
    };
    TestBed.configureTestingModule({
      providers: [UserService, { provide: StorageService, useValue: storageServiceMock }]
    });
    service = TestBed.inject(UserService);
  });

  describe('createUser', () => {
    it('should create a new user if none exists and email is valid', async () => {
      usersTableMock.toArray.mockResolvedValue([]);
      usersTableMock.add.mockResolvedValue(undefined);
      await service.createUser(testUser);
      expect(usersTableMock.add).toHaveBeenCalledWith({ ...testUser });
    });

    it('should throw if a user already exists', async () => {
      usersTableMock.toArray.mockResolvedValue([testUser]);
      await expect(service.createUser(testUser)).rejects.toThrow('User already exists');
      expect(usersTableMock.add).not.toHaveBeenCalled();
    });

    it('should throw if email is invalid', async () => {
      usersTableMock.toArray.mockResolvedValue([]);
      const invalidUser = { email: 'invalid' };
      await expect(service.createUser(invalidUser as UserEntity)).rejects.toThrow('Invalid email');
      expect(usersTableMock.add).not.toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    it('should return the user if exactly one exists', async () => {
      usersTableMock.toArray.mockResolvedValue([testUser]);
      const user = await service.getUser();
      expect(user).toEqual(testUser);
    });

    it('should clear users and return null if not exactly one user', async () => {
      usersTableMock.toArray.mockResolvedValue([]);
      usersTableMock.clear.mockResolvedValue(undefined);
      const user = await service.getUser();
      expect(usersTableMock.clear).toHaveBeenCalled();
      expect(user).toBeNull();
    });
  });
});
