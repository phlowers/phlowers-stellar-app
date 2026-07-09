import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { InitialConditionModalComponent } from './initialConditionModal.component';
import { Section, InitialCondition } from '@shared/domain';
import { CablesService } from '@shared/catalog/services/cables.service';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject } from 'rxjs';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-duplicate')
}));

// Mock findDuplicateTitle
vi.mock('@shared/helpers/duplicate', () => ({
  findDuplicateTitle: vi.fn((_titles: string[], title: string) => `${title} (Copy 1)`)
}));

describe('InitialConditionModalComponent', () => {
  let component: InitialConditionModalComponent;
  let fixture: ComponentFixture<InitialConditionModalComponent>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const mockSection: Section = {
    uuid: 'section-1',
    internal_id: 'int-1',
    name: 'Section 1',
    short_name: 'S1',
    created_at: '',
    updated_at: '',
    internal_catalog_id: '',
    type: 'phase',
    electric_phase_number: 1,
    cable_name: '',
    cable_short_name: '',
    cables_amount: 0,
    optical_fibers_amount: 0,
    spans_amount: 0,
    begin_span_name: '',
    last_span_name: '',
    first_support_number: 0,
    last_support_number: 0,
    first_attachment_set: '',
    last_attachment_set: '',
    regional_maintenance_center_names: [],
    maintenance_center_names: [],
    regional_team_id: undefined,
    maintenance_team_id: undefined,
    maintenance_center_id: undefined,
    link_name: undefined,
    lit_code: undefined,
    lit_name: undefined,
    branch_name: undefined,
    branch_idr: undefined,
    voltage_idr: undefined,
    comment: undefined,
    supports_comment: undefined,
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
    uuid: 'ic-1',
    name: 'Cond 1',
    base_parameters: 2000,
    base_temperature: 20,
    cable_pretension: 0,
    min_temperature: 0,
    max_wind_pressure: 0,
    max_frost_width: 0
  };

  beforeEach(async () => {
    // Create mock StorageService
    const mockStorageService = {
      ready$: new BehaviorSubject<boolean>(true),
      db: {
        cables: {
          toArray: vi.fn().mockResolvedValue([])
        }
      }
    } as unknown as StorageService;

    // Create mock CablesService
    const mockCablesService = {
      getCables: vi.fn().mockResolvedValue([])
    } as unknown as CablesService;

    await TestBed.configureTestingModule({
      imports: [InitialConditionModalComponent],
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: CablesService, useValue: mockCablesService },
        provideNoopAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InitialConditionModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('section', mockSection);
    fixture.componentRef.setInput('mode', 'create');
    fixture.componentRef.setInput('initialConditionInput', mockInitialCondition);
    fixture.componentRef.setInput('initialConditions', []);
    fixture.componentRef.setInput('study', null);
    fixture.detectChanges();
  });

  describe('onVisibleChange', () => {
    it('should emit isOpenChange when visible is false', () => {
      const spy = vi.spyOn(component.isOpenChange, 'emit');
      component.onVisibleChange(false);
      expect(spy).toHaveBeenCalledWith(false);
    });

    it('should not emit when visible is true', () => {
      const spy = vi.spyOn(component.isOpenChange, 'emit');
      component.onVisibleChange(true);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('onSubmit', () => {
    it('should emit addInitialCondition when mode is create', () => {
      fixture.componentRef.setInput('mode', 'create');
      fixture.detectChanges();

      // Ensure form is valid by patching it with valid values
      component.form.patchValue({
        name: mockInitialCondition.name,
        base_parameters: mockInitialCondition.base_parameters,
        base_temperature: mockInitialCondition.base_temperature,
        cable_pretension: mockInitialCondition.cable_pretension,
        min_temperature: mockInitialCondition.min_temperature,
        max_wind_pressure: mockInitialCondition.max_wind_pressure,
        max_frost_width: mockInitialCondition.max_frost_width
      });

      const spyAdd = vi.spyOn(component.addInitialCondition, 'emit');
      const spyOpen = vi.spyOn(component.isOpenChange, 'emit');

      component.onSubmit(false);

      expect(spyOpen).toHaveBeenCalledWith(false);
      expect(spyAdd).toHaveBeenCalledWith({
        section: mockSection,
        initialCondition: expect.objectContaining({
          ...mockInitialCondition,
          ...component.form.value
        }),
        generateState: false
      });
    });

    it('should emit updateInitialCondition when mode is edit', () => {
      fixture.componentRef.setInput('mode', 'edit');
      fixture.detectChanges();

      // Ensure form is valid by patching it with valid values
      component.form.patchValue({
        name: mockInitialCondition.name,
        base_parameters: mockInitialCondition.base_parameters,
        base_temperature: mockInitialCondition.base_temperature,
        cable_pretension: mockInitialCondition.cable_pretension,
        min_temperature: mockInitialCondition.min_temperature,
        max_wind_pressure: mockInitialCondition.max_wind_pressure,
        max_frost_width: mockInitialCondition.max_frost_width
      });

      const spyUpdate = vi.spyOn(component.updateInitialCondition, 'emit');
      const spyOpen = vi.spyOn(component.isOpenChange, 'emit');

      component.onSubmit(false);

      expect(spyOpen).toHaveBeenCalledWith(false);
      expect(spyUpdate).toHaveBeenCalledWith({
        section: mockSection,
        initialCondition: expect.objectContaining({
          ...mockInitialCondition,
          ...component.form.value
        }),
        generateState: false
      });
    });

    it('should do nothing when mode is view', () => {
      fixture.componentRef.setInput('mode', 'view');
      fixture.detectChanges();

      // Ensure form is valid by patching it with valid values
      component.form.patchValue({
        name: mockInitialCondition.name,
        base_parameters: mockInitialCondition.base_parameters,
        base_temperature: mockInitialCondition.base_temperature,
        cable_pretension: mockInitialCondition.cable_pretension,
        min_temperature: mockInitialCondition.min_temperature,
        max_wind_pressure: mockInitialCondition.max_wind_pressure,
        max_frost_width: mockInitialCondition.max_frost_width
      });

      const spyAdd = vi.spyOn(component.addInitialCondition, 'emit');
      const spyUpdate = vi.spyOn(component.updateInitialCondition, 'emit');
      const spyOpen = vi.spyOn(component.isOpenChange, 'emit');

      component.onSubmit(false);

      expect(spyOpen).toHaveBeenCalledWith(false);
      expect(spyAdd).not.toHaveBeenCalled();
      expect(spyUpdate).not.toHaveBeenCalled();
    });
  });

  describe('isNumber', () => {
    it('should return true for a number', () => {
      expect(component.isNumber(5)).toBe(true);
    });

    it('should return true for zero', () => {
      expect(component.isNumber(0)).toBe(true);
    });

    it('should return true for negative numbers', () => {
      expect(component.isNumber(-5)).toBe(true);
    });

    it('should return true for floating point numbers', () => {
      expect(component.isNumber(3.14)).toBe(true);
    });
  });

  describe('onModify', () => {
    it('should emit changeMode with edit', () => {
      const spy = vi.spyOn(component.changeMode, 'emit');
      component.onModify();
      expect(spy).toHaveBeenCalledWith('edit');
    });
  });

  describe('onNameChange', () => {
    beforeEach(() => {
      const initialConditions: InitialCondition[] = [
        mockInitialCondition,
        {
          uuid: 'ic-2',
          name: 'Existing Condition',
          base_parameters: 2000,
          base_temperature: 25,
          cable_pretension: 0,
          min_temperature: 0,
          max_wind_pressure: 0,
          max_frost_width: 0
        }
      ];
      fixture.componentRef.setInput('initialConditions', initialConditions);
      fixture.detectChanges();
    });

    it('should set isNameUnique to true for unique names', () => {
      component.onNameChange('New Unique Name');
      expect(component.isNameUnique()).toBe(true);
    });

    it('should set isNameUnique to false for duplicate names', () => {
      component.onNameChange('Existing Condition');
      expect(component.isNameUnique()).toBe(false);
    });

    it('should allow same name for the same initial condition (editing)', () => {
      component.initialCondition.set(mockInitialCondition);
      component.onNameChange('Cond 1');
      expect(component.isNameUnique()).toBe(true);
    });
  });

  describe('onDelete', () => {
    it('should emit deleteInitialCondition output and close modal', () => {
      component.initialCondition.set(mockInitialCondition);
      fixture.detectChanges();

      const deleteSpy = vi.spyOn(component.deleteInitialCondition, 'emit');
      const closeModalSpy = vi.spyOn(component.isOpenChange, 'emit');

      component.onDelete();

      expect(deleteSpy).toHaveBeenCalledWith({
        section: mockSection,
        initialCondition: mockInitialCondition
      });
      expect(closeModalSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('onDuplicate', () => {
    it('should emit duplicateInitialCondition and update local state', () => {
      const existingIc: InitialCondition = {
        uuid: 'ic-original',
        name: 'Original IC',
        base_parameters: 1500,
        base_temperature: 20,
        cable_pretension: 5,
        min_temperature: -10,
        max_wind_pressure: 500,
        max_frost_width: 3
      };
      component.initialCondition.set(existingIc);
      fixture.componentRef.setInput('initialConditions', [existingIc]);
      fixture.detectChanges();

      const duplicateSpy = vi.spyOn(component.duplicateInitialCondition, 'emit');

      component.onDuplicate();

      expect(duplicateSpy).toHaveBeenCalledWith({
        initialCondition: {
          ...existingIc,
          uuid: 'mock-uuid-duplicate',
          name: 'Original IC (Copy 1)'
        },
        newUuid: 'mock-uuid-duplicate'
      });

      // Local state should be updated with duplicated IC
      const updatedIc = component.initialCondition();
      expect(updatedIc.uuid).toBe('mock-uuid-duplicate');
      expect(updatedIc.name).toBe('Original IC (Copy 1)');
      expect(updatedIc.base_parameters).toBe(1500);
      expect(updatedIc.base_temperature).toBe(20);

      // Form should be patched with duplicated values
      expect(component.form.value.name).toBe('Original IC (Copy 1)');
      expect(component.form.value.base_parameters).toBe(1500);
    });
  });

  describe('isFormValid', () => {
    it('should return true when form is valid and name is unique', () => {
      component.form.patchValue({
        name: 'Valid Name',
        base_parameters: 2000,
        base_temperature: 15
      });
      component.isNameUnique.set(true);

      expect(component.isFormValid()).toBe(true);
    });

    it('should return false when form is invalid', () => {
      component.form.patchValue({
        name: '',
        base_parameters: null
      });
      component.isNameUnique.set(true);

      expect(component.isFormValid()).toBe(false);
    });

    it('should return false when name is not unique', () => {
      component.form.patchValue({
        name: 'Duplicate Name',
        base_parameters: 2000,
        base_temperature: 15
      });
      component.isNameUnique.set(false);

      expect(component.isFormValid()).toBe(false);
    });
  });

  describe('UC: initial condition modal form rendering', () => {
    it('UC-IC1: should have name form control', () => {
      expect(component.form.controls.name).toBeTruthy();
    });

    it('UC-IC2: should have base_parameters form control', () => {
      expect(component.form.controls.base_parameters).toBeTruthy();
    });

    it('UC-IC3: should have validate and cancel behavior via outputs', () => {
      expect(component.isOpenChange).toBeTruthy();
      expect(component.addInitialCondition).toBeTruthy();
    });

    it('UC-IC4: should set form invalid when name is empty', () => {
      component.form.controls.name.setValue('');
      component.form.controls.name.markAsTouched();
      component.form.controls.name.updateValueAndValidity();

      expect(component.form.valid).toBe(false);
    });
  });

  describe('HTML rendering - dialog visibility', () => {
    it('should render p-dialog with data-testid ic-modal', () => {
      const dialog = getByTestId('ic-modal');
      expect(dialog).toBeTruthy();
      expect(dialog?.tagName).toBe('P-DIALOG');
    });

    it('should render cancel button in create mode', () => {
      fixture.componentRef.setInput('mode', 'create');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const btn = getByTestId('cancel-btn') as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.tagName).toBe('BUTTON');
      expect(btn.type).toBe('submit');
    });

    it('should render validate button in create mode', () => {
      fixture.componentRef.setInput('mode', 'create');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const btn = getByTestId('validate-btn') as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.tagName).toBe('BUTTON');
      expect(btn.type).toBe('button');
    });

    it('should disable validate button when form is invalid', () => {
      fixture.componentRef.setInput('mode', 'create');
      fixture.componentRef.setInput('isOpen', true);
      component.form.patchValue({ name: '', base_parameters: null });
      fixture.detectChanges();

      const btn = getByTestId('validate-btn') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should enable validate button when form is valid and name is unique', () => {
      fixture.componentRef.setInput('mode', 'create');
      fixture.componentRef.setInput('isOpen', true);
      component.form.patchValue({
        name: 'Valid Name',
        base_parameters: 2000,
        base_temperature: 15
      });
      component.isNameUnique.set(true);
      fixture.detectChanges();

      const btn = getByTestId('validate-btn') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it('should render delete button in view mode', () => {
      fixture.componentRef.setInput('mode', 'view');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const btn = getByTestId('delete-btn') as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.tagName).toBe('BUTTON');
      expect(btn.type).toBe('button');
    });
  });

  describe('HTML rendering - form inputs', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('mode', 'create');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
    });

    it('should render ic-name-input as a text INPUT with required attribute', () => {
      const input = getByTestId('ic-name-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.tagName).toBe('INPUT');
      expect(input.type).toBe('text');
      expect(input.required).toBe(true);
      expect(input.id).toBe('initial-condition-name');
    });

    it('should set aria-invalid to false on ic-name-input when name is unique', () => {
      component.isNameUnique.set(true);
      fixture.detectChanges();

      const input = getByTestId('ic-name-input') as HTMLInputElement;
      expect(input.getAttribute('aria-invalid')).toBe('false');
    });

    it('should set aria-invalid to true on ic-name-input when name is not unique', () => {
      component.isNameUnique.set(false);
      fixture.detectChanges();

      const input = getByTestId('ic-name-input') as HTMLInputElement;
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('should render base-parameter-input as a number INPUT with required attribute', () => {
      const input = getByTestId('base-parameter-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.tagName).toBe('INPUT');
      expect(input.type).toBe('number');
      expect(input.required).toBe(true);
      expect(input.id).toBe('initial-condition-base-parameter');
    });

    it('should render base-temperature-input as a number INPUT with required attribute', () => {
      const input = getByTestId('base-temperature-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.tagName).toBe('INPUT');
      expect(input.type).toBe('number');
      expect(input.required).toBe(true);
      expect(input.id).toBe('initial-condition-base-temperature');
    });
  });

  describe('onSubmit with generateState', () => {
    it('should pass generateState true when submitted with true', () => {
      fixture.componentRef.setInput('mode', 'create');
      fixture.detectChanges();

      component.form.patchValue({
        name: 'Test IC',
        base_parameters: 2000,
        base_temperature: 15
      });

      const spyAdd = vi.spyOn(component.addInitialCondition, 'emit');
      component.onSubmit(true);

      expect(spyAdd).toHaveBeenCalledWith(expect.objectContaining({ generateState: true }));
    });

    it('should not emit when form is invalid', () => {
      fixture.componentRef.setInput('mode', 'create');
      fixture.detectChanges();

      component.form.patchValue({ name: '', base_parameters: null });

      const spyAdd = vi.spyOn(component.addInitialCondition, 'emit');
      component.onSubmit(false);

      expect(spyAdd).not.toHaveBeenCalled();
    });
  });
});
