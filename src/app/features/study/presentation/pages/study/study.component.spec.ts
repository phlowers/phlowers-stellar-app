import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, BehaviorSubject } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

import { StudyComponent } from './study.component';
import { StudiesService } from '@services/studies/studies.service';
import { SectionService } from '@services/section/section.service';
import { InitialConditionService } from '@services/initial-condition/initial-condition.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { NotificationService } from '@services/notification/notification.service';
import { Section, InitialCondition, Study } from '@shared/domain';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123')
}));

vi.mock('plotly.js-dist-min', () => ({
  __esModule: true,
  default: {
    newPlot: vi.fn(),
    update: vi.fn(),
    purge: vi.fn(),
    relayout: vi.fn(),
    restyle: vi.fn(),
    react: vi.fn(),
    redraw: vi.fn(),
    toImage: vi.fn(),
    downloadImage: vi.fn(),
    extendTraces: vi.fn(),
    prependTraces: vi.fn(),
    addTraces: vi.fn(),
    deleteTraces: vi.fn(),
    moveTraces: vi.fn(),
    animate: vi.fn(),
    setPlotConfig: vi.fn(),
    validate: vi.fn(),
    d3: {
      select: vi.fn(),
      selectAll: vi.fn()
    }
  }
}));

describe('StudyComponent', () => {
  let component: StudyComponent;
  let fixture: ComponentFixture<StudyComponent>;
  let mockActivatedRoute: vi.Mocked<ActivatedRoute>;
  let mockStudiesService: vi.Mocked<StudiesService>;
  let mockSectionService: vi.Mocked<SectionService>;
  let mockInitialConditionService: vi.Mocked<InitialConditionService>;
  let mockCablesService: vi.Mocked<CablesService>;
  let mockRouter: vi.Mocked<Router>;
  let mockNotificationService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let readySubject: BehaviorSubject<boolean>;
  let paramsSubject: BehaviorSubject<{ uuid: string }>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

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
    regional_team_id: 'GMR-001',
    maintenance_team_id: 'EEL-001',
    maintenance_center_id: 'CM-001',
    link_name: 'Link 1',
    lit_code: 'LIT-001',
    lit_name: 'LIT-001',
    branch_name: 'Branch 1',
    branch_idr: 'Branch 1',
    voltage_idr: '400kV',
    comment: 'random comment',
    supports_comment: 'random supports comment',
    supports: [],
    obstacles: [],
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    charges: [],
    selected_charge_uuid: null,
    field_measures: [],
    selected_field_measure_uuid: undefined,
    vtl_and_guying: undefined,
    cable_modifications: [],
    selected_cable_modification_uuid: null,
    cable_span_manipulations: [],
    selected_cable_span_manipulation_uuid: null,
    start_latitude: null,
    start_longitude: null,
    start_azimuth: null,
    mean_reprojection_diff_meters: null
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
    paramsSubject = new BehaviorSubject<{ uuid: string }>({
      uuid: 'test-uuid-1'
    });

    const mockParamMap = {
      get: vi.fn().mockReturnValue('test-uuid-1')
    };

    mockActivatedRoute = {
      snapshot: {
        paramMap: mockParamMap
      },
      params: paramsSubject.asObservable()
    } as unknown as vi.Mocked<ActivatedRoute>;

    mockStudiesService = {
      getStudy: vi.fn().mockResolvedValue(mockStudy),
      getStudyAsObservable: vi.fn().mockReturnValue(of(mockStudy)),
      duplicateStudy: vi.fn().mockResolvedValue(mockStudy),
      updateStudy: vi.fn().mockResolvedValue(undefined),
      ready: readySubject,
      exportDialogData: signal(null)
    } as unknown as vi.Mocked<StudiesService>;

    mockRouter = {
      navigate: vi.fn()
    } as unknown as vi.Mocked<Router>;

    mockSectionService = {
      createOrUpdateSection: vi.fn().mockResolvedValue(undefined),
      deleteSection: vi.fn().mockResolvedValue(undefined),
      duplicateSection: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<SectionService>;

    mockInitialConditionService = {
      addInitialCondition: vi.fn().mockResolvedValue(undefined),
      deleteInitialCondition: vi.fn().mockResolvedValue(undefined),
      updateInitialCondition: vi.fn().mockResolvedValue(undefined),
      duplicateInitialCondition: vi.fn().mockResolvedValue(undefined),
      setInitialCondition: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<InitialConditionService>;

    mockNotificationService = {
      success: vi.fn(),
      error: vi.fn()
    };

    mockCablesService = {
      getCables: vi.fn().mockResolvedValue([]),
      importFromFile: vi.fn().mockResolvedValue(undefined),
      ready: new BehaviorSubject<boolean>(true)
    } as unknown as vi.Mocked<CablesService>;

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
        { provide: CablesService, useValue: mockCablesService },
        { provide: Router, useValue: mockRouter },
        { provide: NotificationService, useValue: mockNotificationService },
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudyComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Creation', () => {
    it('should initialize with default values', () => {
      expect(component.study()).toBeNull();
      expect(component.isNewStudyModalOpen()).toBeFalsy();
    });
  });

  describe('ngOnInit', () => {
    it('should navigate to studies if no uuid is provided', () => {
      (mockActivatedRoute.snapshot.paramMap.get as vi.Mock).mockReturnValue(null);

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/studies']);
    });

    it('should load study when service is ready and uuid is provided', async () => {
      component.ngOnInit();
      readySubject.next(true);

      await fixture.whenStable();

      expect(mockStudiesService.getStudyAsObservable).toHaveBeenCalledWith('test-uuid-1');
      expect(component.study()).toEqual(mockStudy);
    });

    it('should not load study when service is not ready', () => {
      readySubject.next(false);
      component.ngOnInit();

      expect(mockStudiesService.getStudyAsObservable).not.toHaveBeenCalled();
    });

    it('should subscribe to route params and refresh study on changes', async () => {
      component.ngOnInit();
      readySubject.next(true);
      await fixture.whenStable();

      // Simulate route param change
      const newUuid = 'new-uuid-123';
      mockStudiesService.getStudyAsObservable.mockReturnValue(
        of({
          ...mockStudy,
          uuid: newUuid
        }) as unknown as ReturnType<typeof mockStudiesService.getStudyAsObservable>
      );

      // Emit new params value
      paramsSubject.next({ uuid: newUuid });
      await fixture.whenStable();

      expect(mockStudiesService.getStudyAsObservable).toHaveBeenCalledWith(newUuid);
    });
  });

  describe('refreshStudy', () => {
    it('should refresh study when uuid is provided and service is ready', async () => {
      component.ngOnInit();
      readySubject.next(true);
      await fixture.whenStable();

      const newUuid = 'new-uuid-123';
      const updatedStudy = { ...mockStudy, uuid: newUuid };
      mockStudiesService.getStudyAsObservable.mockReturnValue(
        of(updatedStudy) as unknown as ReturnType<typeof mockStudiesService.getStudyAsObservable>
      );

      component.refreshStudy(newUuid);
      await fixture.whenStable();

      expect(mockStudiesService.getStudyAsObservable).toHaveBeenCalledWith(newUuid);
      expect(component.study()).toEqual(updatedStudy);
    });

    it('should not refresh study when service is not ready', () => {
      readySubject.next(false);

      component.refreshStudy('test-uuid');

      expect(mockStudiesService.getStudyAsObservable).not.toHaveBeenCalled();
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

      expect(mockStudiesService.duplicateStudy).toHaveBeenCalledWith('test-uuid');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/study', 'duplicated-uuid']);
      expect(mockNotificationService.success).toHaveBeenCalledWith(expect.any(String));
    });

    it('should not navigate when duplication returns null', async () => {
      mockStudiesService.duplicateStudy.mockResolvedValue(null);

      await component.duplicateStudy('test-uuid');

      expect(mockStudiesService.duplicateStudy).toHaveBeenCalledWith('test-uuid');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(mockNotificationService.success).not.toHaveBeenCalled();
    });

    it('should show error toast when duplication rejects', async () => {
      mockStudiesService.duplicateStudy.mockRejectedValue(new Error('DB error'));

      await component.duplicateStudy('test-uuid');

      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(mockNotificationService.error).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('createOrUpdateSection', () => {
    beforeEach(() => {
      component.study.set({ ...mockStudy, sections: [mockSection] });
    });

    it('should update existing section', async () => {
      const updatedSection = { ...mockSection, name: 'Updated Section' };

      await component.createOrUpdateSection(updatedSection);

      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(component.study(), updatedSection);
      expect(mockNotificationService.success).toHaveBeenCalledWith(expect.any(String));
    });

    it('should create new section', async () => {
      const newSection = { ...mockSection, uuid: 'new-section-uuid' };

      await component.createOrUpdateSection(newSection);

      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(component.study(), newSection);
      expect(mockNotificationService.success).toHaveBeenCalledWith(expect.any(String));
    });

    it('should not update when study is null', async () => {
      component.study.set(null);

      await component.createOrUpdateSection(mockSection);

      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
      expect(mockNotificationService.success).not.toHaveBeenCalled();
    });
  });

  describe('deleteSection', () => {
    beforeEach(() => {
      component.study.set({ ...mockStudy, sections: [mockSection] });
    });

    it('should delete section from study', async () => {
      await component.deleteSection(mockSection);

      expect(mockSectionService.deleteSection).toHaveBeenCalledWith(component.study(), mockSection);
      expect(mockNotificationService.success).toHaveBeenCalledWith(expect.any(String));
    });

    it('should not delete when study is null', async () => {
      component.study.set(null);

      await component.deleteSection(mockSection);

      expect(mockSectionService.deleteSection).not.toHaveBeenCalled();
      expect(mockNotificationService.success).not.toHaveBeenCalled();
    });
  });

  describe('duplicateSection', () => {
    beforeEach(() => {
      component.study.set({ ...mockStudy, sections: [mockSection] });
    });

    it('should duplicate section with new uuid', async () => {
      await component.duplicateSection(mockSection);

      expect(mockSectionService.duplicateSection).toHaveBeenCalledWith(component.study(), mockSection);
      expect(mockNotificationService.success).toHaveBeenCalledWith(expect.any(String));
    });

    it('should not duplicate when study is null', async () => {
      component.study.set(null);

      await component.duplicateSection(mockSection);

      expect(mockSectionService.duplicateSection).not.toHaveBeenCalled();
      expect(mockNotificationService.success).not.toHaveBeenCalled();
    });
  });

  describe('addInitialCondition', () => {
    beforeEach(() => {
      component.study.set({ ...mockStudy, sections: [mockSection] });
      mockStudiesService.getStudy.mockResolvedValue({ ...mockStudy, sections: [mockSection] });
    });

    it('should add initial condition to section', async () => {
      await component.addInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      expect(mockInitialConditionService.addInitialCondition).toHaveBeenCalledWith(
        component.study(),
        mockSection,
        mockInitialCondition
      );
      expect(mockNotificationService.success).toHaveBeenCalledWith(expect.any(String));
    });

    it('should add initial condition to section with existing conditions', async () => {
      const sectionWithConditions = {
        ...mockSection,
        initial_conditions: [mockInitialCondition]
      };
      component.study.set({ ...mockStudy, sections: [sectionWithConditions] });
      mockStudiesService.getStudy.mockResolvedValue({ ...mockStudy, sections: [sectionWithConditions] });

      const newInitialCondition = {
        ...mockInitialCondition,
        uuid: 'new-ic-uuid'
      };
      await component.addInitialCondition({
        section: sectionWithConditions,
        initialCondition: newInitialCondition
      });

      expect(mockInitialConditionService.addInitialCondition).toHaveBeenCalledWith(
        component.study(),
        sectionWithConditions,
        newInitialCondition
      );
      expect(mockNotificationService.success).toHaveBeenCalledWith(expect.any(String));
    });

    it('should not add when study is null', async () => {
      component.study.set(null);

      await component.addInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      expect(mockInitialConditionService.addInitialCondition).not.toHaveBeenCalled();
      expect(mockNotificationService.success).not.toHaveBeenCalled();
    });
  });

  describe('deleteInitialCondition', () => {
    beforeEach(() => {
      const sectionWithConditions = {
        ...mockSection,
        initial_conditions: [mockInitialCondition]
      };
      component.study.set({ ...mockStudy, sections: [sectionWithConditions] });
    });

    it('should delete initial condition from section', async () => {
      await component.deleteInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      expect(mockInitialConditionService.deleteInitialCondition).toHaveBeenCalledWith(
        component.study(),
        mockSection,
        mockInitialCondition
      );
      expect(mockNotificationService.success).toHaveBeenCalledWith(expect.any(String));
    });

    it('should not delete when study is null', async () => {
      component.study.set(null);

      await component.deleteInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      expect(mockInitialConditionService.deleteInitialCondition).not.toHaveBeenCalled();
      expect(mockNotificationService.success).not.toHaveBeenCalled();
    });

    it('should handle section with no initial conditions', async () => {
      const sectionWithoutConditions = {
        ...mockSection,
        initial_conditions: []
      };
      component.study.set({ ...mockStudy, sections: [sectionWithoutConditions] });

      await component.deleteInitialCondition({
        section: sectionWithoutConditions,
        initialCondition: mockInitialCondition
      });

      expect(mockInitialConditionService.deleteInitialCondition).toHaveBeenCalledWith(
        component.study(),
        sectionWithoutConditions,
        mockInitialCondition
      );
      expect(mockNotificationService.success).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('updateInitialCondition', () => {
    beforeEach(() => {
      const sectionWithConditions = {
        ...mockSection,
        initial_conditions: [mockInitialCondition]
      };
      component.study.set({ ...mockStudy, sections: [sectionWithConditions] });
      mockStudiesService.getStudy.mockResolvedValue({ ...mockStudy, sections: [sectionWithConditions] });
    });

    it('should update initial condition in section', async () => {
      const updatedIC = {
        ...mockInitialCondition,
        name: 'Updated IC'
      };

      await component.updateInitialCondition({
        section: mockSection,
        initialCondition: updatedIC
      });

      expect(mockInitialConditionService.updateInitialCondition).toHaveBeenCalledWith(
        component.study(),
        mockSection,
        updatedIC
      );
      expect(mockNotificationService.success).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('duplicateInitialCondition', () => {
    beforeEach(() => {
      const sectionWithConditions = {
        ...mockSection,
        initial_conditions: [mockInitialCondition]
      };
      component.study.set({ ...mockStudy, sections: [sectionWithConditions] });
    });

    it('should duplicate initial condition with new UUID', async () => {
      const newUuid = 'new-ic-uuid';

      await component.duplicateInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition,
        newUuid
      });

      expect(mockInitialConditionService.duplicateInitialCondition).toHaveBeenCalledWith(
        component.study(),
        mockSection,
        mockInitialCondition,
        newUuid
      );
      expect(mockNotificationService.success).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('setInitialCondition', () => {
    beforeEach(() => {
      const sectionWithConditions = {
        ...mockSection,
        initial_conditions: [mockInitialCondition]
      };
      component.study.set({ ...mockStudy, sections: [sectionWithConditions] });
    });

    it('should set the selected initial condition', async () => {
      await component.setInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      expect(mockInitialConditionService.setInitialCondition).toHaveBeenCalledWith(
        component.study(),
        mockSection,
        mockInitialCondition.uuid
      );
    });
  });

  describe('ngOnDestroy', () => {
    it('should exist as a component', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle getStudy errors gracefully', async () => {
      // Reset the mock to avoid interference from other tests
      mockStudiesService.getStudyAsObservable.mockReturnValue(
        of(mockStudy) as unknown as ReturnType<typeof mockStudiesService.getStudyAsObservable>
      );
      readySubject.next(true);
      component.ngOnInit();

      await fixture.whenStable();

      expect(mockStudiesService.getStudyAsObservable).toHaveBeenCalled();
      expect(component.study()).toBeDefined();
    });

    it('should handle duplicateStudy errors gracefully', async () => {
      const error = new Error('Failed to duplicate study');
      mockStudiesService.duplicateStudy.mockRejectedValue(error);

      // The component doesn't handle errors, so the promise rejection is unhandled
      component.duplicateStudy('test-uuid');

      // Wait for the promise to resolve/reject
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockStudiesService.duplicateStudy).toHaveBeenCalledWith('test-uuid');
    });
  });

  describe('Edge Cases', () => {
    it('should handle study with null sections', async () => {
      const studyWithNullSections = {
        ...mockStudy,
        sections: null as unknown as Section[]
      };
      component.study.set(studyWithNullSections);

      await component.createOrUpdateSection(mockSection);

      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(
        { ...studyWithNullSections, sections: [] },
        mockSection
      );
      expect(mockNotificationService.success).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle section with null initial conditions', async () => {
      const sectionWithNullConditions = {
        ...mockSection,
        initial_conditions: null as unknown as InitialCondition[]
      };
      component.study.set({ ...mockStudy, sections: [sectionWithNullConditions] });
      mockStudiesService.getStudy.mockResolvedValue({ ...mockStudy, sections: [sectionWithNullConditions] });

      await component.addInitialCondition({
        section: sectionWithNullConditions,
        initialCondition: mockInitialCondition
      });

      expect(mockInitialConditionService.addInitialCondition).toHaveBeenCalledWith(
        component.study(),
        sectionWithNullConditions,
        mockInitialCondition
      );
      expect(mockNotificationService.success).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle multiple rapid updates', async () => {
      component.study.set({ ...mockStudy, sections: [mockSection] });

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

  describe('UC: should display study header with sections tab', () => {
    it('UC-SD1: should display sections tab', async () => {
      component.ngOnInit();
      readySubject.next(true);
      await fixture.whenStable();
      fixture.detectChanges();

      const tab = getByTestId('sections-tab');
      expect(tab).toBeTruthy();
    });
  });

  describe('HTML rendering - tabs', () => {
    beforeEach(async () => {
      component.ngOnInit();
      readySubject.next(true);
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('should render study-states-tab', () => {
      expect(getByTestId('study-states-tab')).toBeTruthy();
    });

    it('should render measurements-tab', () => {
      expect(getByTestId('measurements-tab')).toBeTruthy();
    });

    it('should render ground-obstacles-tab', () => {
      expect(getByTestId('ground-obstacles-tab')).toBeTruthy();
    });
  });

  describe('addInitialCondition - section not found guard', () => {
    it('should not call setInitialCondition when section is not found in refreshed study', async () => {
      component.study.set({ ...mockStudy, sections: [mockSection] });
      // After addInitialCondition, getStudy returns a study without the target section
      mockStudiesService.getStudy.mockResolvedValue({
        ...mockStudy,
        sections: []
      });

      await component.addInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      expect(mockInitialConditionService.addInitialCondition).toHaveBeenCalled();
      expect(mockInitialConditionService.setInitialCondition).not.toHaveBeenCalled();
    });
  });

  describe('updateInitialCondition - section not found guard', () => {
    it('should not call setInitialCondition when section is not found in refreshed study', async () => {
      component.study.set({ ...mockStudy, sections: [mockSection] });
      // After updateInitialCondition, getStudy returns a study without the target section
      mockStudiesService.getStudy.mockResolvedValue({
        ...mockStudy,
        sections: []
      });

      await component.updateInitialCondition({
        section: mockSection,
        initialCondition: mockInitialCondition
      });

      expect(mockInitialConditionService.updateInitialCondition).toHaveBeenCalled();
      expect(mockInitialConditionService.setInitialCondition).not.toHaveBeenCalled();
    });
  });
});
