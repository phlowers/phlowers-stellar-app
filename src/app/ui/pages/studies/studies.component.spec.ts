/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { BehaviorSubject } from 'rxjs';
import { StudiesComponent } from './studies.component';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { Study } from '@src/app/core/data/database/interfaces/study';

describe('StudiesComponent', () => {
  let component: StudiesComponent;
  let fixture: ComponentFixture<StudiesComponent>;
  let mockStudiesService: jest.Mocked<StudiesService>;
  let mockConfirmationService: jest.Mocked<ConfirmationService>;
  let mockActivatedRoute: jest.Mocked<ActivatedRoute>;
  let mockMessageService: jest.Mocked<MessageService>;

  const mockStudy: Study = {
    uuid: 'test-uuid-1',
    author_email: 'test@example.com',
    title: 'Test Study',
    description: 'Test Description',
    shareable: true,
    created_at_offline: '2025-01-01T00:00:00.000Z',
    updated_at_offline: '2025-01-01T00:00:00.000Z',
    saved: true
  };

  const mockStudy2: Study = {
    uuid: 'test-uuid-2',
    author_email: 'test2@example.com',
    title: 'Test Study 2',
    description: 'Test Description 2',
    shareable: false,
    created_at_offline: '2025-01-02T00:00:00.000Z',
    updated_at_offline: '2025-01-02T00:00:00.000Z',
    saved: false
  };

  beforeEach(async () => {
    // Create mock services
    mockStudiesService = {
      studies: new BehaviorSubject<Study[]>([]),
      ready: new BehaviorSubject<boolean>(false),
      getStudies: jest.fn(),
      duplicateStudy: jest.fn(),
      deleteStudy: jest.fn()
    } as unknown as jest.Mocked<StudiesService>;

    mockConfirmationService = {
      confirm: jest.fn()
    } as unknown as jest.Mocked<ConfirmationService>;

    mockActivatedRoute = {
      snapshot: {
        queryParams: {}
      }
    } as unknown as jest.Mocked<ActivatedRoute>;

    mockMessageService = {
      add: jest.fn()
    } as unknown as jest.Mocked<MessageService>;

    await TestBed.configureTestingModule({
      imports: [StudiesComponent],
      providers: [
        { provide: StudiesService, useValue: mockStudiesService },
        { provide: ConfirmationService, useValue: mockConfirmationService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: MessageService, useValue: mockMessageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudiesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.isNewStudyModalOpen).toBeFalsy();
      expect(component.studies).toEqual([]);
    });
  });

  describe('Constructor', () => {
    it('should subscribe to studies service studies observable', () => {
      const testStudies = [mockStudy, mockStudy2];
      mockStudiesService.studies.next(testStudies);

      expect(component.studies).toEqual(testStudies);
    });

    it('should update studies when studies service emits new values', () => {
      const initialStudies = [mockStudy];
      const updatedStudies = [mockStudy, mockStudy2];

      mockStudiesService.studies.next(initialStudies);
      expect(component.studies).toEqual(initialStudies);

      mockStudiesService.studies.next(updatedStudies);
      expect(component.studies).toEqual(updatedStudies);
    });
  });

  describe('ngOnInit', () => {
    it('should set isNewStudyModalOpen to true when create query param is true', () => {
      mockActivatedRoute.snapshot.queryParams = { create: 'true' };

      component.ngOnInit();

      expect(component.isNewStudyModalOpen).toBeTruthy();
    });

    it('should set isNewStudyModalOpen to false when create query param is not true', () => {
      mockActivatedRoute.snapshot.queryParams = { create: 'false' };

      component.ngOnInit();

      expect(component.isNewStudyModalOpen).toBeFalsy();
    });

    it('should call getStudies when service is ready', async () => {
      mockStudiesService.getStudies.mockResolvedValue([mockStudy]);

      component.ngOnInit();
      mockStudiesService.ready.next(true);

      // Wait for the async operation to complete
      await fixture.whenStable();

      expect(mockStudiesService.getStudies).toHaveBeenCalled();
    });

    it('should update studies when getStudies returns data', async () => {
      const testStudies = [mockStudy, mockStudy2];
      mockStudiesService.getStudies.mockResolvedValue(testStudies);

      component.ngOnInit();
      mockStudiesService.ready.next(true);

      // Wait for the async operation to complete
      await fixture.whenStable();

      expect(component.studies).toEqual(testStudies);
    });
  });

  describe('duplicateStudy', () => {
    it('should call studies service duplicateStudy method with correct uuid', () => {
      const testUuid = 'test-uuid-123';
      mockStudiesService.duplicateStudy.mockResolvedValue(undefined);

      component.duplicateStudy(testUuid);

      expect(mockStudiesService.duplicateStudy).toHaveBeenCalledWith(testUuid);
    });

    it('should handle duplicateStudy promise rejection gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const testUuid = 'test-uuid-123';
      mockStudiesService.duplicateStudy.mockRejectedValue(
        new Error('Duplicate failed')
      );

      component.duplicateStudy(testUuid);

      // Wait for the async operation to complete
      await fixture.whenStable();

      expect(mockStudiesService.duplicateStudy).toHaveBeenCalledWith(testUuid);
      // Component should not crash
      expect(component).toBeTruthy();

      consoleErrorSpy.mockRestore();
    });
  });
});
