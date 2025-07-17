/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { StudiesService } from './studies.service';
import { StorageService } from '../storage/storage.service';
import { StudyModel } from '../../data/models/study.model';
import { Study } from '../../data/database/interfaces/study';
import { BehaviorSubject } from 'rxjs';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

describe('StudiesService', () => {
  let service: StudiesService;
  let mockStorageService: jest.Mocked<StorageService>;
  let mockDb: any;
  let readySubject: BehaviorSubject<boolean>;

  const mockUser = {
    email: 'test@example.com',
    uuid: 'user-uuid-123'
  };

  const mockStudy: StudyModel = {
    uuid: '',
    author_email: '',
    title: 'Test Study',
    description: 'Test Description',
    shareable: true,
    created_at_offline: '',
    updated_at_offline: '',
    saved: false
  };

  const mockStudyFromDb: Study = {
    ...mockStudy,
    uuid: 'existing-uuid-123',
    author_email: 'test@example.com',
    created_at_offline: '2025-01-01T00:00:00.000Z',
    updated_at_offline: '2025-01-01T00:00:00.000Z',
    saved: true
  };

  beforeEach(() => {
    readySubject = new BehaviorSubject<boolean>(false);

    mockDb = {
      users: {
        toArray: jest.fn().mockResolvedValue([mockUser])
      },
      studies: {
        add: jest.fn().mockResolvedValue(undefined),
        toArray: jest.fn().mockResolvedValue([]),
        get: jest.fn().mockResolvedValue(mockStudyFromDb),
        delete: jest.fn().mockResolvedValue(undefined),
        orderBy: jest.fn().mockReturnThis(),
        reverse: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis()
      }
    };

    mockStorageService = {
      ready$: readySubject,
      db: mockDb
    } as unknown as jest.Mocked<StorageService>;

    TestBed.configureTestingModule({
      providers: [
        StudiesService,
        { provide: StorageService, useValue: mockStorageService }
      ]
    });

    service = TestBed.inject(StudiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with ready as false', () => {
      expect(service.ready.value).toBeFalsy();
    });

    it('should initialize with empty studies array', () => {
      expect(service.studies.value).toEqual([]);
    });

    it('should subscribe to storage service ready$ and update ready subject', () => {
      readySubject.next(true);
      expect(service.ready.value).toBeTruthy();
    });
  });

  describe('createStudy', () => {
    it('should create a new study successfully', async () => {
      const studiesSpy = jest.spyOn(service.studies, 'next');
      mockDb.studies.toArray.mockResolvedValue([mockStudyFromDb]);

      await service.createStudy(mockStudy);

      expect(mockDb.users.toArray).toHaveBeenCalled();
      expect(mockDb.studies.add).toHaveBeenCalledWith({
        ...mockStudy,
        uuid: 'mock-uuid-123',
        author_email: mockUser.email,
        created_at_offline: expect.any(String),
        updated_at_offline: expect.any(String),
        saved: false
      });
      expect(mockDb.studies.toArray).toHaveBeenCalled();
      expect(studiesSpy).toHaveBeenCalledWith([mockStudyFromDb]);
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      mockDb.studies.add.mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.createStudy(mockStudy)).rejects.toThrow(
        'Database error'
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStudies', () => {
    it('should return all studies from database', async () => {
      const mockStudies = [mockStudyFromDb];
      mockDb.studies.toArray.mockResolvedValue(mockStudies);

      const result = await service.getStudies();

      expect(mockDb.studies.toArray).toHaveBeenCalled();
      expect(result).toEqual(mockStudies);
    });

    it('should return undefined when database is not available', async () => {
      (mockStorageService as any).db = undefined;

      const result = await service.getStudies();

      expect(result).toBeUndefined();
    });
  });

  describe('duplicateStudy', () => {
    it('should duplicate a study successfully', async () => {
      const studiesSpy = jest.spyOn(service.studies, 'next');
      const mockDuplicatedStudies = [
        mockStudyFromDb,
        { ...mockStudyFromDb, uuid: 'new-uuid' }
      ];
      mockDb.studies.toArray.mockResolvedValue(mockDuplicatedStudies);

      await service.duplicateStudy('existing-uuid-123');

      expect(mockDb.studies.get).toHaveBeenCalledWith('existing-uuid-123');
      expect(mockDb.studies.add).toHaveBeenCalledWith({
        ...mockStudyFromDb,
        uuid: 'mock-uuid-123',
        created_at_offline: expect.any(String),
        updated_at_offline: expect.any(String),
        saved: false
      });
      expect(mockDb.studies.toArray).toHaveBeenCalled();
      expect(studiesSpy).toHaveBeenCalledWith(mockDuplicatedStudies);
    });

    it('should handle case when study does not exist', async () => {
      mockDb.studies.get.mockResolvedValue(undefined);
      const studiesSpy = jest.spyOn(service.studies, 'next');

      await service.duplicateStudy('non-existent-uuid');

      expect(mockDb.studies.get).toHaveBeenCalledWith('non-existent-uuid');
      expect(mockDb.studies.add).not.toHaveBeenCalled();
      expect(studiesSpy).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      mockDb.studies.get.mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.duplicateStudy('existing-uuid-123')).rejects.toThrow(
        'Database error'
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('deleteStudy', () => {
    it('should delete a study successfully', async () => {
      const studiesSpy = jest.spyOn(service.studies, 'next');
      const remainingStudies: Study[] = [];
      mockDb.studies.toArray.mockResolvedValue(remainingStudies);

      await service.deleteStudy('existing-uuid-123');

      expect(mockDb.studies.delete).toHaveBeenCalledWith('existing-uuid-123');
      expect(mockDb.studies.toArray).toHaveBeenCalled();
      expect(studiesSpy).toHaveBeenCalledWith(remainingStudies);
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      mockDb.studies.delete.mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.deleteStudy('existing-uuid-123')).rejects.toThrow(
        'Database error'
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getLatestStudies', () => {
    it('should return latest 4 studies ordered by creation date', async () => {
      const mockLatestStudies = [mockStudyFromDb];
      mockDb.studies.orderBy.mockReturnValue({
        reverse: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue(mockLatestStudies)
          })
        })
      });

      const result = await service.getLatestStudies();

      expect(mockDb.studies.orderBy).toHaveBeenCalledWith('created_at_offline');
      expect(result).toEqual(mockLatestStudies);
    });

    it('should return undefined when database is not available', async () => {
      (mockStorageService as any).db = undefined;

      const result = await service.getLatestStudies();

      expect(result).toBeUndefined();
    });
  });

  describe('BehaviorSubject emissions', () => {
    it('should emit updated studies after createStudy', async () => {
      const mockStudies: Study[] = [mockStudyFromDb];
      mockDb.studies.toArray.mockResolvedValue(mockStudies);

      const studiesEmissionSpy = jest.fn();
      service.studies.subscribe(studiesEmissionSpy);

      await service.createStudy(mockStudy);

      expect(studiesEmissionSpy).toHaveBeenCalledWith(mockStudies);
    });

    it('should emit updated studies after duplicateStudy', async () => {
      const mockStudies: Study[] = [mockStudyFromDb];
      mockDb.studies.toArray.mockResolvedValue(mockStudies);

      const studiesEmissionSpy = jest.fn();
      service.studies.subscribe(studiesEmissionSpy);

      await service.duplicateStudy('existing-uuid-123');

      expect(studiesEmissionSpy).toHaveBeenCalledWith(mockStudies);
    });

    it('should emit updated studies after deleteStudy', async () => {
      const mockStudies: Study[] = [];
      mockDb.studies.toArray.mockResolvedValue(mockStudies);

      const studiesEmissionSpy = jest.fn();
      service.studies.subscribe(studiesEmissionSpy);

      await service.deleteStudy('existing-uuid-123');

      expect(studiesEmissionSpy).toHaveBeenCalledWith(mockStudies);
    });
  });
});
