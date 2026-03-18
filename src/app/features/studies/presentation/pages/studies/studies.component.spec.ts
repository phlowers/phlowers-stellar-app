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
import { signal } from '@angular/core';
import { StudiesComponent } from './studies.component';
import { StudiesService } from '@services/studies/studies.service';
import { Study } from '@shared/domain';
import { CablesService } from '@shared/catalog/services/cables.service';

describe('StudiesComponent', () => {
  let component: StudiesComponent;
  let fixture: ComponentFixture<StudiesComponent>;
  let mockStudiesService: vi.Mocked<StudiesService>;
  let mockConfirmationService: vi.Mocked<ConfirmationService>;
  let mockActivatedRoute: vi.Mocked<ActivatedRoute>;
  let mockMessageService: vi.Mocked<MessageService>;

  const mockStudy: Study = {
    uuid: 'test-uuid-1',
    author_email: 'test@example.com',
    title: 'Test Study',
    description: 'Test Description',
    shareable: true,
    created_at_offline: '2025-01-01T00:00:00.000Z',
    updated_at_offline: '2025-01-01T00:00:00.000Z',
    saved: true,
    sections: []
  };

  const mockStudy2: Study = {
    uuid: 'test-uuid-2',
    author_email: 'test2@example.com',
    title: 'Test Study 2',
    description: 'Test Description 2',
    shareable: false,
    created_at_offline: '2025-01-02T00:00:00.000Z',
    updated_at_offline: '2025-01-02T00:00:00.000Z',
    saved: false,
    sections: []
  };

  beforeEach(async () => {
    // Create mock services
    mockStudiesService = {
      studies: new BehaviorSubject<Study[]>([]),
      ready: new BehaviorSubject<boolean>(false),
      getStudies: vi.fn(),
      duplicateStudy: vi.fn(),
      deleteStudy: vi.fn(),
      exportDialogData: signal(null)
    } as unknown as vi.Mocked<StudiesService>;

    mockConfirmationService = {
      confirm: vi.fn()
    } as unknown as vi.Mocked<ConfirmationService>;

    mockActivatedRoute = {
      snapshot: {
        queryParams: {}
      }
    } as unknown as vi.Mocked<ActivatedRoute>;

    mockMessageService = {
      add: vi.fn()
    } as unknown as vi.Mocked<MessageService>;

    await TestBed.configureTestingModule({
      imports: [StudiesComponent],
      providers: [
        { provide: StudiesService, useValue: mockStudiesService },
        { provide: ConfirmationService, useValue: mockConfirmationService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: MessageService, useValue: mockMessageService },
        { provide: CablesService, useValue: { getCables: vi.fn().mockResolvedValue([]) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudiesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.isNewStudyModalOpen()).toBeFalsy();
      expect(component.studies()).toEqual([]);
    });
  });

  describe('Constructor', () => {
    it('should subscribe to studies service studies observable', () => {
      const testStudies = [mockStudy, mockStudy2];
      mockStudiesService.studies.next(testStudies);
      fixture.detectChanges();

      expect(component.studies()).toEqual([mockStudy2, mockStudy]);
    });

    it('should update studies when studies service emits new values', () => {
      const initialStudies = [mockStudy];
      const updatedStudies = [mockStudy, mockStudy2];

      mockStudiesService.studies.next(initialStudies);
      fixture.detectChanges();
      expect(component.studies()).toEqual(initialStudies);

      mockStudiesService.studies.next(updatedStudies);
      fixture.detectChanges();
      expect(component.studies()).toEqual([mockStudy2, mockStudy]);
    });
  });

  describe('ngOnInit', () => {
    it('should set isNewStudyModalOpen to true when create query param is true', () => {
      mockActivatedRoute.snapshot.queryParams = { create: 'true' };

      // Recreate component with the new route params
      fixture = TestBed.createComponent(StudiesComponent);
      component = fixture.componentInstance;

      expect(component.isNewStudyModalOpen()).toBeTruthy();
    });

    it('should set isNewStudyModalOpen to false when create query param is not true', () => {
      mockActivatedRoute.snapshot.queryParams = { create: 'false' };

      fixture = TestBed.createComponent(StudiesComponent);
      component = fixture.componentInstance;

      expect(component.isNewStudyModalOpen()).toBeFalsy();
    });

    it('should call getStudies when service is ready', async () => {
      mockStudiesService.getStudies.mockResolvedValue([mockStudy]);

      mockStudiesService.ready.next(true);
      fixture.detectChanges();

      // Wait for the async operation to complete
      await fixture.whenStable();

      expect(mockStudiesService.getStudies).toHaveBeenCalled();
    });

    it('should update studies when getStudies returns data', async () => {
      const testStudies = [mockStudy, mockStudy2];
      mockStudiesService.getStudies.mockResolvedValue(testStudies);

      mockStudiesService.ready.next(true);
      fixture.detectChanges();

      // Wait for the async operation to complete
      await fixture.whenStable();

      expect(component.studies()).toEqual([mockStudy2, mockStudy]);
    });
  });

  describe('duplicateStudy', () => {
    it('should call studies service duplicateStudy method with correct uuid', () => {
      const testUuid = 'test-uuid-123';
      mockStudiesService.duplicateStudy.mockResolvedValue(null);

      component.duplicateStudy(testUuid);

      expect(mockStudiesService.duplicateStudy).toHaveBeenCalledWith(testUuid);
    });

    it('should handle duplicateStudy promise rejection gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
      const testUuid = 'test-uuid-123';
      mockStudiesService.duplicateStudy.mockRejectedValue(new Error('Duplicate failed'));

      component.duplicateStudy(testUuid);

      // Wait for the async operation to complete
      await fixture.whenStable();

      expect(mockStudiesService.duplicateStudy).toHaveBeenCalledWith(testUuid);
      // Component should not crash
      expect(component).toBeTruthy();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render create-study-btn', () => {
      const el = getByTestId('create-study-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('should render my-studies-tab', () => {
      expect(getByTestId('my-studies-tab')).toBeTruthy();
    });

    it('should render search-study-tab', () => {
      expect(getByTestId('search-study-tab')).toBeTruthy();
    });

    it('should render import-study-tab', () => {
      expect(getByTestId('import-study-tab')).toBeTruthy();
    });
  });
});
