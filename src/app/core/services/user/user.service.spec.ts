import { UserService } from './user.service';
import { UserModel } from '../../data/models/user.model';
import { BehaviorSubject } from 'rxjs';

describe('UserService', () => {
  let service: UserService;
  let storageServiceMock: any;
  let usersTableMock: any;
  let readySubject: BehaviorSubject<boolean>;

  const testUser: UserModel = { email: 'test@example.com' };

  beforeEach(() => {
    usersTableMock = {
      toArray: jest.fn(),
      add: jest.fn(),
      clear: jest.fn()
    };
    readySubject = new BehaviorSubject<boolean>(true);
    storageServiceMock = {
      db: { users: usersTableMock },
      ready$: readySubject.asObservable()
    };
    service = new UserService(storageServiceMock);
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
      await expect(service.createUser(testUser)).rejects.toThrow(
        'User already exists'
      );
      expect(usersTableMock.add).not.toHaveBeenCalled();
    });

    it('should throw if email is invalid', async () => {
      usersTableMock.toArray.mockResolvedValue([]);
      const invalidUser = { email: 'invalid' };
      await expect(
        service.createUser(invalidUser as UserModel)
      ).rejects.toThrow('Invalid email');
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
