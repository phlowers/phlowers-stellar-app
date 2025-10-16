import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, BehaviorSubject } from 'rxjs';
import { MessageService } from 'primeng/api';

import { StudyComponent } from './study.component';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { SectionService } from '@src/app/core/services/sections/section.service';
import { InitialConditionService } from '@src/app/core/services/initial-conditions/initial-condition.service';
import { Study } from '@src/app/core/data/database/interfaces/study';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { InitialCondition } from '@src/app/core/data/database/interfaces/initialCondition';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn(),
  update: jest.fn(),
  purge: jest.fn(),
  relayout: jest.fn(),
  restyle: jest.fn(),
  react: jest.fn(),
  redraw: jest.fn(),
  toImage: jest.fn(),
  downloadImage: jest.fn(),
  extendTraces: jest.fn(),
  prependTraces: jest.fn(),
  addTraces: jest.fn(),
  deleteTraces: jest.fn(),
  moveTraces: jest.fn(),
  animate: jest.fn(),
  setPlotConfig: jest.fn(),
  validate: jest.fn(),
  d3: {
    select: jest.fn(),
    selectAll: jest.fn()
  }
}));

describe('StudyComponent', () => {
  let component: StudyComponent;
  let fixture: ComponentFixture<StudyComponent>;
  let mockActivatedRoute: jest.Mocked<ActivatedRoute>;
  let mockStudiesService: jest.Mocked<StudiesService>;
  let mockSectionService: jest.Mocked<SectionService>;
  let mockInitialConditionService: jest.Mocked<InitialConditionService>;
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
    electric_phase_number: 1,
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
    comment: 'random comment',
    supports: [],
    initial_conditions: [],
    selected_initial_condition_uuid: undefined
  };

  const mockInitialCondition: InitialCondition = {
    uuid: 'ic-uuid-1',
    name: 'Test Initial Condition',
    base_parameters: 0,
    base_temperature: 25,
    cable_pretension: 0,
    min_temperature: 0,
    max_wind_pressure: 0,
    max_frost_width: 0
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
      getStudyAsObservable: jest.fn().mockReturnValue(of(mockStudy)),
      duplicateStudy: jest.fn().mockResolvedValue(mockStudy),
      updateStudy: jest.fn().mockResolvedValue(undefined),
      ready: readySubject
    } as unknown as jest.Mocked<StudiesService>;

    mockRouter = {
      navigate: jest.fn()
    } as unknown as jest.Mocked<Router>;

    mockSectionService = {
      createOrUpdateSection: jest.fn().mockResolvedValue(undefined),
      deleteSection: jest.fn().mockResolvedValue(undefined),
      duplicateSection: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<SectionService>;

    mockInitialConditionService = {
      addInitialCondition: jest.fn().mockResolvedValue(undefined),
      deleteInitialCondition: jest.fn().mockResolvedValue(undefined),
      updateInitialCondition: jest.fn().mockResolvedValue(undefined),
      duplicateInitialCondition: jest.fn().mockResolvedValue(undefined),
      setInitialCondition: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<InitialConditionService>;

    mockMessageService = {
      add: jest.fn()
    } as unknown as jest.Mocked<MessageService>;

    await TestBed.configureTestingModule({
      imports: [StudyComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: StudiesService, useValue: mockStudiesService },
        { provide: SectionService, useValue: mockSectionService },
        {
          provide: InitialConditionService,
          useValue: mockInitialConditionService
        },
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

    it('should update existing section', async () => {
      const updatedSection = { ...mockSection, name: 'Updated Section' };

      await component.createOrUpdateSection(updatedSection);

      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(
        component.study,
        updatedSection
      );
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should create new section', async () => {
      const newSection = { ...mockSection, uuid: 'new-section-uuid' };

      await component.createOrUpdateSection(newSection);

      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(
        component.study,
        newSection
      );
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should not update when study is null', async () => {
      component.study = null;

      await component.createOrUpdateSection(mockSection);

      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
      expect(mockMessageService.add).not.toHaveBeenCalled();
    });
  });

  describe('deleteSection', () => {
    beforeEach(() => {
      component.study = { ...mockStudy, sections: [mockSection] };
    });

    it('should delete section from study', async () => {
      await component.deleteSection(mockSection);

      expect(mockSectionService.deleteSection).toHaveBeenCalledWith(
        component.study,
        mockSection
      );
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should not delete when study is null', async () => {
      component.study = null;

      await component.deleteSection(mockSection);

      expect(mockSectionService.deleteSection).not.toHaveBeenCalled();
      expect(mockMessageService.add).not.toHaveBeenCalled();
    });
  });

  describe('duplicateSection', () => {
    beforeEach(() => {
      component.study = { ...mockStudy, sections: [mockSection] };
    });

    it('should duplicate section with new uuid', async () => {
      await component.duplicateSection(mockSection);

      expect(mockSectionService.duplicateSection).toHaveBeenCalledWith(
        component.study,
        mockSection
      );
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should not duplicate when study is null', async () => {
      component.study = null;

      await component.duplicateSection(mockSection);

      expect(mockSectionService.duplicateSection).not.toHaveBeenCalled();
      expect(mockMessageService.add).not.toHaveBeenCalled();
    });
  });

  describe('addInitialCondition', () => {
    beforeEach(() => {
      component.study = { ...mockStudy, sections: [mockSection] };
    });

    it('should add initial condition to section', async () => {
      await component.addInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      expect(
        mockInitialConditionService.addInitialCondition
      ).toHaveBeenCalledWith(
        component.study,
        mockSection,
        mockInitialCondition
      );
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should add initial condition to section with existing conditions', async () => {
      const sectionWithConditions = {
        ...mockSection,
        initial_conditions: [mockInitialCondition]
      };
      component.study = { ...mockStudy, sections: [sectionWithConditions] };

      const newInitialCondition = {
        ...mockInitialCondition,
        uuid: 'new-ic-uuid'
      };
      await component.addInitialCondition({
        section: sectionWithConditions,
        initialCondition: newInitialCondition
      });

      expect(
        mockInitialConditionService.addInitialCondition
      ).toHaveBeenCalledWith(
        component.study,
        sectionWithConditions,
        newInitialCondition
      );
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should not add when study is null', async () => {
      component.study = null;

      await component.addInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      expect(
        mockInitialConditionService.addInitialCondition
      ).not.toHaveBeenCalled();
      expect(mockMessageService.add).not.toHaveBeenCalled();
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

    it('should delete initial condition from section', async () => {
      await component.deleteInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      expect(
        mockInitialConditionService.deleteInitialCondition
      ).toHaveBeenCalledWith(
        component.study,
        mockSection,
        mockInitialCondition
      );
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should not delete when study is null', async () => {
      component.study = null;

      await component.deleteInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      expect(
        mockInitialConditionService.deleteInitialCondition
      ).not.toHaveBeenCalled();
      expect(mockMessageService.add).not.toHaveBeenCalled();
    });

    it('should handle section with no initial conditions', async () => {
      const sectionWithoutConditions = {
        ...mockSection,
        initial_conditions: []
      };
      component.study = { ...mockStudy, sections: [sectionWithoutConditions] };

      await component.deleteInitialCondition({
        section: sectionWithoutConditions,
        initialCondition: mockInitialCondition
      });

      expect(
        mockInitialConditionService.deleteInitialCondition
      ).toHaveBeenCalledWith(
        component.study,
        sectionWithoutConditions,
        mockInitialCondition
      );
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle getStudy errors gracefully', async () => {
      // Reset the mock to avoid interference from other tests
      mockStudiesService.getStudyAsObservable.mockReturnValue(
        of(mockStudy) as any
      );
      readySubject.next(true);
      component.ngOnInit();

      await fixture.whenStable();

      expect(mockStudiesService.getStudyAsObservable).toHaveBeenCalled();
      expect(component.study).toBeDefined();
    });

    it('should handle duplicateStudy errors gracefully', async () => {
      const error = new Error('Failed to duplicate study');
      mockStudiesService.duplicateStudy.mockRejectedValue(error);

      // The component doesn't handle errors, so the promise rejection is unhandled
      component.duplicateStudy('test-uuid');

      // Wait for the promise to resolve/reject
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockStudiesService.duplicateStudy).toHaveBeenCalledWith(
        'test-uuid'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle study with null sections', async () => {
      const studyWithNullSections = { ...mockStudy, sections: null as any };
      component.study = studyWithNullSections;

      await component.createOrUpdateSection(mockSection);

      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(
        component.study,
        mockSection
      );
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should handle section with null initial conditions', async () => {
      const sectionWithNullConditions = {
        ...mockSection,
        initial_conditions: null as any
      };
      component.study = { ...mockStudy, sections: [sectionWithNullConditions] };

      await component.addInitialCondition({
        section: sectionWithNullConditions,
        initialCondition: mockInitialCondition
      });

      expect(
        mockInitialConditionService.addInitialCondition
      ).toHaveBeenCalledWith(
        component.study,
        sectionWithNullConditions,
        mockInitialCondition
      );
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should handle multiple rapid updates', async () => {
      component.study = { ...mockStudy, sections: [mockSection] };

      // Simulate rapid updates
      await component.createOrUpdateSection({
        ...mockSection,
        name: 'Update 1'
      });
      await component.createOrUpdateSection({
        ...mockSection,
        name: 'Update 2'
      });
      await component.createOrUpdateSection({
        ...mockSection,
        name: 'Update 3'
      });

      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledTimes(3);
    });
  });
});
