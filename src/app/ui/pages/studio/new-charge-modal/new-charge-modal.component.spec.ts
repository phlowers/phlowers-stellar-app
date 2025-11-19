import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewChargeModalComponent } from './new-charge-modal.component';
import { Charge } from '@src/app/core/data/database/interfaces/charge';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ChargesService } from '@src/app/core/services/charges/charges.service';
import { PlotService } from '../plot.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { Study } from '@core/data/database/interfaces/study';
import { Section } from '@core/data/database/interfaces/section';

class MockChargesService {
  getCharge = jest.fn();
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

  const mockCharge: Charge = {
    uuid: 'charge-uuid-1',
    name: 'Test Charge',
    personnelPresence: true,
    description: 'Test charge description',
    data: {
      climate: {
        windPressure: 0,
        cableTemperature: 15,
        symmetryType: 'symmetric',
        iceThickness: 0,
        frontierSupportNumber: null,
        iceThicknessBefore: null,
        iceThicknessAfter: null
      }
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
    lit: undefined,
    branch_name: undefined,
    voltage_idr: undefined,
    comment: undefined,
    supports_comment: undefined,
    supports: [],
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    charges: [mockCharge],
    selected_charge_uuid: 'charge-uuid-1'
  };

  beforeEach(async () => {
    chargesService = new MockChargesService();
    plotService = new MockPlotService();
    plotService.study.set(mockStudy);
    plotService.section.set(mockSection);

    await TestBed.configureTestingModule({
      imports: [NewChargeModalComponent, HttpClientTestingModule],
      providers: [
        provideNoopAnimations(),
        { provide: ChargesService, useValue: chargesService },
        { provide: PlotService, useValue: plotService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NewChargeModalComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('mode', 'create');
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('uuidInput', null);

    fixture.detectChanges();

    // Set isOpen to true after initial setup to trigger effect
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display create title when mode=create', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'create');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const header = fixture.debugElement.nativeElement.querySelector('p span');
    expect(header.textContent).toContain('Create a charge case');
  });

  it('should display edit title when mode=edit', () => {
    chargesService.getCharge.mockResolvedValue(mockCharge);
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('uuidInput', 'charge-uuid-1');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const header = fixture.debugElement.nativeElement.querySelector('p span');
    expect(header.textContent).toContain('Edit charge case');
  });

  it('should display view title when mode=view', () => {
    chargesService.getCharge.mockResolvedValue(mockCharge);
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'view');
    fixture.componentRef.setInput('uuidInput', 'charge-uuid-1');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const header = fixture.debugElement.nativeElement.querySelector('p span');
    expect(header.textContent).toContain('View charge case');
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
    expect(component.nameLength()).toBe(8);
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

  it('should compute nameLength correctly', () => {
    component.updateName('Test');
    expect(component.nameLength()).toBe(4);
  });

  it('should compute descriptionLength correctly', () => {
    component.updateDescription('Test Description');
    expect(component.descriptionLength()).toBe(16);
  });

  it('should compute isViewMode correctly', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'view');
    fixture.detectChanges();
    expect(component.isViewMode()).toBe(true);
    expect(component.isEditMode()).toBe(false);
    expect(component.isCreateMode()).toBe(false);
  });

  it('should compute isEditMode correctly', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.detectChanges();
    expect(component.isEditMode()).toBe(true);
    expect(component.isViewMode()).toBe(false);
    expect(component.isCreateMode()).toBe(false);
  });

  it('should compute isCreateMode correctly', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'create');
    fixture.detectChanges();
    expect(component.isCreateMode()).toBe(true);
    expect(component.isViewMode()).toBe(false);
    expect(component.isEditMode()).toBe(false);
  });

  it('should disable validate button if name is empty', () => {
    component.updateName('');
    fixture.detectChanges();

    const button = fixture.debugElement.query(
      By.css('button[app-btn][type="button"]:not([btnStyle="text"])')
    );
    expect(button.nativeElement.disabled).toBe(true);
  });

  it('should enable validate button if name is not empty', () => {
    component.updateName('Test Name');
    fixture.detectChanges();

    const button = fixture.debugElement.query(
      By.css('button[app-btn][type="button"]:not([btnStyle="text"])')
    );
    expect(button.nativeElement.disabled).toBe(false);
  });

  it('should not show validate button in view mode', async () => {
    chargesService.getCharge.mockResolvedValue(mockCharge);
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'view');
    fixture.componentRef.setInput('uuidInput', 'charge-uuid-1');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = fixture.debugElement.queryAll(
      By.css('button[app-btn][type="button"]:not([btnStyle="text"])')
    );
    expect(buttons.length).toBe(0);
  });

  it('should load charge data when mode is edit and isOpen is true', async () => {
    chargesService.getCharge.mockResolvedValue(mockCharge);
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('uuidInput', 'charge-uuid-1');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    // Wait for effect to complete
    await fixture.whenStable();

    expect(chargesService.getCharge).toHaveBeenCalledWith(
      'study-uuid',
      'section-uuid',
      'charge-uuid-1'
    );
    expect(component.name()).toBe('Test Charge');
    expect(component.personnelPresence()).toBe(true);
    expect(component.description()).toBe('Test charge description');
  });

  it('should load charge data when mode is view and isOpen is true', async () => {
    chargesService.getCharge.mockResolvedValue(mockCharge);
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'view');
    fixture.componentRef.setInput('uuidInput', 'charge-uuid-1');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    // Wait for effect to complete
    await fixture.whenStable();

    expect(chargesService.getCharge).toHaveBeenCalledWith(
      'study-uuid',
      'section-uuid',
      'charge-uuid-1'
    );
    expect(component.name()).toBe('Test Charge');
  });

  it('should reset form when mode is create and isOpen is true', async () => {
    // Set some initial values
    component.updateName('Initial Name');
    component.updatePersonnelPresence(true);
    component.updateDescription('Initial Description');

    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'create');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    // Wait for effect to complete
    await fixture.whenStable();

    expect(component.name()).toBe('');
    expect(component.personnelPresence()).toBe(false);
    expect(component.description()).toBe('');
  });

  it('should emit validate and call createOrUpdateCharge on onSubmit in create mode', async () => {
    component.updateName('New Charge');
    component.updatePersonnelPresence(false);
    component.updateDescription('New Description');

    const validateSpy = jest.spyOn(component.validate, 'emit');
    const isOpenChangeSpy = jest.spyOn(component.isOpenChange, 'emit');

    fixture.componentRef.setInput('mode', 'create');
    fixture.detectChanges();

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

  it('should emit validate and call createOrUpdateCharge on onSubmit in edit mode', async () => {
    chargesService.getCharge.mockResolvedValue(mockCharge);
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('uuidInput', 'charge-uuid-1');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    await fixture.whenStable();

    component.updateName('Updated Charge');
    const validateSpy = jest.spyOn(component.validate, 'emit');
    const isOpenChangeSpy = jest.spyOn(component.isOpenChange, 'emit');

    await component.onSubmit();

    expect(validateSpy).toHaveBeenCalled();
    const emittedCharge = validateSpy.mock.calls[0][0];
    expect(emittedCharge.uuid).toBe('charge-uuid-1');
    expect(emittedCharge.name).toBe('Updated Charge');

    expect(chargesService.createOrUpdateCharge).toHaveBeenCalledWith(
      'study-uuid',
      'section-uuid',
      expect.objectContaining({
        uuid: 'charge-uuid-1',
        name: 'Updated Charge'
      })
    );
    expect(isOpenChangeSpy).toHaveBeenCalledWith(false);
  });

  it('should throw error if study or section is not found on onSubmit', async () => {
    plotService.study.set(null);
    component.updateName('Test Charge');

    await expect(component.onSubmit()).rejects.toThrow(
      'Study or section not found'
    );
  });

  it('should enable inputs in create mode', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'create');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const nameInput = fixture.debugElement.query(By.css('#chargeName'));
    const toggleSwitch = fixture.debugElement.query(By.css('p-toggleswitch'));
    const descriptionTextarea = fixture.debugElement.query(
      By.css('#description')
    );

    expect(nameInput.nativeElement.disabled).toBe(false);
    expect(toggleSwitch.componentInstance.disabled).toBe(false);
    expect(descriptionTextarea.nativeElement.disabled).toBe(false);
  });

  it('should enable inputs in edit mode', async () => {
    chargesService.getCharge.mockResolvedValue(mockCharge);
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('uuidInput', 'charge-uuid-1');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const nameInput = fixture.debugElement.query(By.css('#chargeName'));
    const toggleSwitch = fixture.debugElement.query(By.css('p-toggleswitch'));
    const descriptionTextarea = fixture.debugElement.query(
      By.css('#description')
    );

    expect(nameInput.nativeElement.disabled).toBe(false);
    expect(toggleSwitch.componentInstance.disabled).toBe(false);
    expect(descriptionTextarea.nativeElement.disabled).toBe(false);
  });

  it('should display description length counter when not in view mode', async () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'create');
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

  it('should not display description length counter in view mode', async () => {
    chargesService.getCharge.mockResolvedValue(mockCharge);
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('mode', 'view');
    fixture.componentRef.setInput('uuidInput', 'charge-uuid-1');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const lengthCounter = fixture.debugElement.query(By.css('.input-length'));
    expect(lengthCounter).toBeFalsy();
  });
});
