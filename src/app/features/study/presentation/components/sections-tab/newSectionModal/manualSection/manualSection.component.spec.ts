// Mock plotly.js-dist-min
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManualSectionComponent } from './manualSection.component';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Section, Support, CatalogMaintenance, CatalogLine } from '@shared/domain';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LinesService } from '@shared/catalog/services/lines.service';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { DEFAULT_TABLE_ROWS_PER_PAGE } from '@shared/constants/tablePagination';

// Mock child component
@Component({
  selector: 'app-supports-table',
  template: ''
})
class MockSupportsTableComponent {
  supports = input<Support[]>([]);
  addSupport = output<{
    index: number;
    position: 'before' | 'after';
  }>();
  deleteSupport = output<string>();
  supportChange = output<{
    uuid: string;
    field: keyof Support;
    value: Support;
  }>();
}

// Mock StudioComponent
@Component({
  selector: 'app-studio',
  template: ''
})
class MockStudioComponent {
  refreshSection = vi.fn();
}

// Mock services
const mockMaintenanceService = {
  getMaintenance: vi.fn().mockResolvedValue([] as CatalogMaintenance[])
};

const mockLinesService = {
  imported$: new Subject<void>(),
  getLines: vi.fn().mockResolvedValue([] as CatalogLine[])
};

const mockMessageService = {
  add: vi.fn()
} as unknown as MessageService;

// Mock data
const mockMaintenanceData: CatalogMaintenance[] = [
  {
    maintenance_center_id: 'cm1',
    maintenance_center: 'CM 1',
    regional_team_id: 'gmr1',
    regional_team: 'GMR 1',
    maintenance_team_id: 'maintenance_team1',
    maintenance_team: 'MAINTENANCE TEAM 1'
  },
  {
    maintenance_center_id: 'cm2',
    maintenance_center: 'CM 2',
    regional_team_id: 'gmr1',
    regional_team: 'GMR 1',
    maintenance_team_id: 'maintenance_team2',
    maintenance_team: 'MAINTENANCE TEAM 2'
  }
];

const mockLinesData: CatalogLine[] = [
  {
    uuid: 'line1',
    link_idr: 'link1',
    lit_idr: 'lit1',
    lit_adr: 'LIT 1',
    branch_idr: '1.0',
    branch_id: 'BRANCH001',
    branch_adr: 'BRANCH 1',
    voltage_idr: 'tension1',
    voltage_adr: '400',
    link_adr: 'LINK 1'
  },
  {
    uuid: 'line2',
    link_idr: 'link2',
    lit_idr: 'lit2',
    lit_adr: 'LIT 2',
    branch_idr: '1.0',
    branch_id: 'BRANCH001',
    branch_adr: 'BRANCH 1',
    voltage_idr: 'tension2',
    voltage_adr: '225',
    link_adr: 'LINK 2'
  }
];

describe('ManualSectionComponent', () => {
  let component: ManualSectionComponent;
  let fixture: ComponentFixture<ManualSectionComponent>;
  let mockSection: Section;

  beforeEach(async () => {
    mockSection = {
      uuid: '1',
      internal_id: 'int1',
      name: 'Section 1',
      short_name: 'S1',
      created_at: '',
      updated_at: '',
      internal_catalog_id: '',
      type: 'guard',
      electric_phase_number: 0,
      cable_name: '',
      cable_short_name: '',
      cables_amount: 1,
      optical_fibers_amount: 0,
      spans_amount: 0,
      begin_span_name: '',
      last_span_name: '',
      first_support_number: 1,
      last_support_number: 2,
      first_attachment_set: '',
      last_attachment_set: '',
      regional_maintenance_center_names: [],
      maintenance_center_names: [],
      regional_team_id: undefined,
      maintenance_team_id: undefined,
      maintenance_center_id: undefined,
      link_name: '',
      lit_code: '',
      lit_name: '',
      branch_name: '',
      branch_idr: '',
      voltage_idr: '',
      comment: '',
      supports_comment: '',
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

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ManualSectionComponent,
        MockSupportsTableComponent,
        MockStudioComponent,
        NoopAnimationsModule,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'manual-section.current-page-report': 'Current page report template',
              'manual-section.no-voltage': 'No Voltage',
              'common.section-type.guard': 'Guard',
              'common.section-type.phase': 'Phase'
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
        { provide: MaintenanceService, useValue: mockMaintenanceService },
        { provide: LinesService, useValue: mockLinesService },
        { provide: MessageService, useValue: mockMessageService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ManualSectionComponent);
    component = fixture.componentInstance;
    // Patch the input() API for test
    (component.section as unknown as () => Section) = () => mockSection;
    (component.mode as unknown as () => 'create' | 'edit' | 'view') = () => 'create';
    component.sectionChange = {
      emit: vi.fn()
    } as unknown as typeof component.sectionChange;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSupportsAmountChange', () => {
    it('should do nothing if amount equals current supports length', () => {
      mockSection.supports = [createSupportMock()];
      const event = { originalEvent: { type: 'mousedown' }, value: 1 };
      component.onSupportsAmountChangeInput(event);
      expect(mockSection.supports.length).toBe(1);
    });

    it('should add supports if amount increases', () => {
      mockSection.supports = [];
      const event = { originalEvent: { type: 'mousedown' }, value: 2 };
      component.onSupportsAmountChangeInput(event);
      expect(mockSection.supports.length).toBe(2);
    });

    it('should remove supports if amount decreases', () => {
      mockSection.supports = [createSupportMock(), createSupportMock(), createSupportMock()];
      const event = { originalEvent: { type: 'mousedown' }, value: 2 };
      component.onSupportsAmountChangeInput(event);
      expect(mockSection.supports.length).toBe(2);
    });

    it('should not update supports if event type is not mousedown', () => {
      mockSection.supports = [createSupportMock()];
      const event = { originalEvent: { type: 'keydown' }, value: 2 };
      component.onSupportsAmountChangeInput(event);
      expect(mockSection.supports.length).toBe(1);
    });
  });

  describe('addSupport', () => {
    it('should add a support before the given index', () => {
      mockSection.supports = [createSupportMock(), createSupportMock()];
      component.addSupport(1, 'before');
      expect(mockSection.supports.length).toBe(3);
    });
    it('should add a support after the given index', () => {
      mockSection.supports = [createSupportMock(), createSupportMock()];
      component.addSupport(0, 'after');
      expect(mockSection.supports.length).toBe(3);
    });
  });

  describe('deleteSupport', () => {
    it('should not delete a support by uuid if there is less or equal 2 supports', () => {
      const s1 = createSupportMock();
      const s2 = createSupportMock();
      mockSection.supports = [s1, s2];
      component.deleteSupport(s1.uuid);
      expect(mockSection.supports.length).toBe(2);
    });
    it('should delete a support by uuid if there is more than 2 supports', () => {
      const s1 = createSupportMock();
      const s2 = createSupportMock();
      const s3 = createSupportMock();
      mockSection.supports = [s1, s2, s3];
      component.deleteSupport(s1.uuid);
      expect(mockSection.supports.length).toBe(2);
      expect(mockSection.supports[0].uuid).toBe(s2.uuid);
    });
  });

  describe('onSupportChange', () => {
    it('should update the correct field of a support', () => {
      const s1 = createSupportMock();
      mockSection.supports = [s1];
      component.onSupportChange({
        uuid: s1.uuid,
        support: { name: 'newName' }
      });
      expect(mockSection.supports[0].name).toBe('newName');
    });
  });

  describe('onSectionChange', () => {
    it('should emit sectionChange with the section', () => {
      component.onSectionChange();
      expect(component.sectionChange.emit).toHaveBeenCalledWith(mockSection);
    });
  });

  describe('ngOnInit', () => {
    it('should call setupFilterTables on init', async () => {
      const setupFilterTablesSpy = vi.spyOn(component, 'setupFilterTables');
      component.ngOnInit();
      expect(setupFilterTablesSpy).toHaveBeenCalled();
    });

    it('re-runs the lines filter when the lines catalog import completes', () => {
      const setupLinesFilterSpy = vi
        .spyOn(component as unknown as { setupLinesFilter: () => Promise<void> }, 'setupLinesFilter')
        .mockResolvedValue();
      component.ngOnInit();

      mockLinesService.imported$.next();

      expect(setupLinesFilterSpy).toHaveBeenCalled();
    });
  });

  describe('setupFilterTables', () => {
    beforeEach(() => {
      mockMaintenanceService.getMaintenance.mockResolvedValue(mockMaintenanceData);
      mockLinesService.getLines.mockResolvedValue(mockLinesData);
    });

    it('should load and sort maintenance data', async () => {
      await component.setupFilterTables();
      expect(mockMaintenanceService.getMaintenance).toHaveBeenCalled();
      expect(component.maintenanceFilterTable()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ maintenance_center_id: 'cm1' }),
          expect.objectContaining({ maintenance_center_id: 'cm2' })
        ])
      );
    });

    it('should load and sort lines data', async () => {
      await component.setupFilterTables();
      expect(mockLinesService.getLines).toHaveBeenCalled();
      expect(component.linesFilterTable()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ voltage_adr: '225' }),
          expect.objectContaining({ voltage_adr: '400' })
        ])
      );
    });

    it('should fallback-filter without voltage_idr and auto-correct it when voltage mismatch leaves empty result', async () => {
      mockSection.link_name = 'link1';
      mockSection.voltage_idr = 'MISMATCH_VOLTAGE';

      await component.setupFilterTables();

      expect(component.linesFilterTable()).toHaveLength(1);
      expect(component.linesFilterTable()[0].link_idr).toBe('link1');
      expect(mockSection.voltage_idr).toBe('tension1');
    });

    it('should not apply fallback when neither link_name nor lit_code is set', async () => {
      mockSection.link_name = undefined;
      mockSection.lit_code = undefined;
      mockSection.voltage_idr = 'MISMATCH_VOLTAGE';

      await component.setupFilterTables();

      expect(component.linesFilterTable()).toHaveLength(0);
      expect(mockSection.voltage_idr).toBe('MISMATCH_VOLTAGE');
    });
  });

  describe('onSupportsAmountChangeBlur', () => {
    it('should update supports amount on blur', () => {
      mockSection.supports = [createSupportMock()];
      const event = new Event('blur') as unknown as Event & {
        target: { value: number };
      };
      Object.defineProperty(event, 'target', { value: { value: 3 } });

      component.onSupportsAmountChangeBlur(event);
      expect(mockSection.supports.length).toBe(3);
    });
  });

  describe('updateSupportsAmount', () => {
    it('should not modify supports if amount equals current length', () => {
      const supports = [createSupportMock(), createSupportMock()];
      mockSection.supports = supports;

      component.updateSupportsAmount(2);
      expect(mockSection.supports).toBe(supports);
    });

    it('should add empty supports when increasing amount', () => {
      mockSection.supports = [createSupportMock()];

      component.updateSupportsAmount(3);
      expect(mockSection.supports.length).toBe(3);
      expect(mockSection.supports[1]).toEqual(
        expect.objectContaining({
          number: null,
          name: null
        })
      );
    });

    it('should remove supports when decreasing amount', () => {
      mockSection.supports = [createSupportMock(), createSupportMock(), createSupportMock()];

      component.updateSupportsAmount(1);
      expect(mockSection.supports.length).toBe(2);
    });

    it('should handle empty supports array', () => {
      mockSection.supports = [];

      component.updateSupportsAmount(2);
      expect(mockSection.supports.length).toBe(2);
    });
  });

  describe('onMaintenanceSelect', () => {
    beforeEach(() => {
      component.maintenanceFilterTable.set(mockMaintenanceData);
    });

    it('should reset filters when no value selected', async () => {
      mockMaintenanceService.getMaintenance.mockResolvedValue(mockMaintenanceData);
      const event = { value: '' };

      await component.onMaintenanceSelect(event, 'maintenance_center_id');

      expect(mockSection.maintenance_team_id).toBeUndefined();
      expect(mockSection.maintenance_center_id).toBeUndefined();
      expect(mockSection.regional_team_id).toBeUndefined();
      expect(component.maintenanceFilterTable()).toEqual(expect.arrayContaining(mockMaintenanceData));
      expect(component.maintenanceFilterTable()).toHaveLength(2);
      expect(component.maintenanceFilterTable()[0].maintenance_center_id).toBe('cm1');
    });

    it('should filter by eel_id and auto-populate related fields', async () => {
      const event = { value: 'maintenance_team1' };

      await component.onMaintenanceSelect(event, 'maintenance_team_id');

      expect(component.maintenanceFilterTable()).toHaveLength(1);
      expect(mockSection.maintenance_team_id).toBe('maintenance_team1');
      expect(mockSection.maintenance_center_id).toBe('cm1');
      expect(mockSection.regional_team_id).toBe('gmr1');
    });

    it('also constrains other columns by the section values already selected', async () => {
      mockMaintenanceService.getMaintenance.mockResolvedValue(mockMaintenanceData);
      // A different column is already set on the section, so the non-selected
      // columns are filtered by that existing value (the else branch).
      mockSection.regional_team_id = 'gmr1';

      await component.onMaintenanceSelect({ value: 'cm1' }, 'maintenance_center_id');

      expect(component.maintenanceFilterTable()).toHaveLength(1);
      expect(component.maintenanceFilterTable()[0].maintenance_center_id).toBe('cm1');
    });
  });

  describe('onLinesSelect', () => {
    beforeEach(() => {
      component.linesFilterTable.set(mockLinesData);
      mockLinesService.getLines.mockResolvedValue(mockLinesData);
    });

    it('should filter by link_idr and auto-populate related fields', async () => {
      const event = { value: 'link1' };

      await component.onLinesSelect(event, 'link_idr');

      expect(component.linesFilterTable()).toHaveLength(1);
      expect(mockSection.link_name).toBe('link1');
      expect(mockSection.lit_code).toBe('lit1');
      expect(mockSection.branch_name).toBe('BRANCH 1');
      expect(mockSection.branch_idr).toBe('1.0');
      expect(mockSection.voltage_idr).toBe('tension1');
    });

    it('should filter by lit_idr and auto-populate related fields', async () => {
      const event = { value: 'lit1' };

      await component.onLinesSelect(event, 'lit_idr');

      expect(component.linesFilterTable()).toHaveLength(1);
      expect(mockSection.lit_code).toBe('lit1');
    });

    it('should filter by voltage_idr and auto-populate related fields', async () => {
      const event = { value: 'tension1' };

      await component.onLinesSelect(event, 'voltage_idr');

      expect(component.linesFilterTable()).toHaveLength(1);
      expect(mockSection.voltage_idr).toBe('tension1');
    });

    it('should handle empty electric_tension_level_adr', async () => {
      const linesWithEmptyTension = [
        {
          ...mockLinesData[0],
          voltage_adr: ''
        }
      ];
      component.linesFilterTable.set(linesWithEmptyTension);
      const event = { value: '' };

      await component.onLinesSelect(event, 'voltage_idr');

      expect(mockSection.voltage_idr).toBeUndefined();
    });

    it('auto-corrects the voltage via fallback when selecting a value leaves an empty filtered result', async () => {
      // link_name is already set, but the chosen voltage matches no line, so the
      // cascade empties and the fallback recovers line1 by link_name + patches voltage.
      mockSection.link_name = 'link1';
      mockSection.voltage_idr = 'MISMATCH_VOLTAGE';

      await component.onLinesSelect({ value: 'MISMATCH_VOLTAGE' }, 'voltage_idr');

      expect(component.linesFilterTable()).toHaveLength(1);
      expect(component.linesFilterTable()[0].link_idr).toBe('link1');
      expect(mockSection.voltage_idr).toBe('tension1');
    });
  });

  describe('setupFilterTables in view mode', () => {
    beforeEach(() => {
      (component.mode as unknown as () => 'create' | 'edit' | 'view') = () => 'view';
      mockMaintenanceService.getMaintenance.mockResolvedValue(mockMaintenanceData);
      mockLinesService.getLines.mockResolvedValue(mockLinesData);
    });

    it('populates the maintenance read-only labels from the section ids', async () => {
      mockSection.maintenance_team_id = 'maintenance_team1';
      mockSection.maintenance_center_id = 'cm1';
      mockSection.regional_team_id = 'gmr1';

      await component.setupFilterTables();

      expect(component.maintenanceTeamRead()).toBe('MAINTENANCE TEAM 1');
      expect(component.maintenanceCenterRead()).toBe('CM 1');
      expect(component.regionalTeamRead()).toBe('GMR 1');
    });

    it('leaves the maintenance read-only labels empty when the section ids do not match', async () => {
      mockSection.maintenance_team_id = 'unknown';
      mockSection.maintenance_center_id = 'unknown';
      mockSection.regional_team_id = 'unknown';

      await component.setupFilterTables();

      expect(component.maintenanceTeamRead()).toBe('');
      expect(component.maintenanceCenterRead()).toBe('');
      expect(component.regionalTeamRead()).toBe('');
    });

    it('populates the link/lit read-only labels from the matching lines', async () => {
      mockSection.link_name = 'link1';
      mockSection.lit_code = 'lit1';
      mockSection.voltage_idr = 'tension1';

      await component.setupFilterTables();

      expect(component.linkAdrRead()).toBe('LINK 1');
      expect(component.litAdrRead()).toBe('LIT 1');
    });
  });

  describe('tab navigation', () => {
    it('onNextTab switches to the supports tab', () => {
      component.onNextTab();
      expect(component.tabValue()).toBe('supports');
    });

    it('onPreviousTab switches back to the general tab', () => {
      component.onPreviousTab();
      expect(component.tabValue()).toBe('general');
    });

    it('tabValueChange updates the tab value for a non-graphical tab', () => {
      component.tabValueChange('supports');
      expect(component.tabValue()).toBe('supports');
    });

    it('tabValueChange wires the span service and plot options when entering the graphical tab', () => {
      mockSection.supports = [createSupportMock(), createSupportMock()];
      const spanService = TestBed.inject(PlotSpanService);
      const sectionSetSpy = vi.spyOn(spanService.section, 'set');
      const plotOptionsChangeSpy = vi
        .spyOn(component.plotService, 'plotOptionsChange')
        .mockImplementation(() => undefined);

      component.tabValueChange('graphical');

      expect(component.tabValue()).toBe('graphical');
      expect(sectionSetSpy).toHaveBeenCalledWith(mockSection);
      expect(plotOptionsChangeSpy).toHaveBeenCalledWith({ startSupport: 0, endSupport: 2 });
    });
  });

  describe('duplicateSupport', () => {
    it('inserts a copy with a new uuid right after the original', () => {
      const s1 = createSupportMock();
      s1.name = 'Original';
      const s2 = createSupportMock();
      mockSection.supports = [s1, s2];

      component.duplicateSupport(s1.uuid);

      expect(mockSection.supports.length).toBe(3);
      expect(mockSection.supports[1].name).toBe('Original');
      expect(mockSection.supports[1].uuid).not.toBe(s1.uuid);
      expect(component.sectionChange.emit).toHaveBeenCalled();
    });

    it('does not insert anything when the uuid is unknown', () => {
      const s1 = createSupportMock();
      mockSection.supports = [s1];

      component.duplicateSupport('unknown');

      expect(mockSection.supports.length).toBe(1);
    });
  });

  describe('onSectionTypeChange', () => {
    it('forces the electric phase number to 0 and emits when type is guard', () => {
      mockSection.electric_phase_number = 3;

      component.onSectionTypeChange({ value: 'guard' });

      expect(mockSection.electric_phase_number).toBe(0);
      expect(component.sectionChange.emit).toHaveBeenCalled();
    });

    it('does nothing for a non-guard type', () => {
      mockSection.electric_phase_number = 3;

      component.onSectionTypeChange({ value: 'conductor' });

      expect(mockSection.electric_phase_number).toBe(3);
    });
  });

  describe('onSupportsPageChange', () => {
    it('updates rows and first index from the page event', () => {
      component.onSupportsPageChange({ rows: 10, page: 2 });

      expect(component.rowsSupport()).toBe(10);
      expect(component.firstSupport()).toBe(20);
    });

    // Was 5, which is not in TABLE_ROWS_PER_PAGE_OPTIONS and would have left the paginator
    // showing a page size it cannot select. The fallback is now the real default.
    it('falls back to defaults when the event is empty', () => {
      component.onSupportsPageChange({});

      expect(component.rowsSupport()).toBe(DEFAULT_TABLE_ROWS_PER_PAGE);
      expect(component.firstSupport()).toBe(0);
    });

    it('applies a small page synchronously, without the loader', () => {
      component.onSupportsPageChange({ rows: 10, page: 3 });

      expect(component.supportsPageLoading()).toBe(false);
      expect(component.firstSupport()).toBe(30);
    });

    // A large page blocks the main thread while rows are built, so the mask has to be painted
    // before the render starts — the page must NOT be applied in the click handler itself.
    it('shows the loader and defers the render for a large page', async () => {
      component.onSupportsPageChange({ rows: 50, page: 2 });

      expect(component.supportsPageLoading()).toBe(true);
      expect(component.firstSupport()).toBe(0);

      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
      await new Promise((resolve) => setTimeout(resolve));

      expect(component.supportsPageLoading()).toBe(false);
      expect(component.rowsSupport()).toBe(50);
      expect(component.firstSupport()).toBe(100);
    });
  });

  describe('sliderOptions', () => {
    it('exposes a 1-based translate and a floor/step config', () => {
      const options = component.sliderOptions();

      expect(options.floor).toBe(0);
      expect(options.step).toBe(1);
      expect(options.showTicks).toBe(true);
      expect(options.translate?.(4, undefined as never)).toBe('5');
    });
  });

  describe('updateSliderOptions', () => {
    it('debounces a change to the plot service for a changed value', () => {
      vi.useFakeTimers();
      try {
        vi.spyOn(component.plotOptionsService, 'plotOptions').mockReturnValue({
          startSupport: 0,
          endSupport: 0
        } as ReturnType<typeof component.plotOptionsService.plotOptions>);
        const plotOptionsChangeSpy = vi
          .spyOn(component.plotService, 'plotOptionsChange')
          .mockImplementation(() => undefined);

        component.updateSliderOptions({ value: 2, highValue: 5 });
        vi.advanceTimersByTime(2000);

        // The shared lodash-debounced fn collapses to the last call within the window.
        expect(plotOptionsChangeSpy).toHaveBeenCalledTimes(1);
        expect(plotOptionsChangeSpy).toHaveBeenCalledWith({ endSupport: 5 });
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not schedule a change when the values are unchanged or undefined', () => {
      vi.spyOn(component.plotOptionsService, 'plotOptions').mockReturnValue({
        startSupport: 0,
        endSupport: 0
      } as ReturnType<typeof component.plotOptionsService.plotOptions>);
      const debounceSpy = vi.fn();
      component.debounceUpdateSliderOptions = debounceSpy as unknown as typeof component.debounceUpdateSliderOptions;

      component.updateSliderOptions({ value: 0, highValue: undefined });

      expect(debounceSpy).not.toHaveBeenCalled();
    });
  });

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    it('should render general-tab', () => {
      expect(getByTestId('general-tab')).toBeTruthy();
    });

    it('should render supports-tab', () => {
      expect(getByTestId('supports-tab')).toBeTruthy();
    });

    it('should render graphical-tab', () => {
      expect(getByTestId('graphical-tab')).toBeTruthy();
    });

    it('should render section-name-input', () => {
      const el = getByTestId('section-name-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render section-type-select', () => {
      expect(getByTestId('section-type-select')).toBeTruthy();
    });

    it('should render cable-name-select', () => {
      expect(getByTestId('cable-name-select')).toBeTruthy();
    });

    it('should render cable-amount-select', () => {
      expect(getByTestId('cable-amount-select')).toBeTruthy();
    });

    it('should render comment-textarea', () => {
      const el = getByTestId('comment-textarea');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('TEXTAREA');
    });

    it('should render next-tab-btn', () => {
      const el = getByTestId('next-tab-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });
  });

  describe('HTML rendering - view mode Link section', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    beforeEach(async () => {
      mockMaintenanceService.getMaintenance.mockResolvedValue(mockMaintenanceData);
      mockLinesService.getLines.mockResolvedValue(mockLinesData);
      (component.mode as unknown as () => 'create' | 'edit' | 'view') = () => 'view';
      mockSection.lit_code = 'lit1';
      mockSection.lit_name = 'LIT 1';
      mockSection.link_name = 'link1';
      mockSection.branch_idr = '1.0';
      mockSection.voltage_idr = 'tension1';
      component.linesFilterTable.set(mockLinesData);
      component.litAdrRead.set('LIT 1');
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should render LIT - ID with lit_code value', () => {
      const el = getByTestId('lit-code-view');
      expect(el).toBeTruthy();
      expect(el?.textContent?.trim()).toBe('lit1');
    });

    it('should render LIT - Name with litAdrRead value', () => {
      const el = getByTestId('lit-name-view');
      expect(el).toBeTruthy();
      expect(el?.textContent?.trim()).toBe('LIT 1');
    });

    it('should render Branch with branch_idr value', () => {
      const el = getByTestId('branch-idr-view');
      expect(el).toBeTruthy();
      expect(el?.textContent?.trim()).toBe('1.0');
    });
  });

  describe('HTML rendering - supports_comment in view mode', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    beforeEach(() => {
      (component.mode as unknown as () => 'create' | 'edit' | 'view') = () => 'view';
      component.tabValue.set('supports');
    });

    it('should show supports_comment paragraph when comment is non-empty', () => {
      mockSection.supports_comment = 'A test comment';
      fixture.detectChanges();
      const el = getByTestId('supports-comment-text');
      expect(el).toBeTruthy();
      expect(el?.textContent?.trim()).toBe('A test comment');
    });

    it('should not show supports_comment paragraph when comment is empty', () => {
      mockSection.supports_comment = '';
      fixture.detectChanges();
      expect(getByTestId('supports-comment-text')).toBeNull();
    });
  });
});

function createSupportMock(): Support {
  return {
    uuid: Math.random().toString(36).substring(2),
    number: null,
    name: null,
    spanLength: null,
    spanAngle: null,
    attachmentHeight: null,
    cableType: null,
    attachmentSet: null,
    heightBelowConsole: null,
    armLength: null,
    chainName: null,
    chainLength: null,
    chainWeight: null,
    chainV: null,
    counterWeight: null,
    supportFootAltitude: null,
    chainSurface: null,
    attachmentPosition: null,
    towerModel: null,
    spanAzimut: null,
    footLongitude: null,
    footLatitude: null
  };
}
