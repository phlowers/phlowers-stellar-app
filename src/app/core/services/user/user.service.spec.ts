import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { UserEntity } from '@infrastructure/database';
import { StorageService } from '@core/services/storage/storage.service';

describe('UserService', () => {
  let service: UserService;
  let storageServiceMock: Partial<StorageService>;
  let usersTableMock: { toArray: vi.Mock };

  const testUser: UserEntity = { email: 'test@example.com' };

  beforeEach(() => {
    usersTableMock = {
      toArray: vi.fn().mockResolvedValue([])
    };
    storageServiceMock = {
      db: { users: usersTableMock } as unknown as StorageService['db']
    };
    TestBed.configureTestingModule({
      providers: [UserService, { provide: StorageService, useValue: storageServiceMock }]
    });
    service = TestBed.inject(UserService);
  });

  describe('getUser', () => {
    it('should return the user if exactly one exists', async () => {
      usersTableMock.toArray.mockResolvedValue([testUser]);
      const user = await service.getUser();
      expect(user).toEqual(testUser);
    });

    it('should return the first user when multiple users exist (no deletion)', async () => {
      const secondUser = { email: 'other@example.com' };
      usersTableMock.toArray.mockResolvedValue([testUser, secondUser]);
      const user = await service.getUser();
      expect(user).toEqual(testUser);
    });

    it('should return null when no users exist', async () => {
      usersTableMock.toArray.mockResolvedValue([]);
      const user = await service.getUser();
      expect(user).toBeNull();
    });
  });
});
