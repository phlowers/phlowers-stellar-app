/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudiesComponent } from './studies.component';
import { ConfirmationService, MessageService } from 'primeng/api';
import { StorageService } from '@core/store/storage.service';
import { StudyService } from '@core/api/services/study.service';
import { OnlineService, ServerStatus } from '@core/api/services/online.service';
import { StudyModelLocal } from '@core/store/models/study.model';
import { of, Subject } from 'rxjs';
import { Table } from 'primeng/table';
import { NO_ERRORS_SCHEMA } from '@angular/core';

// Mock UUID to ensure consistent IDs in tests
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

describe('StudiesComponent', () => {
  let component: StudiesComponent;
  let fixture: ComponentFixture<StudiesComponent>;
  let mockStorageService: any;
  let mockStudyService: any;
  let mockOnlineService: any;
  let mockMessageService: any;
  let mockConfirmationService: any;
  let mockDb: any;
  let serverOnlineSubject: Subject<ServerStatus>;
  let readySubject: Subject<boolean>;

  const mockStudies: StudyModelLocal[] = [
    {
      uuid: 'study-1',
      title: 'Test Study 1',
      description: 'Description 1',
      author_email: 'test@example.com',
      created_at_offline: '2023-01-01T00:00:00.000Z',
      updated_at_offline: expect.any(String),
      saved: false,
      shareable: false
    },
    {
      uuid: 'study-2',
      title: 'Test Study 2',
      description: 'Description 2',
      author_email: 'test@example.com',
      created_at_offline: '2023-01-02T00:00:00.000Z',
      updated_at_offline: expect.any(String),
      saved: true,
      shareable: true
    }
  ];

  beforeEach(async () => {
    serverOnlineSubject = new Subject<ServerStatus>();
    readySubject = new Subject<boolean>();

    mockDb = {
      studies: {
        toArray: jest.fn().mockResolvedValue(mockStudies),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        add: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(mockStudies[0]),
        bulkDelete: jest.fn().mockResolvedValue(undefined)
      },
      users: {
        toArray: jest.fn().mockResolvedValue([{ email: 'test@example.com' }])
      }
    };

    mockStorageService = {
      db: mockDb,
      ready$: readySubject.asObservable()
    };

    mockStudyService = {
      createStudy: jest.fn().mockReturnValue(of({}))
    };

    mockOnlineService = {
      serverOnline$: serverOnlineSubject.asObservable()
    };

    mockMessageService = new MessageService();
    mockMessageService.subscribe = jest.fn();
    mockMessageService.add = jest.fn();
    mockConfirmationService = new ConfirmationService();
    mockConfirmationService.confirm = jest.fn(({ accept }) => {
      if (accept) accept();
    });

    await TestBed.configureTestingModule({
      imports: [StudiesComponent],
      schemas: [NO_ERRORS_SCHEMA] // Ignore template-related errors
    }).compileComponents();
    TestBed.overrideProvider(StorageService, { useValue: mockStorageService });
    TestBed.overrideProvider(OnlineService, { useValue: mockOnlineService });
    TestBed.overrideProvider(StudyService, { useValue: mockStudyService });
    TestBed.overrideProvider(MessageService, { useValue: mockMessageService });
    TestBed.overrideProvider(ConfirmationService, {
      useValue: mockConfirmationService
    });

    fixture = TestBed.createComponent(StudiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load studies when storage is ready', async () => {
    // Trigger the ready$ observable
    readySubject.next(true);
    // jest.useFakeTimers();
    // jest.runAllTimers();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockDb.studies.toArray).toHaveBeenCalled();
    expect(component.studies()).toEqual(mockStudies);
  });

  it('should update server status when online status changes', () => {
    serverOnlineSubject.next(ServerStatus.ONLINE);
    expect(component.serverOnline).toBe(true);

    serverOnlineSubject.next(ServerStatus.OFFLINE);
    expect(component.serverOnline).toBe(false);
  });

  it('should open new study dialog', () => {
    component.openNew();

    expect(component.study.title).toBe('');
    expect(component.submitted).toBe(false);
    expect(component.studyDialog).toBe(true);
  });

  it('should edit study', () => {
    const study = mockStudies[0];
    component.editStudy(study);

    expect(component.study).toEqual(study);
    expect(component.studyDialog).toBe(true);
  });

  it('should delete study', async () => {
    const study = mockStudies[0];
    component.deleteStudy(study);
    // await new Promise((r) => setTimeout(r, 0));

    expect(mockConfirmationService.confirm).toHaveBeenCalled();
  });

  it('should delete study accepted', async () => {
    const study = mockStudies[0];
    await component.deleteStudyAccepted(study);

    expect(mockDb.studies.delete).toHaveBeenCalledWith(study.uuid);
    expect(mockDb.studies.toArray).toHaveBeenCalled();
    expect(mockMessageService.add).toHaveBeenCalled();
  });

  it('should delete selected studies', async () => {
    component.selectedStudies = [mockStudies[0], mockStudies[1]];
    await component.deleteSelectedStudies();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockDb.studies.bulkDelete).toHaveBeenCalledWith([
      'study-1',
      'study-2'
    ]);
    expect(mockDb.studies.toArray).toHaveBeenCalled();
    expect(component.selectedStudies).toBeNull();
    expect(mockMessageService.add).toHaveBeenCalled();
  });

  it('should duplicate study', async () => {
    const study = mockStudies[0];
    await component.duplicateStudy(study);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockDb.studies.add).toHaveBeenCalledWith({
      ...study,
      uuid: 'test-uuid-123',
      saved: false
    });
    expect(mockDb.studies.toArray).toHaveBeenCalled();
    expect(mockMessageService.add).toHaveBeenCalled();
  });

  it('should save study remotely', async () => {
    const study = mockStudies[0];
    component.saveStudyRemotely(study);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockStudyService.createStudy).toHaveBeenCalledWith(study);
    expect(mockMessageService.add).toHaveBeenCalled();
    expect(mockDb.studies.update).toHaveBeenCalledWith(study.uuid, {
      ...study,
      saved: true
    });
  });

  it('should save new study', async () => {
    component.study = {
      title: 'New Study',
      description: 'New Description',
      shareable: true,
      uuid: '',
      author_email: '',
      created_at_offline: '',
      updated_at_offline: '',
      saved: false
    };

    await component.saveStudy();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockDb.studies.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Study',
        description: 'New Description',
        shareable: true,
        uuid: 'test-uuid-123',
        author_email: 'test@example.com',
        saved: false
      })
    );
    expect(mockMessageService.add).toHaveBeenCalled();
  });

  it('should update existing study', async () => {
    const updatedStudy = {
      ...mockStudies[0],
      title: 'Updated Title'
    };
    component.study = updatedStudy;

    await component.saveStudy();

    expect(mockDb.studies.get).toHaveBeenCalledWith(updatedStudy.uuid);
    expect(mockDb.studies.update).toHaveBeenCalledWith(
      updatedStudy.uuid,
      expect.objectContaining({
        ...updatedStudy,
        saved: false
      })
    );
    expect(mockMessageService.add).toHaveBeenCalled();
  });

  it('should not save study without title', async () => {
    component.study = {
      title: '',
      description: 'Description',
      shareable: false,
      uuid: '',
      author_email: '',
      created_at_offline: '',
      updated_at_offline: '',
      saved: false
    };
    component.submitted = false;

    await component.saveStudy();

    expect(component.submitted).toBe(true);
    expect(mockDb.studies.add).not.toHaveBeenCalled();
    expect(mockDb.studies.update).not.toHaveBeenCalled();
  });

  it('should handle global filter', () => {
    const mockTable = { filterGlobal: jest.fn() } as unknown as Table;
    const mockEvent = { target: { value: 'search text' } } as unknown as Event;

    component.onGlobalFilter(mockTable, mockEvent);

    expect(mockTable.filterGlobal).toHaveBeenCalledWith(
      'search text',
      'contains'
    );
  });

  it('should find index by id', () => {
    component.studies.set(mockStudies);

    expect(component.findIndexById('study-1')).toBe(0);
    expect(component.findIndexById('study-2')).toBe(1);
    expect(component.findIndexById('non-existent')).toBe(-1);
  });

  it('should toggle import study modal', () => {
    component.setIsImportStudyModalOpen(true);
    expect(component.isImportStudyModalOpen).toBe(true);

    component.setIsImportStudyModalOpen(false);
    expect(component.isImportStudyModalOpen).toBe(false);
  });

  it('should hide dialog', () => {
    component.studyDialog = true;
    component.submitted = true;

    component.hideDialog();

    expect(component.studyDialog).toBe(false);
    expect(component.submitted).toBe(false);
  });
});
