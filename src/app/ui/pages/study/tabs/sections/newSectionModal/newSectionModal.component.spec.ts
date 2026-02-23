import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewSectionModalComponent } from './newSectionModal.component';
import { Section, Study, Support } from '@core/domain';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MaintenanceService } from '@services/maintenance/maintenance.service';
import { LinesService } from '@services/lines/lines.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ChainsService } from '@services/chains/chains.service';
import { AttachmentService } from '@services/attachment/attachment.service';
import { SectionService } from '@services/sections/section.service';

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

class MockChainsService {
  ready = { next: jest.fn() };
  getChains = jest.fn().mockResolvedValue([]);
  importFromFile = jest.fn().mockResolvedValue(undefined);
}

class MockAttachmentService {
  ready = { next: jest.fn() };
  getAttachments = jest.fn().mockResolvedValue([]);
  importFromFile = jest.fn().mockResolvedValue(undefined);
}

class MockSectionService {
  duplicateSection = jest.fn().mockResolvedValue(undefined);
  deleteSection = jest.fn();
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
    vtl_and_guying: undefined
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
        { provide: LinesService, useClass: MockLinesService },
        { provide: ChainsService, useClass: MockChainsService },
        { provide: AttachmentService, useClass: MockAttachmentService },
        { provide: SectionService, useClass: MockSectionService }
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

    const button = fixture.debugElement.query(By.css('button[app-btn][type="button"]:not([btnStyle="outlined"])'));
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

    const button = fixture.debugElement.nativeElement.querySelector('button.app-btn-base span');
    expect(button.textContent.toLowerCase()).toContain('update section');
  });

  it('should show "create section" when mode=create', () => {
    fixture.componentRef.setInput('mode', 'create');
    fixture.detectChanges();

    const button = fixture.debugElement.nativeElement.querySelector('button.app-btn-base span');
    expect(button.textContent.toLowerCase()).toContain('create section');
  });

  describe('supportsBoundsErrors', () => {
    const validSupport: Support = {
      uuid: 'sup1',
      number: '1',
      name: null,
      spanLength: 50,
      spanAngle: 0,
      attachmentHeight: 100,
      cableType: null,
      attachmentSet: null,
      heightBelowConsole: null,
      armLength: 0,
      chainName: null,
      chainLength: null,
      chainWeight: null,
      chainV: null,
      counterWeight: null,
      supportFootAltitude: 0,
      chainSurface: null,
      attachmentPosition: null,
      towerModel: null
    };

    it('should be false when all supports are within bounds', () => {
      fixture.componentRef.setInput('section', { ...mockSection, supports: [validSupport] });
      fixture.detectChanges();
      component.checkFields();
      expect(component.supportsBoundsErrors()).toBe(false);
    });

    it('should be false when supports array is empty', () => {
      component.checkFields();
      expect(component.supportsBoundsErrors()).toBe(false);
    });

    it('should be true when attachmentHeight is below min', () => {
      fixture.componentRef.setInput('section', {
        ...mockSection,
        supports: [{ ...validSupport, attachmentHeight: -200 }]
      });
      fixture.detectChanges();
      component.checkFields();
      expect(component.supportsBoundsErrors()).toBe(true);
    });

    it('should be true when attachmentHeight is above max', () => {
      fixture.componentRef.setInput('section', {
        ...mockSection,
        supports: [{ ...validSupport, attachmentHeight: 10000 }]
      });
      fixture.detectChanges();
      component.checkFields();
      expect(component.supportsBoundsErrors()).toBe(true);
    });

    it('should be true when spanAngle is out of bounds', () => {
      fixture.componentRef.setInput('section', {
        ...mockSection,
        supports: [{ ...validSupport, spanAngle: 300 }]
      });
      fixture.detectChanges();
      component.checkFields();
      expect(component.supportsBoundsErrors()).toBe(true);
    });

    it('should be true when armLength is out of bounds', () => {
      fixture.componentRef.setInput('section', {
        ...mockSection,
        supports: [{ ...validSupport, armLength: -100 }]
      });
      fixture.detectChanges();
      component.checkFields();
      expect(component.supportsBoundsErrors()).toBe(true);
    });

    it('should be true when supportFootAltitude is out of bounds', () => {
      fixture.componentRef.setInput('section', {
        ...mockSection,
        supports: [{ ...validSupport, supportFootAltitude: -200 }]
      });
      fixture.detectChanges();
      component.checkFields();
      expect(component.supportsBoundsErrors()).toBe(true);
    });

    it('should disable the save button when bounds errors are present', () => {
      fixture.componentRef.setInput('section', {
        ...mockSection,
        supports: [{ ...validSupport, attachmentHeight: -200 }]
      });
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('button[app-btn][type="button"]:not([btnStyle="outlined"])'));
      expect(button.nativeElement.disabled).toBe(true);
    });
  });
});
