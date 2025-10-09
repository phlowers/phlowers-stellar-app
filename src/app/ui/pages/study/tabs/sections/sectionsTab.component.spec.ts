import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionsTabComponent } from './sectionsTab.component';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Section } from '@core/data/database/interfaces/section';
import { InitialCondition } from '@core/data/database/interfaces/initialCondition';
import { MaintenanceService } from '@core/services/maintenance/maintenance.service';
import { LinesService } from '@core/services/lines/lines.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';

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

describe('SectionsTabComponent', () => {
  let component: SectionsTabComponent;
  let fixture: ComponentFixture<SectionsTabComponent>;

  beforeAll(() => {
    // Mock global matchMedia for PrimeNG 19
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });
  });

  afterEach(() => {
    const overlays = document.body.querySelectorAll(
      '.p-select-overlay, .p-dropdown-panel, .p-overlay'
    );
    overlays.forEach((o) => o.remove());
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
    gmr: '1.23',
    eel: '4.56',
    cm: '7.89',
    link_name: 'LinkX',
    lit: 'LIT123',
    branch_name: 'BranchY',
    electric_tension_level: '230V',
    comment: 'Test section comment',
    supports: [],
    initial_conditions: [
      {
        uuid: 'ic-1',
        name: 'Initial Cond 1',
        base_parameters: 'Params',
        base_temperature: 20
      } as InitialCondition
    ],
    selected_initial_condition_uuid: 'ic-1'
  };

  const mockInitialCondition: InitialCondition = {
    uuid: 'init-1',
    name: 'Init Cond',
    base_parameters: 'params',
    base_temperature: 20
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SectionsTabComponent,
        NoopAnimationsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: MaintenanceService, useClass: MockMaintenanceService },
        { provide: LinesService, useClass: MockLinesService },
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SectionsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    jest.spyOn(component.deleteSection, 'emit');
    jest.spyOn(component.duplicateSection, 'emit');
    jest.spyOn(component.duplicateInitialCondition, 'emit');
    jest.spyOn(component.deleteInitialCondition, 'emit');
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display "No existing section" when sections is empty', () => {
    fixture.componentRef.setInput('study', { sections: [] });
    fixture.detectChanges();

    const noSectionMsg = fixture.debugElement.query(By.css('.no-section-text'));
    expect(noSectionMsg.nativeElement.textContent).toContain(
      'No existing section'
    );
  });

  it('should render a section when sections input has data', () => {
    const sectionWithName = { ...mockSection, name: 'My Section' };
    fixture.componentRef.setInput('study', { sections: [sectionWithName] });
    fixture.detectChanges();

    const sectionName = fixture.debugElement.query(
      By.css('.section__text-name')
    );
    expect(sectionName?.nativeElement?.textContent).toContain('My Section');
  });

  it('should open new section modal in create mode when clicking "Add a section"', () => {
    const btn = fixture.debugElement.query(By.css('button'));
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
    component.openInitialConditionModal(
      mockSection,
      mockInitialCondition,
      'edit'
    );

    expect(component.currentSection()).toEqual(mockSection);
    expect(component.currentInitialCondition()).toEqual(mockInitialCondition);
    expect(component.initialConditionModalMode()).toBe('edit');
    expect(component.isInitialConditionModalOpen()).toBe(true);
  });

  it('should emit deleteSection when delete button clicked in popover', () => {
    fixture.componentRef.setInput('study', { sections: [mockSection] });
    fixture.detectChanges();

    const triggerBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.section__content-action'
    );
    expect(triggerBtn).toBeTruthy();
    triggerBtn.click();
    fixture.detectChanges();

    const deleteBtn: HTMLButtonElement =
      fixture.nativeElement.querySelector('.erase-btn');
    expect(deleteBtn).toBeTruthy();
    deleteBtn.click();
    fixture.detectChanges();

    expect(component.deleteSection.emit).toHaveBeenCalledWith(mockSection);
  });

  it('should emit duplicateSection when duplicate button clicked in popover', () => {
    fixture.componentRef.setInput('study', { sections: [mockSection] });
    fixture.detectChanges();

    const triggerBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.section__content-action'
    );
    expect(triggerBtn).toBeTruthy();
    triggerBtn.click();
    fixture.detectChanges();

    const allBtns = fixture.nativeElement.querySelectorAll('p-popover button');
    const duplicateButton = Array.from(allBtns).find((btn) =>
      (btn as HTMLElement).textContent?.includes('Duplicate')
    ) as HTMLButtonElement;
    expect(duplicateButton).toBeTruthy();

    duplicateButton.click();
    fixture.detectChanges();

    expect(component.duplicateSection.emit).toHaveBeenCalledWith(mockSection);
  });
});
