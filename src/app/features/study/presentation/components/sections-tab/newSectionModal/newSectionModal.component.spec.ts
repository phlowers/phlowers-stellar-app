import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewSectionModalComponent } from './newSectionModal.component';
import { Section, Study, Support } from '@shared/domain';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { SectionService } from '@services/section/section.service';
import { NotificationService } from '@services/notification/notification.service';
import { Subject } from 'rxjs';

class MockMaintenanceService {
  ready = { next: vi.fn() };
  getMaintenance = vi.fn().mockResolvedValue([]);
  importFromFile = vi.fn().mockResolvedValue(undefined);
}

class MockLinesService {
  ready = { next: vi.fn() };
  getLinesCount = vi.fn().mockResolvedValue(0);
  getLines = vi.fn().mockResolvedValue([]);
  importFromFile = vi.fn().mockResolvedValue(undefined);
}

class MockChainsService {
  ready = { next: vi.fn() };
  getChains = vi.fn().mockResolvedValue([]);
  importFromFile = vi.fn().mockResolvedValue(undefined);
}

class MockAttachmentService {
  allAttachments$ = new Subject<never[]>();
  ready = { next: vi.fn() };
  getAttachments = vi.fn().mockResolvedValue([]);
  getDistinctSupportNames = vi.fn().mockResolvedValue([]);
  getAttachmentsBySupportName = vi.fn().mockResolvedValue([]);
  getAttachmentDetails = vi.fn().mockResolvedValue(undefined);
  importFromFile = vi.fn().mockResolvedValue(undefined);
}

class MockSectionService {
  duplicateSection = vi.fn().mockResolvedValue(undefined);
  deleteSection = vi.fn();
}

class MockNotificationService {
  error = vi.fn();
  success = vi.fn();
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
    vtl_and_guying: undefined,
    cable_modifications: [],
    selected_cable_modification_uuid: null,
    cable_span_manipulations: [],
    selected_cable_span_manipulation_uuid: null
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
      imports: [NewSectionModalComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MaintenanceService, useClass: MockMaintenanceService },
        { provide: LinesService, useClass: MockLinesService },
        { provide: ChainsService, useClass: MockChainsService },
        { provide: AttachmentService, useClass: MockAttachmentService },
        { provide: SectionService, useClass: MockSectionService },
        { provide: NotificationService, useClass: MockNotificationService },
        provideHttpClient(),
        provideHttpClientTesting()
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
    const spy = vi.spyOn(component.isOpenChange, 'emit');
    component.onVisibleChange(false);
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should emit sectionChange and update validation when onSectionChange called', () => {
    const spy = vi.spyOn(component.sectionChange, 'emit');
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
    const spyOutput = vi.spyOn(component.outputSection, 'emit');
    const spyOpen = vi.spyOn(component.isOpenChange, 'emit');

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

  describe('headerTitle', () => {
    it('should return the create text when mode is create', () => {
      expect(component.headerTitle()).toBe('Create a study section');
    });

    it('should return the edit text when mode is edit', () => {
      fixture.componentRef.setInput('mode', 'edit');
      fixture.detectChanges();
      expect(component.headerTitle()).toBe('Modify a study section');
    });

    it('should return the view text when mode is view', () => {
      fixture.componentRef.setInput('mode', 'view');
      fixture.detectChanges();
      expect(component.headerTitle()).toBe('View a study section');
    });
  });

  describe('onDuplicateSection', () => {
    it('should call duplicateSection and emit setSection with the new section', async () => {
      const sectionService = TestBed.inject(SectionService) as unknown as MockSectionService;
      const newSection = { ...mockSection, uuid: 'new-uuid' };
      sectionService.duplicateSection.mockResolvedValue(newSection);
      const spy = vi.spyOn(component.setSection, 'emit');

      await component.onDuplicateSection();

      expect(sectionService.duplicateSection).toHaveBeenCalledWith(mockStudy, mockSection);
      expect(spy).toHaveBeenCalledWith(newSection);
    });
  });

  describe('onEditSection', () => {
    it('should emit setMode(edit) and call checkFields', () => {
      fixture.componentRef.setInput('mode', 'view');
      fixture.detectChanges();

      const spySetMode = vi.spyOn(component.setMode, 'emit');
      const spyCheckFields = vi.spyOn(component, 'checkFields');

      component.onEditSection();

      expect(spySetMode).toHaveBeenCalledWith('edit');
      expect(spyCheckFields).toHaveBeenCalled();
    });
  });

  describe('onDeleteSection', () => {
    it('should call deleteSection and emit isOpenChange(false)', () => {
      fixture.componentRef.setInput('mode', 'view');
      fixture.detectChanges();

      const sectionService = TestBed.inject(SectionService) as unknown as MockSectionService;
      const spy = vi.spyOn(component.isOpenChange, 'emit');

      component.onDeleteSection();

      expect(sectionService.deleteSection).toHaveBeenCalledWith(mockStudy, mockSection);
      expect(spy).toHaveBeenCalledWith(false);
    });
  });

  describe('checkFields name uniqueness', () => {
    it('should set isNameUnique to false when another section has the same name', () => {
      const duplicateSection = { ...mockSection, uuid: 'other-uuid' };
      fixture.componentRef.setInput('study', { ...mockStudy, sections: [duplicateSection] });
      fixture.detectChanges();

      component.checkFields();

      expect(component.isNameUnique()).toBe(false);
    });

    it('should set isNameUnique to true when no other section shares the same name', () => {
      const otherSection = { ...mockSection, uuid: 'other-uuid', name: 'Different Section' };
      fixture.componentRef.setInput('study', { ...mockStudy, sections: [otherSection] });
      fixture.detectChanges();

      component.checkFields();

      expect(component.isNameUnique()).toBe(true);
    });

    it('should set isNameUnique to true when the only matching name belongs to the same section (same uuid)', () => {
      fixture.componentRef.setInput('study', { ...mockStudy, sections: [mockSection] });
      fixture.detectChanges();

      component.checkFields();

      expect(component.isNameUnique()).toBe(true);
    });
  });

  describe('supportsBoundsErrors', () => {
    const validSupport = {
      uuid: 'sup1',
      number: '1',
      name: 'Support 1',
      spanLength: 50,
      spanAngle: 0,
      attachmentHeight: 100,
      cableType: 'cable-type-1',
      attachmentSet: 'attachment-set-1',
      heightBelowConsole: 10,
      armLength: 0,
      chainName: 'Chain 1',
      chainLength: 10,
      chainWeight: 1,
      chainV: 1,
      counterWeight: 1,
      supportFootAltitude: 0,
      chainSurface: 1,
      attachmentPosition: 5,
      towerModel: 'Tower model 1'
    } as unknown as Support;
    it('should disable the save button when bounds errors are present', () => {
      // First, with all required fields filled and no bounds errors, the save button should be enabled.
      fixture.componentRef.setInput('section', {
        ...mockSection,
        supports: [validSupport]
      });
      fixture.detectChanges();
      let button = fixture.debugElement.query(By.css('button[app-btn][type="button"]:not([btnStyle="outlined"])'));
      expect(button.nativeElement.disabled).toBe(false);
      // When an out-of-bounds value is introduced, the save button should become disabled.
      fixture.componentRef.setInput('section', {
        ...mockSection,
        supports: [{ ...validSupport, attachmentHeight: -200 }]
      });
      fixture.detectChanges();
      button = fixture.debugElement.query(By.css('button[app-btn][type="button"]:not([btnStyle="outlined"])'));
      expect(button.nativeElement.disabled).toBe(true);
    });
  });

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    it('should render new-section-dialog', () => {
      expect(getByTestId('new-section-dialog')).toBeTruthy();
    });

    it('should render source-manual-radio in create mode', () => {
      expect(getByTestId('source-manual-radio')).toBeTruthy();
    });

    it('should render source-referencial-radio in create mode', () => {
      expect(getByTestId('source-referencial-radio')).toBeTruthy();
    });

    it('should render source-distant-referencial-radio in create mode', () => {
      expect(getByTestId('source-distant-referencial-radio')).toBeTruthy();
    });

    it('should render source-extraction-radio in create mode', () => {
      expect(getByTestId('source-extraction-radio')).toBeTruthy();
    });

    it('should render cancel-section-btn in create mode', () => {
      const el = getByTestId('cancel-section-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('should render validate-section-btn in create mode', () => {
      const el = getByTestId('validate-section-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('should render delete-section-btn in view mode', () => {
      fixture.componentRef.setInput('mode', 'view');
      fixture.detectChanges();
      const el = getByTestId('delete-section-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('should render edit-section-btn in view mode', () => {
      fixture.componentRef.setInput('mode', 'view');
      fixture.detectChanges();
      const el = getByTestId('edit-section-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });
  });

  // -------------------------------------------------------------------------
  // onImportedSectionEditRequested
  // -------------------------------------------------------------------------

  describe('onImportedSectionEditRequested', () => {
    const importedSection: Section = { ...mockSection, uuid: 'imported-uuid', name: 'Imported Section' };

    it('should increment importResetToken', () => {
      fixture.componentRef.setInput('study', { ...mockStudy, sections: [importedSection] });
      const before = component.importResetToken();
      component.onImportedSectionEditRequested('imported-uuid');
      expect(component.importResetToken()).toBe(before + 1);
    });

    it('should emit setSection with the found section', () => {
      fixture.componentRef.setInput('study', { ...mockStudy, sections: [importedSection] });
      const spy = vi.spyOn(component.setSection, 'emit');
      component.onImportedSectionEditRequested('imported-uuid');
      expect(spy).toHaveBeenCalledWith(importedSection);
    });

    it('should emit setMode("edit")', () => {
      fixture.componentRef.setInput('study', { ...mockStudy, sections: [importedSection] });
      const spy = vi.spyOn(component.setMode, 'emit');
      component.onImportedSectionEditRequested('imported-uuid');
      expect(spy).toHaveBeenCalledWith('edit');
    });

    it('should emit isOpenChange(false) then isOpenChange(true) via micro-task', async () => {
      fixture.componentRef.setInput('study', { ...mockStudy, sections: [importedSection] });
      const emitted: boolean[] = [];
      vi.spyOn(component.isOpenChange, 'emit').mockImplementation((v) => emitted.push(v as boolean));
      component.onImportedSectionEditRequested('imported-uuid');
      expect(emitted).toContain(false);
      await Promise.resolve();
      expect(emitted).toEqual([false, true]);
    });

    it('should call notificationService.error and NOT emit setSection when uuid is not found', () => {
      fixture.componentRef.setInput('study', { ...mockStudy, sections: [] });
      const notificationService = TestBed.inject(NotificationService) as unknown as MockNotificationService;
      const setSectionSpy = vi.spyOn(component.setSection, 'emit');
      component.onImportedSectionEditRequested('unknown-uuid');
      expect(notificationService.error).toHaveBeenCalled();
      expect(setSectionSpy).not.toHaveBeenCalled();
    });

    it('should NOT emit isOpenChange when uuid is not found', () => {
      fixture.componentRef.setInput('study', { ...mockStudy, sections: [] });
      const spy = vi.spyOn(component.isOpenChange, 'emit');
      component.onImportedSectionEditRequested('unknown-uuid');
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
