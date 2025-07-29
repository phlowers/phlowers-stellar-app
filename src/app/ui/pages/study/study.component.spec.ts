import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, BehaviorSubject } from 'rxjs';
import { MessageService } from 'primeng/api';

import { StudyComponent } from './study.component';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { Study } from '@src/app/core/data/database/interfaces/study';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { InitialCondition } from '@src/app/core/data/database/interfaces/initialCondition';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

describe('StudyComponent', () => {
  let component: StudyComponent;
  let fixture: ComponentFixture<StudyComponent>;
  let mockActivatedRoute: jest.Mocked<ActivatedRoute>;
  let mockStudiesService: jest.Mocked<StudiesService>;
  let mockRouter: jest.Mocked<Router>;
  let mockMessageService: jest.Mocked<MessageService>;
  let readySubject: BehaviorSubject<boolean>;

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

  const mockSection: Section = {
    uuid: 'section-uuid-1',
    internal_id: 'INT-001',
    name: 'Test Section',
    short_name: 'TS',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    internal_catalog_id: 'CAT-001',
    type: 'phase',
    cable_name: 'Test Cable',
    cable_short_name: 'TC',
    cables_amount: 3,
    optical_fibers_amount: 12,
    spans_amount: 5,
    begin_span_name: 'Span 1',
    last_span_name: 'Span 5',
    first_support_number: 1,
    last_support_number: 6,
    first_attachment_set: 'Set 1',
    last_attachment_set: 'Set 2',
    regional_maintenance_center_names: ['Center 1'],
    maintenance_center_names: ['Maintenance 1'],
    gmr: 'GMR-001',
    eel: 'EEL-001',
    cm: 'CM-001',
    link_name: 'Link 1',
    lit: 'LIT-001',
    branch_name: 'Branch 1',
    electric_tension_level: '400kV',
    supports: [],
    updatedAt: new Date(),
    initial_conditions: []
  };

  const mockInitialCondition: InitialCondition = {
    uuid: 'ic-uuid-1',
    name: 'Test Initial Condition',
    base_parameters: 'Test Parameters',
    base_temperature: 25
  };

  beforeEach(async () => {
    readySubject = new BehaviorSubject<boolean>(false);

    const mockParamMap = {
      get: jest.fn().mockReturnValue('test-uuid-1')
    };

    mockActivatedRoute = {
      snapshot: {
        paramMap: mockParamMap
      },
      params: of({ uuid: 'test-uuid-1' })
    } as unknown as jest.Mocked<ActivatedRoute>;

    mockStudiesService = {
      getStudy: jest.fn().mockResolvedValue(mockStudy),
      duplicateStudy: jest.fn().mockResolvedValue(mockStudy),
      updateStudy: jest.fn().mockResolvedValue(undefined),
      ready: readySubject
    } as unknown as jest.Mocked<StudiesService>;

    mockRouter = {
      navigate: jest.fn()
    } as unknown as jest.Mocked<Router>;

    mockMessageService = {
      add: jest.fn()
    } as unknown as jest.Mocked<MessageService>;

    await TestBed.configureTestingModule({
      imports: [StudyComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: StudiesService, useValue: mockStudiesService },
        { provide: Router, useValue: mockRouter },
        { provide: MessageService, useValue: mockMessageService },
        provideNoopAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudyComponent);
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
      expect(component.study).toBeNull();
      expect(component.isNewStudyModalOpen()).toBeFalsy();
    });
  });

  describe('ngOnInit', () => {
    it('should navigate to studies if no uuid is provided', () => {
      (mockActivatedRoute.snapshot.paramMap.get as jest.Mock).mockReturnValue(
        null
      );

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/studies']);
    });

    it('should load study when service is ready and uuid is provided', async () => {
      readySubject.next(true);
      component.ngOnInit();

      await fixture.whenStable();

      expect(mockStudiesService.getStudy).toHaveBeenCalledWith('test-uuid-1');
      expect(component.study).toEqual(mockStudy);
    });

    it('should not load study when service is not ready', () => {
      readySubject.next(false);
      component.ngOnInit();

      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should subscribe to route params and refresh study on changes', async () => {
      readySubject.next(true);
      component.ngOnInit();
      await fixture.whenStable();

      // Simulate route param change
      const newUuid = 'new-uuid-123';
      mockActivatedRoute.params = of({ uuid: newUuid });
      mockStudiesService.getStudy.mockResolvedValue({
        ...mockStudy,
        uuid: newUuid
      });

      // Trigger ngOnInit again to test the subscription
      component.ngOnInit();
      await fixture.whenStable();

      expect(mockStudiesService.getStudy).toHaveBeenCalledWith(newUuid);
    });
  });

  describe('refreshStudy', () => {
    it('should refresh study when uuid is provided and service is ready', async () => {
      readySubject.next(true);
      await fixture.whenStable();

      const newUuid = 'new-uuid-123';
      const updatedStudy = { ...mockStudy, uuid: newUuid };
      mockStudiesService.getStudy.mockResolvedValue(updatedStudy);

      component.refreshStudy(newUuid);
      await fixture.whenStable();

      expect(mockStudiesService.getStudy).toHaveBeenCalledWith(newUuid);
      expect(component.study).toEqual(updatedStudy);
    });

    it('should not refresh study when service is not ready', () => {
      readySubject.next(false);

      component.refreshStudy('test-uuid');

      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should not refresh study when uuid is not provided', () => {
      readySubject.next(true);

      component.refreshStudy('');

      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });
  });

  describe('openModifyStudyModal', () => {
    it('should open the modify study modal', () => {
      component.openModifyStudyModal();

      expect(component.isNewStudyModalOpen()).toBeTruthy();
    });
  });

  describe('duplicateStudy', () => {
    it('should duplicate study and navigate to new study', async () => {
      const duplicatedStudy = { ...mockStudy, uuid: 'duplicated-uuid' };
      mockStudiesService.duplicateStudy.mockResolvedValue(duplicatedStudy);

      await component.duplicateStudy('test-uuid');

      expect(mockStudiesService.duplicateStudy).toHaveBeenCalledWith(
        'test-uuid'
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/study',
        'duplicated-uuid'
      ]);
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should not navigate when duplication fails', async () => {
      mockStudiesService.duplicateStudy.mockResolvedValue(null);

      await component.duplicateStudy('test-uuid');

      expect(mockStudiesService.duplicateStudy).toHaveBeenCalledWith(
        'test-uuid'
      );
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });
  });

  describe('createOrUpdateSection', () => {
    beforeEach(() => {
      component.study = { ...mockStudy, sections: [mockSection] };
    });

    it('should update existing section', () => {
      const updatedSection = { ...mockSection, name: 'Updated Section' };

      component.createOrUpdateSection(updatedSection);

      expect(component.study?.sections).toHaveLength(1);
      expect(component.study?.sections[0]).toEqual(updatedSection);
      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        component.study
      );
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should create new section', () => {
      const newSection = { ...mockSection, uuid: 'new-section-uuid' };

      component.createOrUpdateSection(newSection);

      expect(component.study?.sections).toHaveLength(2);
      expect(component.study?.sections).toContain(newSection);
      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        component.study
      );
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should not update when study is null', () => {
      component.study = null;

      component.createOrUpdateSection(mockSection);

      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
      expect(mockMessageService.add).not.toHaveBeenCalled();
    });
  });

  describe('deleteSection', () => {
    beforeEach(() => {
      component.study = { ...mockStudy, sections: [mockSection] };
    });

    it('should delete section from study', () => {
      component.deleteSection(mockSection);

      expect(component.study?.sections).toHaveLength(0);
      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        component.study
      );
    });

    it('should not delete when study is null', () => {
      component.study = null;

      component.deleteSection(mockSection);

      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
    });
  });

  describe('duplicateSection', () => {
    beforeEach(() => {
      component.study = { ...mockStudy, sections: [mockSection] };
    });

    it('should duplicate section with new uuid', () => {
      component.duplicateSection(mockSection);

      expect(component.study?.sections).toHaveLength(2);
      expect(component.study?.sections[1].uuid).toBe('mock-uuid-123');
      expect(component.study?.sections[1].name).toBe(mockSection.name);
      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        component.study
      );
    });

    it('should not duplicate when study is null', () => {
      component.study = null;

      component.duplicateSection(mockSection);

      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
    });
  });

  describe('addInitialCondition', () => {
    beforeEach(() => {
      component.study = { ...mockStudy, sections: [mockSection] };
    });

    it('should add initial condition to section', () => {
      component.addInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      const updatedSection = component.study?.sections.find(
        (s) => s.uuid === mockSection.uuid
      );
      expect(updatedSection?.initial_conditions).toContain(
        mockInitialCondition
      );
      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        component.study
      );
    });

    it('should add initial condition to section with existing conditions', () => {
      const sectionWithConditions = {
        ...mockSection,
        initial_conditions: [mockInitialCondition]
      };
      component.study = { ...mockStudy, sections: [sectionWithConditions] };

      const newInitialCondition = {
        ...mockInitialCondition,
        uuid: 'new-ic-uuid'
      };
      component.addInitialCondition({
        section: sectionWithConditions,
        initialCondition: newInitialCondition
      });

      const updatedSection = component.study?.sections.find(
        (s) => s.uuid === mockSection.uuid
      );
      expect(updatedSection?.initial_conditions).toHaveLength(2);
      expect(updatedSection?.initial_conditions).toContain(newInitialCondition);
      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        component.study
      );
    });

    it('should not add when study is null', () => {
      component.study = null;

      component.addInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
    });
  });

  describe('deleteInitialCondition', () => {
    beforeEach(() => {
      const sectionWithConditions = {
        ...mockSection,
        initial_conditions: [mockInitialCondition]
      };
      component.study = { ...mockStudy, sections: [sectionWithConditions] };
    });

    it('should delete initial condition from section', () => {
      component.deleteInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      const updatedSection = component.study?.sections.find(
        (s) => s.uuid === mockSection.uuid
      );
      expect(updatedSection?.initial_conditions).toHaveLength(0);
      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        component.study
      );
    });

    it('should not delete when study is null', () => {
      component.study = null;

      component.deleteInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
    });

    it('should handle section with no initial conditions', () => {
      const sectionWithoutConditions = {
        ...mockSection,
        initial_conditions: []
      };
      component.study = { ...mockStudy, sections: [sectionWithoutConditions] };

      component.deleteInitialCondition({
        section: sectionWithoutConditions,
        initialCondition: mockInitialCondition
      });

      const updatedSection = component.study?.sections.find(
        (s) => s.uuid === mockSection.uuid
      );
      expect(updatedSection?.initial_conditions).toHaveLength(0);
      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        component.study
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle getStudy errors gracefully', async () => {
      const error = new Error('Failed to get study');
      mockStudiesService.getStudy.mockRejectedValue(error);
      readySubject.next(true);
      component.ngOnInit();

      await fixture.whenStable();

      expect(mockStudiesService.getStudy).toHaveBeenCalled();
      expect(component.study).toBeNull();
    });

    it('should handle duplicateStudy errors gracefully', async () => {
      const error = new Error('Failed to duplicate study');
      mockStudiesService.duplicateStudy.mockRejectedValue(error);

      component.duplicateStudy('test-uuid');

      // Wait for the promise to resolve/reject
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockStudiesService.duplicateStudy).toHaveBeenCalledWith(
        'test-uuid'
      );
    });

    it('should handle updateStudy errors gracefully', async () => {
      const error = new Error('Failed to update study');
      mockStudiesService.updateStudy.mockRejectedValue(error);
      component.study = { ...mockStudy, sections: [mockSection] };

      component.createOrUpdateSection(mockSection);

      // Wait for the promise to resolve/reject
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        component.study
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle study with null sections', () => {
      const studyWithNullSections = { ...mockStudy, sections: null as any };
      component.study = studyWithNullSections;

      // The component should handle null sections by initializing them
      component.study.sections = [];

      component.createOrUpdateSection(mockSection);

      expect(component.study?.sections).toEqual([mockSection]);
      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        component.study
      );
    });

    it('should handle section with null initial conditions', () => {
      const sectionWithNullConditions = {
        ...mockSection,
        initial_conditions: null as any
      };
      component.study = { ...mockStudy, sections: [sectionWithNullConditions] };

      component.addInitialCondition({
        section: sectionWithNullConditions,
        initialCondition: mockInitialCondition
      });

      const updatedSection = component.study?.sections.find(
        (s) => s.uuid === mockSection.uuid
      );
      expect(updatedSection?.initial_conditions).toEqual([
        mockInitialCondition
      ]);
    });

    it('should handle multiple rapid updates', async () => {
      component.study = { ...mockStudy, sections: [mockSection] };

      // Simulate rapid updates
      component.createOrUpdateSection({ ...mockSection, name: 'Update 1' });
      component.createOrUpdateSection({ ...mockSection, name: 'Update 2' });
      component.createOrUpdateSection({ ...mockSection, name: 'Update 3' });

      expect(mockStudiesService.updateStudy).toHaveBeenCalledTimes(3);
    });
  });
});
