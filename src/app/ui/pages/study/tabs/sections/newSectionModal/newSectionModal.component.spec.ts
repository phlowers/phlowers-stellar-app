import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewSectionModalComponent } from './newSectionModal.component';
import { Section } from '@core/data/database/interfaces/section';
import { Study } from '@core/data/database/interfaces/study';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MaintenanceService } from '@core/services/maintenance/maintenance.service';
import { LinesService } from '@core/services/lines/lines.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

class MockMaintenanceService {
  ready = { next: jest.fn() };
  getMaintenance = jest.fn().mockResolvedValue([]);
  importFromFile = jest.fn().mockResolvedValue(undefined);
}

class MockLinesService {
  ready = { next: jest.fn() };
  getLinesCount = jest.fn().mockResolvedValue(0);
  getLines = jest.fn().mockResolvedValue([]);
  importFromFile = jest.fn().mockResolvedValue(undefined);
}

describe('NewSectionModalComponent (Jest)', () => {
  let component: NewSectionModalComponent;
  let fixture: ComponentFixture<NewSectionModalComponent>;

  const mockSection: Section = {
    uuid: 'uuid1',
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
    gmr: undefined,
    eel: undefined,
    cm: undefined,
    link_name: undefined,
    lit: undefined,
    branch_name: undefined,
    electric_tension_level: undefined,
    comment: undefined,
    supports: [],
    initial_conditions: [],
    selected_initial_condition_uuid: undefined
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewSectionModalComponent, HttpClientTestingModule],
      providers: [
        provideNoopAnimations(),
        { provide: MaintenanceService, useClass: MockMaintenanceService },
        { provide: LinesService, useClass: MockLinesService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NewSectionModalComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('section', mockSection);
    fixture.componentRef.setInput('study', mockStudy);
    fixture.componentRef.setInput('mode', 'create');
    fixture.componentRef.setInput('isOpen', true);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display create title when mode=create', () => {
    fixture.componentRef.setInput('mode', 'create');
    fixture.detectChanges();

    const header = fixture.debugElement.nativeElement.querySelector('p span');
    expect(header.textContent).toContain('Create a section');
  });

  it('should display section name when mode != create', () => {
    fixture.componentRef.setInput('mode', 'edit');
    fixture.detectChanges();

    const header = fixture.debugElement.nativeElement.querySelector('p span');
    expect(header.textContent).toContain('Test section');
  });

  it('should emit isOpenChange(false) when onVisibleChange(false)', () => {
    const spy = jest.spyOn(component.isOpenChange, 'emit');
    component.onVisibleChange(false);
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should emit sectionChange and update validation when onSectionChange called', () => {
    const spy = jest.spyOn(component.sectionChange, 'emit');
    const updated = { ...mockSection, name: 'Updated Section' };
    component.onSectionChange(updated);

    expect(spy).toHaveBeenCalledWith(updated);
    expect(component.areAllRequiredFieldsFilled()).toBe(true);
  });

  it('should disable validate button if required fields are missing', () => {
    fixture.componentRef.setInput('section', { ...mockSection, name: '' });
    fixture.detectChanges();

    const button = fixture.debugElement.query(
      By.css('button[app-btn][type="button"]:not([btnStyle="outlined"])')
    );
    expect(button.nativeElement.disabled).toBe(true);
  });

  it('should emit outputSection and close modal on validate', () => {
    const spyOutput = jest.spyOn(component.outputSection, 'emit');
    const spyOpen = jest.spyOn(component.isOpenChange, 'emit');

    component.onValidate();

    expect(spyOutput).toHaveBeenCalledWith(mockSection);
    expect(spyOpen).toHaveBeenCalledWith(false);
  });

  it('should show "update section" when mode=edit', () => {
    fixture.componentRef.setInput('mode', 'edit');
    fixture.detectChanges();

    const button = fixture.debugElement.nativeElement.querySelector(
      'button.app-btn-base span'
    );
    expect(button.textContent.toLowerCase()).toContain('update section');
  });

  it('should show "create section" when mode=create', () => {
    fixture.componentRef.setInput('mode', 'create');
    fixture.detectChanges();

    const button = fixture.debugElement.nativeElement.querySelector(
      'button.app-btn-base span'
    );
    expect(button.textContent.toLowerCase()).toContain('create section');
  });
});
