import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionsTabComponent } from './sectionsTab.component';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { InitialCondition, Section } from '@shared/domain';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ChargesService } from '@services/charges/charges.service';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { Subject } from 'rxjs';

class MockMaintenanceService {
  ready = { next: vi.fn() };
  getMaintenance = vi.fn().mockResolvedValue([]);
  importFromFile = vi.fn().mockResolvedValue(undefined);
}

class MockLinesService {
  ready = { next: vi.fn() };
  imported$ = new Subject<void>();
  getLinesCount = vi.fn().mockResolvedValue(0);
  getLines = vi.fn().mockResolvedValue([]);
  importFromFile = vi.fn().mockResolvedValue(undefined);
}

describe('SectionsTabComponent', () => {
  let component: SectionsTabComponent;
  let fixture: ComponentFixture<SectionsTabComponent>;
  let mockChargesService: {
    setSelectedCharge: vi.Mock;
    deleteCharge: vi.Mock;
    duplicateCharge: vi.Mock;
  };

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const getAllByTestId = (testId: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`));

  beforeAll(() => {
    // Mock global matchMedia for PrimeNG 19
    Object.defineProperty(globalThis, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });
  });

  afterEach(() => {
    const overlays = document.body.querySelectorAll('.p-select-overlay, .p-dropdown-panel, .p-overlay');
    overlays.forEach((o) => o.remove());

    // Restore console.error
    vi.restoreAllMocks();
  });

  const mockSection: Section = {
    uuid: 'uuid-123',
    internal_id: 'internal-001',
    name: 'My Section',
    short_name: 'MS',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    internal_catalog_id: 'catalog-001',
    type: 'phase',
    electric_phase_number: 1,
    cable_name: 'Cable A',
    cable_short_name: 'CA',
    cables_amount: 2,
    optical_fibers_amount: 12,
    spans_amount: 5,
    begin_span_name: 'SpanStart',
    last_span_name: 'SpanEnd',
    first_support_number: 100,
    last_support_number: 200,
    first_attachment_set: 'AttachSet1',
    last_attachment_set: 'AttachSet2',
    regional_maintenance_center_names: ['Center1', 'Center2'],
    maintenance_center_names: ['Maint1', 'Maint2'],
    regional_team_id: '1.23',
    maintenance_team_id: '4.56',
    maintenance_center_id: '7.89',
    link_name: 'LinkX',
    lit_code: 'LIT123',
    lit_name: 'LIT123',
    branch_name: 'BranchY',
    branch_idr: 'BranchY',
    voltage_idr: '230V',
    comment: 'Test section comment',
    supports_comment: 'Test supports comment',
    supports: [],
    obstacles: [],
    initial_conditions: [
      {
        uuid: 'ic-1',
        name: 'Initial Cond 1',
        base_parameters: 0,
        base_temperature: 20,
        cable_pretension: 0,
        min_temperature: 0,
        max_wind_pressure: 0,
        max_frost_width: 0
      } as InitialCondition
    ],
    selected_initial_condition_uuid: 'ic-1',
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
    uuid: 'init-1',
    name: 'Init Cond',
    base_parameters: 0,
    cable_pretension: 0,
    min_temperature: 0,
    max_wind_pressure: 0,
    max_frost_width: 0,
    base_temperature: 0
  };

  beforeEach(async () => {
    // Suppress console errors for template binding issues
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const mockMessageService = {
      add: vi.fn()
    } as unknown as MessageService;

    mockChargesService = {
      setSelectedCharge: vi.fn(),
      deleteCharge: vi.fn(),
      duplicateCharge: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SectionsTabComponent, NoopAnimationsModule],
      providers: [
        { provide: MaintenanceService, useClass: MockMaintenanceService },
        { provide: LinesService, useClass: MockLinesService },
        { provide: ChargesService, useValue: mockChargesService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SectionsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    vi.spyOn(component.deleteSection, 'emit');
    vi.spyOn(component.duplicateSection, 'emit');
    vi.spyOn(component.duplicateInitialCondition, 'emit');
    vi.spyOn(component.deleteInitialCondition, 'emit');
    vi.spyOn(component.setInitialCondition, 'emit');
  });

  it('should display "No existing section" when sections is empty', () => {
    fixture.componentRef.setInput('study', { sections: [] });
    fixture.detectChanges();

    const noSectionMsg = fixture.debugElement.query(By.css('.no-section-text'));
    expect(noSectionMsg.nativeElement.textContent).toContain('No existing section');
  });

  it('should render a section when sections input has data', () => {
    const sectionWithName = { ...mockSection, name: 'My Section' };
    fixture.componentRef.setInput('study', { sections: [sectionWithName] });
    fixture.detectChanges();

    const sectionName = fixture.debugElement.query(By.css('.section__text-name'));
    expect(sectionName?.nativeElement?.textContent).toContain('My Section');
  });

  it('should open new section modal in create mode when clicking "Add a section"', () => {
    // Set up the component with no sections to show the "Create a section" button
    fixture.componentRef.setInput('study', { sections: [] });
    fixture.detectChanges();

    const btn = fixture.debugElement.query(By.css('button[app-btn]'));
    expect(btn).toBeTruthy();
    btn.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(component.isNewSectionModalOpen()).toBe(true);
    expect(component.newSectionModalMode()).toBe('create');
  });

  it('editSection should set currentSection and open modal in edit mode', () => {
    component.editSection(mockSection);

    expect(component.currentSection()).toEqual(mockSection);
    expect(component.newSectionModalMode()).toBe('edit');
    expect(component.isNewSectionModalOpen()).toBe(true);
  });

  it('viewSection should set currentSection and open modal in view mode', () => {
    component.viewSection(mockSection);

    expect(component.currentSection()).toEqual(mockSection);
    expect(component.newSectionModalMode()).toBe('view');
    expect(component.isNewSectionModalOpen()).toBe(true);
  });

  it('openInitialConditionModal should update state correctly', () => {
    component.openInitialConditionModal(mockSection, mockInitialCondition, 'edit');

    expect(component.currentSection()).toEqual(mockSection);
    expect(component.currentInitialCondition()).toEqual(mockInitialCondition);
    expect(component.initialConditionModalMode()).toBe('edit');
    expect(component.isInitialConditionModalOpen()).toBe(true);
  });

  it('should emit deleteSection when delete button clicked in popover', async () => {
    fixture.componentRef.setInput('study', { sections: [mockSection] });
    fixture.detectChanges();

    const triggerBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.section__content-action');
    expect(triggerBtn).toBeTruthy();
    triggerBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // p-popover portals its content onto the document body.
    const deleteBtn: HTMLButtonElement | null = document.body.querySelector('.erase-btn');
    expect(deleteBtn).toBeTruthy();
    deleteBtn!.click();
    fixture.detectChanges();

    expect(component.deleteSection.emit).toHaveBeenCalledWith(mockSection);
  });

  it('should emit duplicateSection when duplicate button clicked in popover', async () => {
    fixture.componentRef.setInput('study', { sections: [mockSection] });
    fixture.detectChanges();

    const triggerBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.section__content-action');
    expect(triggerBtn).toBeTruthy();
    triggerBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // p-popover portals its content onto the document body.
    const duplicateButton = document.body.querySelector('[data-testid="section-duplicate-btn"]') as HTMLButtonElement;
    expect(duplicateButton).toBeTruthy();

    duplicateButton.click();
    fixture.detectChanges();

    expect(component.duplicateSection.emit).toHaveBeenCalledWith(mockSection);
  });

  describe('UC: display section list with actions', () => {
    it('UC-ST1: should render section cards when sections exist', () => {
      fixture.componentRef.setInput('study', { sections: [mockSection] });
      fixture.detectChanges();

      const cards = getAllByTestId('section-card');
      expect(cards.length).toBe(1);
    });

    it('UC-ST2: should display section name', () => {
      fixture.componentRef.setInput('study', { sections: [mockSection] });
      fixture.detectChanges();

      const name = getByTestId('section-name');
      expect(name).toBeTruthy();
      expect(name!.textContent).toContain('My Section');
    });

    it('UC-ST3: should render create section button when sections exist', () => {
      fixture.componentRef.setInput('study', { sections: [mockSection] });
      fixture.detectChanges();

      const btn = getByTestId('create-section-btn');
      expect(btn).toBeTruthy();
    });

    it('UC-ST4: should render section actions button for each section', () => {
      fixture.componentRef.setInput('study', { sections: [mockSection] });
      fixture.detectChanges();

      const actionsBtn = getByTestId('section-actions-btn');
      expect(actionsBtn).toBeTruthy();
    });

    it('UC-ST5: should render generate state button when sections exist', () => {
      fixture.componentRef.setInput('study', { sections: [mockSection] });
      fixture.detectChanges();

      const generateBtn = getByTestId('generate-state-btn');
      expect(generateBtn).toBeTruthy();
    });
  });

  describe('HTML rendering - popover buttons', () => {
    it('should render create-section-empty-btn when no sections exist', () => {
      fixture.componentRef.setInput('study', { sections: [] });
      fixture.detectChanges();

      const btn = getByTestId('create-section-empty-btn');
      expect(btn).toBeTruthy();
      expect(btn?.tagName).toBe('BUTTON');
    });

    it('should render section-view-btn in popover', async () => {
      fixture.componentRef.setInput('study', { sections: [mockSection] });
      fixture.detectChanges();

      const triggerBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.section__content-action');
      triggerBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const viewBtn = document.body.querySelector('[data-testid="section-view-btn"]');
      expect(viewBtn).toBeTruthy();
      expect(viewBtn?.tagName).toBe('BUTTON');
    });

    it('should render section-edit-btn in popover', async () => {
      fixture.componentRef.setInput('study', { sections: [mockSection] });
      fixture.detectChanges();

      const triggerBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.section__content-action');
      triggerBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const editBtn = document.body.querySelector('[data-testid="section-edit-btn"]');
      expect(editBtn).toBeTruthy();
      expect(editBtn?.tagName).toBe('BUTTON');
    });

    it('should render section-add-ic-btn in popover', async () => {
      fixture.componentRef.setInput('study', { sections: [mockSection] });
      fixture.detectChanges();

      const triggerBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.section__content-action');
      triggerBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const addBtn = document.body.querySelector('[data-testid="section-add-ic-btn"]');
      expect(addBtn).toBeTruthy();
      expect(addBtn?.tagName).toBe('BUTTON');
    });

    it('should render section-duplicate-btn in popover', async () => {
      fixture.componentRef.setInput('study', { sections: [mockSection] });
      fixture.detectChanges();

      const triggerBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.section__content-action');
      triggerBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const dupBtn = document.body.querySelector('[data-testid="section-duplicate-btn"]');
      expect(dupBtn).toBeTruthy();
      expect(dupBtn?.tagName).toBe('BUTTON');
    });

    it('should render section-delete-btn in popover', async () => {
      fixture.componentRef.setInput('study', { sections: [mockSection] });
      fixture.detectChanges();

      const triggerBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.section__content-action');
      triggerBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const delBtn = document.body.querySelector('[data-testid="section-delete-btn"]');
      expect(delBtn).toBeTruthy();
      expect(delBtn?.tagName).toBe('BUTTON');
    });
  });

  describe('component methods', () => {
    it('should select and unselect section', () => {
      component.selectSection(mockSection, { checked: true });
      expect(component.selectedSection()).toBe(mockSection.uuid);

      component.selectSection(mockSection, { checked: false });
      expect(component.selectedSection()).toBe('');
    });

    it('should open create section modal with default state', () => {
      component.openNewSectionModalCreate();

      expect(component.newSectionModalMode()).toBe('create');
      expect(component.isNewSectionModalOpen()).toBe(true);
      expect(component.currentSection().uuid.length).toBeGreaterThan(0);
    });

    it('should update section modal open state', () => {
      component.onModalOpenChange(true);
      expect(component.isNewSectionModalOpen()).toBe(true);

      component.onModalOpenChange(false);
      expect(component.isNewSectionModalOpen()).toBe(false);
    });

    it('should update initial condition modal open state', () => {
      component.onInitialConditionModalOpenChange(true);
      expect(component.isInitialConditionModalOpen()).toBe(true);

      component.onInitialConditionModalOpenChange(false);
      expect(component.isInitialConditionModalOpen()).toBe(false);
    });

    it('should update initial condition modal mode', () => {
      component.onInitialConditionModalChangeMode('view');
      expect(component.initialConditionModalMode()).toBe('view');

      component.onInitialConditionModalChangeMode('edit');
      expect(component.initialConditionModalMode()).toBe('edit');
    });

    it('should compute selected initial condition uuid when valid', () => {
      fixture.componentRef.setInput('study', { sections: [mockSection] });
      component.selectedSection.set(mockSection.uuid);
      fixture.detectChanges();

      expect(component.getSelectedInitialConditionUuid()).toBe('ic-1');
    });

    it('should return undefined selected initial condition uuid when invalid', () => {
      const studyWithInvalidSelected = {
        sections: [{ ...mockSection, selected_initial_condition_uuid: 'missing-ic' }]
      };
      fixture.componentRef.setInput('study', studyWithInvalidSelected);
      component.selectedSection.set(mockSection.uuid);
      fixture.detectChanges();

      expect(component.getSelectedInitialConditionUuid()).toBeUndefined();
    });

    it('should return orderedInitialConditions in reverse order and cloned', () => {
      const input = [
        { ...mockInitialCondition, uuid: 'ic-a' },
        { ...mockInitialCondition, uuid: 'ic-b' }
      ];

      const ordered = component.orderedInitialConditions(input);
      expect(ordered.map((ic) => ic.uuid)).toEqual(['ic-b', 'ic-a']);

      ordered[0].name = 'Mutated';
      expect(input[1].name).toBe('Init Cond');
    });
  });

  describe('initial condition actions', () => {
    it('should emit delete initial condition payload', () => {
      component.deleteInitialConditionClick({ initialCondition: mockInitialCondition, section: mockSection });

      expect(component.deleteInitialCondition.emit).toHaveBeenCalledWith({
        section: mockSection,
        initialCondition: mockInitialCondition
      });
    });

    it('should open modal in view mode for viewInitialConditionClick', () => {
      component.viewInitialConditionClick({ initialCondition: mockInitialCondition, section: mockSection });

      expect(component.initialConditionModalMode()).toBe('view');
      expect(component.isInitialConditionModalOpen()).toBe(true);
    });

    it('should open modal in edit mode for editInitialConditionClick', () => {
      component.editInitialConditionClick({ initialCondition: mockInitialCondition, section: mockSection });

      expect(component.initialConditionModalMode()).toBe('edit');
      expect(component.isInitialConditionModalOpen()).toBe(true);
    });

    it('should emit duplicated initial condition payload with a generated uuid', () => {
      component.duplicateInitialConditionClick({ initialCondition: mockInitialCondition, section: mockSection });

      expect(component.duplicateInitialCondition.emit).toHaveBeenCalled();
      const payload = (component.duplicateInitialCondition.emit as vi.Mock).mock.calls[0][0] as {
        section: Section;
        initialCondition: InitialCondition;
        newUuid: string;
      };
      expect(payload.section).toEqual(mockSection);
      expect(payload.initialCondition).toEqual(mockInitialCondition);
      expect(typeof payload.newUuid).toBe('string');
      expect(payload.newUuid.length).toBeGreaterThan(0);
    });

    it('should emit setInitialCondition payload', () => {
      component.selectInitialConditionClick({ initialCondition: mockInitialCondition, section: mockSection });

      expect(component.setInitialCondition.emit).toHaveBeenCalledWith({
        section: mockSection,
        initialCondition: mockInitialCondition
      });
    });
  });

  describe('charge case actions', () => {
    it('should return mapped charge options', () => {
      const sectionWithCharges = {
        ...mockSection,
        charges: [
          { uuid: 'charge-1', name: 'Charge 1' },
          { uuid: 'charge-2', name: 'Charge 2' }
        ]
      } as unknown as Section;

      expect(component.getChargesOptions(sectionWithCharges)).toEqual([
        { label: 'Charge 1', value: 'charge-1' },
        { label: 'Charge 2', value: 'charge-2' }
      ]);
    });

    it('should call chargesService methods for select, delete and duplicate', () => {
      fixture.componentRef.setInput('study', { uuid: 'study-1', sections: [mockSection] });
      fixture.detectChanges();

      component.selectChargeCase({ label: 'Charge', value: 'charge-1' }, mockSection);
      component.deleteChargeCase({ label: 'Charge', value: 'charge-1' }, mockSection);
      component.duplicateChargeCase({ label: 'Charge', value: 'charge-1' }, mockSection);

      expect(mockChargesService.setSelectedCharge).toHaveBeenCalledWith('study-1', mockSection.uuid, 'charge-1');
      expect(mockChargesService.deleteCharge).toHaveBeenCalledWith('study-1', mockSection.uuid, 'charge-1');
      expect(mockChargesService.duplicateCharge).toHaveBeenCalledWith('study-1', mockSection.uuid, 'charge-1');
    });

    it('should open load table tool when viewing or editing a charge case with value', () => {
      const openToolSpy = vi.spyOn(
        (component as unknown as { toolbarDialogService: ToolbarDialogService }).toolbarDialogService,
        'openTool'
      );
      const studySetSpy = vi.spyOn((component as unknown as { plotService: PlotService }).plotService.study, 'set');
      const sectionSetSpy = vi.spyOn(
        (component as unknown as { spanService: PlotSpanService }).spanService.section,
        'set'
      );
      fixture.componentRef.setInput('study', { uuid: 'study-1', sections: [mockSection] });
      fixture.detectChanges();

      component.viewOrEditChargeCase({ label: 'Charge', value: 'charge-1' }, 'view', mockSection);

      expect(openToolSpy).toHaveBeenCalledWith('load-table', {
        mode: 'view',
        chargeUuid: 'charge-1'
      });
      expect(studySetSpy).toHaveBeenCalledWith(component.study());
      expect(sectionSetSpy).toHaveBeenCalledWith(mockSection);
    });

    it('should not open load table tool when charge has no value', () => {
      const openToolSpy = vi.spyOn(
        (component as unknown as { toolbarDialogService: ToolbarDialogService }).toolbarDialogService,
        'openTool'
      );
      component.viewOrEditChargeCase({ label: 'Charge', value: '' }, 'edit', mockSection);

      expect(openToolSpy).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Phase 5 — close/reopen cycle and import-section propagation
  // -------------------------------------------------------------------------

  describe('modal close/reopen cycle (import edit flow)', () => {
    it('onModalOpenChange(false) should close the modal', () => {
      component.isNewSectionModalOpen.set(true);
      component.onModalOpenChange(false);
      expect(component.isNewSectionModalOpen()).toBe(false);
    });

    it('onModalOpenChange(true) should reopen the modal', () => {
      component.isNewSectionModalOpen.set(false);
      component.onModalOpenChange(true);
      expect(component.isNewSectionModalOpen()).toBe(true);
    });

    it('setting currentSection via setSection binding should update currentSection', () => {
      const importedSection = { ...mockSection, uuid: 'imported-uuid', name: 'Imported' };
      component.currentSection.set(importedSection);
      expect(component.currentSection().uuid).toBe('imported-uuid');
    });

    it('setting newSectionModalMode via setMode binding should update the mode', () => {
      component.newSectionModalMode.set('edit');
      expect(component.newSectionModalMode()).toBe('edit');
    });

    it('editSection non-regression: sets currentSection, mode=edit and opens modal', () => {
      component.editSection(mockSection);
      expect(component.currentSection().uuid).toBe(mockSection.uuid);
      expect(component.newSectionModalMode()).toBe('edit');
      expect(component.isNewSectionModalOpen()).toBe(true);
    });

    it('openNewSectionModalCreate non-regression: resets section, mode=create and opens modal', () => {
      component.openNewSectionModalCreate();
      expect(component.newSectionModalMode()).toBe('create');
      expect(component.isNewSectionModalOpen()).toBe(true);
    });
  });
});
