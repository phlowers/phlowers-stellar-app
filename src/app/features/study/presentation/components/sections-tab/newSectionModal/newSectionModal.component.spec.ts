import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewSectionModalComponent } from './newSectionModal.component';
import { createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { Section, Study, Support } from '@shared/domain';
import { By } from '@angular/platform-browser';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { SectionService } from '@services/section/section.service';
import { NotificationService } from '@services/notification/notification.service';
import { Subject } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ManualSectionComponent } from './manualSection/manualSection.component';
import { GeopositioningService } from '@services/geopositioning/geopositioning.service';
import { LoggerService } from '@core/services/logger/logger.service';

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

class MockChainsService {
  ready = { next: vi.fn() };
  getChains = vi.fn().mockResolvedValue([]);
  importFromFile = vi.fn().mockResolvedValue(undefined);
}

class MockAttachmentService {
  allAttachments$ = new Subject<never[]>();
  distinctSupportNames$ = new Subject<string[]>();
  ready = { next: vi.fn() };
  getAttachments = vi.fn().mockResolvedValue([]);
  getDistinctSupportNames = vi.fn().mockResolvedValue([]);
  getAttachmentsBySupportName = vi.fn().mockResolvedValue([]);
  getAttachmentDetails = vi.fn().mockResolvedValue(undefined);
  importFromFile = vi.fn().mockResolvedValue(undefined);
}

class MockSectionService {
  duplicateSection = vi.fn().mockResolvedValue(undefined);
  deleteSection = vi.fn().mockResolvedValue(undefined);
}

class MockNotificationService {
  error = vi.fn();
  success = vi.fn();
  warning = vi.fn();
}

describe('NewSectionModalComponent', () => {
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
    regional_team_id: undefined,
    maintenance_team_id: undefined,
    maintenance_center_id: undefined,
    link_idr: undefined,
    link_adr: undefined,
    lit_idr: undefined,
    lit_adr: undefined,
    branch_adr: undefined,
    branch_idr: undefined,
    voltage_idr: undefined,
    voltage_adr: undefined,
    cm_designation: undefined,
    gmr_designation: undefined,
    eel_designation: undefined,
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
    start_azimuth: null,
    position_error_meters: null
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
      imports: [
        NewSectionModalComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'section-modal.title-view': 'View a study section',
              'section-modal.title-modify': 'Modify a study section',
              'section-modal.title-create': 'Create a study section',
              'section-import.import-error': 'The imported section could not be found. Please try again.',
              'section-modal.create-btn': 'Create section',
              'section-modal.update-btn': 'Update section',
              'common.create-a-section-label': 'Create a section'
            }
          },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en'
          },
          preloadLangs: true
        })
      ],
      providers: [
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

  describe('onValidate', () => {
    const sectionWithSupports: Section = {
      ...mockSection,
      supports: [createEmptySupport(), createEmptySupport()]
    };

    it('should leave the section without geolocation when the location inputs are empty', () => {
      fixture.componentRef.setInput('section', sectionWithSupports);
      fixture.componentRef.setInput('mode', 'create');
      fixture.detectChanges();
      const spyOutput = vi.spyOn(component.outputSection, 'emit');
      const spyOpen = vi.spyOn(component.isOpenChange, 'emit');

      component.onValidate();

      const emitted = spyOutput.mock.calls[0][0];
      expect(emitted.supports[0].footLatitude).toBeNull();
      expect(emitted.supports[0].footLongitude).toBeNull();
      expect(emitted.start_azimuth).toBe(sectionWithSupports.start_azimuth);
      expect(emitted).toEqual(sectionWithSupports);
      expect(spyOpen).toHaveBeenCalledWith(false);
    });

    it('should start with empty location data when the section has no start GPS', () => {
      fixture.componentRef.setInput('section', sectionWithSupports);
      fixture.detectChanges();

      expect(component.locationData()).toEqual({ latitude: null, longitude: null, azimuth: null, isValid: true });
      expect(component.isLocationValid()).toBe(true);
    });

    it('should validate the section with the former support 1 as start after deleting support 0', async () => {
      const s1 = {
        ...createEmptySupport(),
        footLatitude: 45,
        footLongitude: 3,
        spanAzimut: 100,
        spanAngle: 10,
        spanLength: 300
      };
      const s2 = {
        ...createEmptySupport(),
        footLatitude: 45.1,
        footLongitude: 3.1,
        spanAzimut: 137,
        spanAngle: 25,
        spanLength: 250
      };
      const s3 = {
        ...createEmptySupport(),
        footLatitude: 45.2,
        footLongitude: 3.2,
        spanAzimut: 200,
        spanAngle: 0,
        spanLength: 200
      };
      const geolocatedSection: Section = { ...mockSection, supports: [s1, s2, s3], start_azimuth: 90 };
      fixture.componentRef.setInput('section', geolocatedSection);
      fixture.componentRef.setInput('mode', 'edit');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      const manualSection = fixture.debugElement.query(By.directive(ManualSectionComponent))
        .componentInstance as ManualSectionComponent;

      await manualSection.deleteSupport(s1.uuid);
      fixture.detectChanges();
      const spyOutput = vi.spyOn(component.outputSection, 'emit');
      await component.onValidate();

      const emitted = spyOutput.mock.calls[0][0];
      expect(emitted.supports[0].footLatitude).toBe(45.1);
      expect(emitted.supports[0].footLongitude).toBe(3.1);
      expect(emitted.supports[1].footLatitude).toBe(45.2);
      expect(emitted.start_azimuth).toBeCloseTo(137 - 25 * 0.9, 10);
    });

    it('should merge locationData into section when locationData is set', () => {
      fixture.componentRef.setInput('section', sectionWithSupports);
      fixture.detectChanges();
      component.onLocationChange({ latitude: 48.5, longitude: 2.3, azimuth: 90, isValid: true });
      const spyOutput = vi.spyOn(component.outputSection, 'emit');

      component.onValidate();

      const emitted = spyOutput.mock.calls[0][0];
      expect(emitted.supports[0].footLatitude).toBe(48.5);
      expect(emitted.supports[0].footLongitude).toBe(2.3);
      expect(emitted.supports[1]).toEqual(sectionWithSupports.supports[1]);
      expect(emitted.start_azimuth).toBe(90);
    });

    it('should preserve existing section location values when locationData is null', () => {
      const sectionWithLocation: Section = {
        ...mockSection,
        supports: [
          { ...mockSection.supports[0], footLatitude: 45, footLongitude: 1 },
          ...mockSection.supports.slice(1)
        ],
        start_azimuth: 45
      };
      fixture.componentRef.setInput('section', sectionWithLocation);
      fixture.detectChanges();
      const spyOutput = vi.spyOn(component.outputSection, 'emit');

      component.onValidate();

      expect(spyOutput).toHaveBeenCalledWith(sectionWithLocation);
    });

    it('should remove the geolocation when the user clears the location of a geolocated section', () => {
      const geolocated: Section = {
        ...mockSection,
        supports: [
          { ...createEmptySupport(), footLatitude: 45, footLongitude: 1, spanAzimut: 30 },
          { ...createEmptySupport(), footLatitude: 45.1, footLongitude: 1.1 }
        ],
        start_azimuth: 45
      };
      fixture.componentRef.setInput('section', geolocated);
      fixture.detectChanges();
      component.onLocationChange({ latitude: null, longitude: null, azimuth: null, isValid: true });
      const spyOutput = vi.spyOn(component.outputSection, 'emit');

      component.onValidate();

      const emitted = spyOutput.mock.calls[0][0];
      expect(emitted.start_azimuth).toBeNull();
      for (const support of emitted.supports) {
        expect(support.footLatitude).toBeNull();
        expect(support.footLongitude).toBeNull();
        expect(support.spanAzimut).toBeNull();
      }
    });
  });

  describe('adding a support before support 0 on a geolocated section', () => {
    const makeSupport = (uuid: string, overrides: Partial<Support>): Support => ({
      ...createEmptySupport(),
      uuid,
      ...overrides
    });

    const geolocatedSupports = (): Support[] => [
      makeSupport('old-0', { footLatitude: 45, footLongitude: 3, spanAzimut: 100, spanAngle: 10, spanLength: 300 }),
      makeSupport('old-1', { footLatitude: 45.1, footLongitude: 3.1, spanAzimut: 137, spanAngle: 25, spanLength: 250 }),
      makeSupport('old-2', { footLatitude: 45.2, footLongitude: 3.2, spanAzimut: 200, spanAngle: 0, spanLength: 200 })
    ];

    let geopositioning: GeopositioningService;
    let manualSection: ManualSectionComponent;

    beforeEach(() => {
      geopositioning = TestBed.inject(GeopositioningService);
      fixture.componentRef.setInput('section', { ...mockSection, supports: geolocatedSupports(), start_azimuth: 90 });
      fixture.componentRef.setInput('mode', 'edit');
      fixture.detectChanges();
      manualSection = fixture.debugElement.query(By.directive(ManualSectionComponent))
        .componentInstance as ManualSectionComponent;
    });

    const insertBeforeFirstSupport = async (): Promise<void> => {
      await manualSection.addSupport(0, 'before');
      fixture.detectChanges();
    };

    it('should keep the existing supports in place and clear the start while the anchor is pending', async () => {
      await insertBeforeFirstSupport();

      const supports = component.section().supports ?? [];
      expect(component.startAnchor()).toEqual({
        supportUuid: 'old-0',
        gps: { latitude: 45, longitude: 3 },
        spanAzimuth: 100
      });
      expect(supports).toHaveLength(4);
      expect(supports[0].footLatitude).toBeNull();
      expect(supports[1].footLatitude).toBe(45);
      expect(supports[1].spanAzimut).toBe(100);
      expect(supports[2].footLatitude).toBe(45.1);
      expect(component.section().start_azimuth).toBeNull();
      expect(component.locationData()).toEqual({ latitude: null, longitude: null, azimuth: null, isValid: true });
    });

    it('should compute the new start from the former support 0 on validate', async () => {
      await insertBeforeFirstSupport();
      const newSupport = component.section().supports![0];
      newSupport.spanLength = 180;
      newSupport.spanAngle = 4;
      const computeSpy = vi
        .spyOn(geopositioning, 'computeStartFromNextSupport')
        .mockResolvedValue({ point: { latitude: 44.9, longitude: 2.9 }, azimuth: 30 });
      const spyOutput = vi.spyOn(component.outputSection, 'emit');

      await component.onValidate();

      expect(computeSpy).toHaveBeenCalledOnce();
      expect(computeSpy).toHaveBeenCalledWith({
        next: { latitude: 45, longitude: 3 },
        nextSpanAzimuth: 100,
        spanLength: 180,
        lineAngle: [4, 10]
      });
      const emitted = spyOutput.mock.calls[0][0];
      expect(emitted.supports[0].footLatitude).toBe(44.9);
      expect(emitted.supports[0].footLongitude).toBe(2.9);
      expect(emitted.start_azimuth).toBe(30);
      expect(emitted.supports[1].footLatitude).toBe(45);
      expect(emitted.supports[1].spanAzimut).toBe(100);
      expect(emitted.supports[2].footLatitude).toBe(45.1);
      expect(emitted.supports[3].footLatitude).toBe(45.2);
    });

    it('should chain one computation per support inserted before support 0', async () => {
      await insertBeforeFirstSupport();
      await manualSection.addSupport(0, 'before');
      fixture.detectChanges();
      const supports = component.section().supports ?? [];
      supports[0].spanLength = 150;
      supports[0].spanAngle = 2;
      supports[1].spanLength = 180;
      supports[1].spanAngle = 6;
      const computeSpy = vi
        .spyOn(geopositioning, 'computeStartFromNextSupport')
        .mockResolvedValueOnce({ point: { latitude: 44, longitude: 2 }, azimuth: 30 })
        .mockResolvedValueOnce({ point: { latitude: 43, longitude: 1 }, azimuth: -20 });
      const spyOutput = vi.spyOn(component.outputSection, 'emit');

      await component.onValidate();

      expect(computeSpy).toHaveBeenCalledTimes(2);
      expect(computeSpy).toHaveBeenNthCalledWith(1, {
        next: { latitude: 45, longitude: 3 },
        nextSpanAzimuth: 100,
        spanLength: 180,
        lineAngle: [6, 10]
      });
      expect(computeSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ next: { latitude: 44, longitude: 2 }, spanLength: 150, lineAngle: [2, 6] })
      );
      expect(computeSpy.mock.calls[1][0].nextSpanAzimuth).toBeCloseTo(35.4, 10);
      const emitted = spyOutput.mock.calls[0][0];
      expect(emitted.supports[0].footLatitude).toBe(43);
      expect(emitted.supports[0].footLongitude).toBe(1);
      expect(emitted.start_azimuth).toBeCloseTo(-20, 10);
    });

    it('should save the section without geolocation and warn when the start cannot be computed', async () => {
      await insertBeforeFirstSupport();
      component.section().supports![0].spanLength = 180;
      vi.spyOn(geopositioning, 'computeStartFromNextSupport').mockResolvedValue(null);
      const loggerWarn = vi.spyOn(TestBed.inject(LoggerService), 'warn').mockImplementation(() => undefined);
      const notificationService = TestBed.inject(NotificationService) as unknown as MockNotificationService;
      const spyOutput = vi.spyOn(component.outputSection, 'emit');

      await component.onValidate();

      expect(notificationService.warning).toHaveBeenCalledWith('section-modal.location-removed-after-insert');
      expect(loggerWarn).toHaveBeenCalled();
      const emitted = spyOutput.mock.calls[0][0];
      expect(emitted.start_azimuth).toBeNull();
      for (const support of emitted.supports) {
        expect(support.footLatitude).toBeNull();
        expect(support.footLongitude).toBeNull();
      }
    });

    it('should use the location typed by the user instead of the anchor', async () => {
      await insertBeforeFirstSupport();
      component.onLocationChange({ latitude: 46, longitude: 4, azimuth: 15, isValid: true });
      const computeSpy = vi.spyOn(geopositioning, 'computeStartFromNextSupport');
      const spyOutput = vi.spyOn(component.outputSection, 'emit');

      await component.onValidate();

      expect(component.startAnchor()).toBeNull();
      expect(computeSpy).not.toHaveBeenCalled();
      const emitted = spyOutput.mock.calls[0][0];
      expect(emitted.supports[0].footLatitude).toBe(46);
      expect(emitted.supports[0].footLongitude).toBe(4);
      expect(emitted.start_azimuth).toBe(15);
    });

    it('should forget the anchor when the modal is closed', async () => {
      await insertBeforeFirstSupport();
      expect(component.startAnchor()).not.toBeNull();

      fixture.componentRef.setInput('isOpen', false);
      fixture.detectChanges();

      expect(component.startAnchor()).toBeNull();
    });
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
      vi.spyOn(component.isOpenChange, 'emit').mockImplementation((v) => emitted.push(v));
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

  // -------------------------------------------------------------------------
  // onImportedSectionViewRequested
  // -------------------------------------------------------------------------

  describe('onImportedSectionViewRequested', () => {
    const importedSection: Section = { ...mockSection, uuid: 'imported-uuid', name: 'Imported Section' };

    it('should emit setSection with the found section and setMode("view")', () => {
      fixture.componentRef.setInput('study', { ...mockStudy, sections: [importedSection] });
      const setSectionSpy = vi.spyOn(component.setSection, 'emit');
      const setModeSpy = vi.spyOn(component.setMode, 'emit');
      component.onImportedSectionViewRequested('imported-uuid');
      expect(setSectionSpy).toHaveBeenCalledWith(importedSection);
      expect(setModeSpy).toHaveBeenCalledWith('view');
    });

    it('should call notificationService.error and NOT emit setSection when uuid is not found', () => {
      fixture.componentRef.setInput('study', { ...mockStudy, sections: [] });
      const notificationService = TestBed.inject(NotificationService) as unknown as MockNotificationService;
      const setSectionSpy = vi.spyOn(component.setSection, 'emit');
      component.onImportedSectionViewRequested('unknown-uuid');
      expect(notificationService.error).toHaveBeenCalled();
      expect(setSectionSpy).not.toHaveBeenCalled();
    });
  });
});
