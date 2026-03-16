import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewChargeModalComponent } from './new-charge-modal.component';
import { Charge, Section, Study, SymmetryType } from '@shared/domain';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ChargesService } from '@features/study/infrastructure/services/charges.service';
import { PlotService } from '@features/studio/core/services/plot.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';

class MockChargesService {
  createOrUpdateCharge = jest.fn().mockResolvedValue(undefined);
}

class MockPlotService {
  study = signal<Study | null>(null);
  section = signal<Section | null>(null);
}

describe('NewChargeModalComponent (Jest)', () => {
  let component: NewChargeModalComponent;
  let fixture: ComponentFixture<NewChargeModalComponent>;
  let chargesService: MockChargesService;
  let plotService: MockPlotService;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const mockCharge: Charge = {
    uuid: 'charge-uuid-1',
    name: 'Test Charge',
    personnelPresence: true,
    description: 'Test charge description',
    data: {
      climate: {
        windPressure: 0,
        cableTemperature: 15,
        symmetryType: SymmetryType.SYMMETRIC,
        iceThickness: 0,
        frontierSupportNumber: null,
        iceThicknessBefore: null,
        iceThicknessAfter: null
      },
      spanLoads: []
    }
  };

  const mockStudy: Study = {
    uuid: 'study-uuid',
    author_email: 'test@example.com',
    title: 'Test Study',
    description: 'Test description',
    shareable: false,
    created_at_offline: '2023-01-01',
    updated_at_offline: '2023-01-01',
    saved: true,
    sections: []
  };

  const mockSection: Section = {
    uuid: 'section-uuid',
    internal_id: 'int1',
    name: 'Test section',
    short_name: 'TS',
    created_at: 'created date',
    updated_at: 'updated date',
    internal_catalog_id: 'dont know',
    type: 'electric',
    electric_phase_number: 3,
    cable_name: 'cable1',
    cable_short_name: 'cb',
    cables_amount: 2,
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
    charges: [mockCharge],
    selected_charge_uuid: 'charge-uuid-1',
    field_measures: [],
    selected_field_measure_uuid: undefined,
    vtl_and_guying: undefined
  };

  beforeEach(async () => {
    chargesService = new MockChargesService();
    plotService = new MockPlotService();
    plotService.study.set(mockStudy);
    plotService.section.set(mockSection);

    await TestBed.configureTestingModule({
      imports: [NewChargeModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: ChargesService, useValue: chargesService },
        { provide: PlotService, useValue: plotService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NewChargeModalComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('isOpen', false);

    fixture.detectChanges();

    // Set isOpen to true after initial setup to trigger effect
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should display create title', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const header = fixture.debugElement.nativeElement.querySelector('p span');
    expect(header.textContent).toContain('Create a charge case');
  });

  it('should emit isOpenChange(false) when onClose() is called', () => {
    const spy = jest.spyOn(component.isOpenChange, 'emit');
    component.onClose();
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should emit isOpenChange(false) when dialog visibleChange event is triggered', () => {
    const spy = jest.spyOn(component.isOpenChange, 'emit');
    const dialog = fixture.debugElement.query(By.css('p-dialog'));
    dialog.triggerEventHandler('visibleChange', false);
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should update name when updateName is called', () => {
    component.updateName('New Name');
    expect(component.name()).toBe('New Name');
  });

  it('should update personnelPresence when updatePersonnelPresence is called', () => {
    component.updatePersonnelPresence(true);
    expect(component.personnelPresence()).toBe(true);
  });

  it('should update description when updateDescription is called', () => {
    component.updateDescription('New Description');
    expect(component.description()).toBe('New Description');
    expect(component.descriptionLength()).toBe(15);
  });

  it('should compute descriptionLength correctly', () => {
    component.updateDescription('Test Description');
    expect(component.descriptionLength()).toBe(16);
  });

  it('should disable validate button if name is empty', () => {
    component.updateName('');
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button[app-btn][type="button"]:not([btnStyle="text"])'));
    expect(button.nativeElement.disabled).toBe(true);
  });

  it('should enable validate button if name is not empty', () => {
    component.updateName('Test Name');
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button[app-btn][type="button"]:not([btnStyle="text"])'));
    expect(button.nativeElement.disabled).toBe(false);
  });

  it('should reset form when isOpen becomes true', async () => {
    // Set some initial values
    component.updateName('Initial Name');
    component.updatePersonnelPresence(false);
    component.updateDescription('Initial Description');

    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    // Wait for effect to complete
    await fixture.whenStable();

    // newCharge generates a name based on existing charges count (mockSection has 1 charge, so new one is "CC 2")
    expect(component.name()).toBe('CC 2');
    expect(component.personnelPresence()).toBe(true);
    expect(component.description()).toBe('');
  });

  it('should emit validate and call createOrUpdateCharge on onSubmit', async () => {
    component.updateName('New Charge');
    component.updatePersonnelPresence(false);
    component.updateDescription('New Description');

    const validateSpy = jest.spyOn(component.validate, 'emit');
    const isOpenChangeSpy = jest.spyOn(component.isOpenChange, 'emit');

    await component.onSubmit();

    expect(validateSpy).toHaveBeenCalled();
    const emittedCharge = validateSpy.mock.calls[0][0];
    expect(emittedCharge.name).toBe('New Charge');
    expect(emittedCharge.personnelPresence).toBe(false);
    expect(emittedCharge.description).toBe('New Description');
    expect(emittedCharge.uuid).toBeTruthy();

    expect(chargesService.createOrUpdateCharge).toHaveBeenCalledWith(
      'study-uuid',
      'section-uuid',
      expect.objectContaining({
        name: 'New Charge',
        personnelPresence: false,
        description: 'New Description'
      })
    );
    expect(isOpenChangeSpy).toHaveBeenCalledWith(false);
  });

  it('should throw error if study or section is not found on onSubmit', async () => {
    plotService.study.set(null);
    component.updateName('Test Charge');

    await expect(component.onSubmit()).rejects.toThrow('Study or section not found');
  });

  it('should have inputs enabled', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const nameInput = fixture.debugElement.query(By.css('#chargeName'));
    const toggleSwitch = fixture.debugElement.query(By.css('p-toggleswitch'));
    const descriptionTextarea = fixture.debugElement.query(By.css('#description'));

    expect(nameInput.nativeElement.disabled).toBe(false);
    expect(toggleSwitch.componentInstance.disabled).toBe(false);
    expect(descriptionTextarea.nativeElement.disabled).toBe(false);
  });

  it('should display description length counter', async () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();

    // Set description after effect has run
    component.updateDescription('Test');
    fixture.detectChanges();

    const lengthCounter = fixture.debugElement.query(By.css('.input-length'));
    expect(lengthCounter).toBeTruthy();
    expect(lengthCounter.nativeElement.textContent).toContain('4/240');
  });

  it('should invalidate form if name already exists', () => {
    // mockSection has a charge named 'Test Charge'
    component.updateName('Test Charge');
    expect(component.isFormValid()).toBe(false);
  });

  it('should validate form if name is unique', () => {
    component.updateName('Unique Charge Name');
    expect(component.isFormValid()).toBe(true);
  });

  it('should detect duplicate name via isNameDuplicate', () => {
    component.updateName('Test Charge');
    expect(component.isNameDuplicate()).toBe(true);

    component.updateName('Unique Name');
    expect(component.isNameDuplicate()).toBe(false);
  });

  it('should show error message when name is duplicate', () => {
    component.updateName('Test Charge');
    fixture.detectChanges();

    const errorMessage = fixture.debugElement.query(By.css('#charge-name-error-message'));
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.nativeElement.textContent).toContain(' The charge case name must be unique. ');
  });

  it('should not show error message when name is unique', () => {
    component.updateName('Unique Name');
    fixture.detectChanges();

    const errorMessage = fixture.debugElement.query(By.css('#charge-name-error-message'));
    expect(errorMessage).toBeNull();
  });

  it('should set aria-invalid and aria-errormessage when name is duplicate', () => {
    component.updateName('Test Charge');
    fixture.detectChanges();

    const nameInput = fixture.debugElement.query(By.css('#chargeName')).nativeElement;
    expect(nameInput.getAttribute('aria-invalid')).toBe('true');
    expect(nameInput.getAttribute('aria-errormessage')).toBe('charge-name-error-message');
  });

  it('should not set aria-invalid or aria-errormessage when name is unique', () => {
    component.updateName('Unique Name');
    fixture.detectChanges();

    const nameInput = fixture.debugElement.query(By.css('#chargeName')).nativeElement;
    expect(nameInput.getAttribute('aria-invalid')).toBe('false');
    expect(nameInput.getAttribute('aria-errormessage')).toBeNull();
  });

  it('should return false for isNameDuplicate when section has no charges', () => {
    plotService.section.set({ ...mockSection, charges: [] });
    component.updateName('Any Name');
    expect(component.isNameDuplicate()).toBe(false);
  });

  it('should reset form when section has no charges defined', async () => {
    plotService.section.set({
      ...mockSection,
      charges: undefined
    } as unknown as Section);

    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.name()).toBe('CC 1');
  });

  describe('UC: new charge modal rendering', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('isOpen', false);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('UC-NC1: should render charge name input', () => {
      const input = getByTestId('charge-name-input');
      expect(input).toBeTruthy();
    });

    it('UC-NC2: should render personnel toggle switch', () => {
      const toggle = getByTestId('personnel-toggle');
      expect(toggle).toBeTruthy();
    });

    it('UC-NC3: should render validate and close buttons', () => {
      expect(getByTestId('validate-btn')).toBeTruthy();
      expect(getByTestId('close-btn')).toBeTruthy();
    });

    it('UC-NC4: should show name error when name is duplicate', () => {
      component.updateName('Test Charge');
      fixture.detectChanges();

      const error = getByTestId('name-error');
      expect(error).toBeTruthy();
    });
  });
});
