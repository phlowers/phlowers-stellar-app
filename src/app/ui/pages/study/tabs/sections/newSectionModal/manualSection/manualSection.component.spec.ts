// Mock plotly.js-dist-min
jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn(),
  update: jest.fn(),
  purge: jest.fn(),
  relayout: jest.fn(),
  restyle: jest.fn(),
  react: jest.fn(),
  redraw: jest.fn(),
  toImage: jest.fn(),
  downloadImage: jest.fn(),
  extendTraces: jest.fn(),
  prependTraces: jest.fn(),
  addTraces: jest.fn(),
  deleteTraces: jest.fn(),
  moveTraces: jest.fn(),
  animate: jest.fn(),
  setPlotConfig: jest.fn(),
  validate: jest.fn(),
  d3: {
    select: jest.fn(),
    selectAll: jest.fn()
  }
}));

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManualSectionComponent } from './manualSection.component';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { Support } from '@src/app/core/data/database/interfaces/support';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MaintenanceService } from '@src/app/core/services/maintenance/maintenance.service';
import { LinesService } from '@src/app/core/services/lines/lines.service';
import { MaintenanceData } from '@src/app/core/data/database/interfaces/maintenance';
import { Line } from '@src/app/core/data/database/interfaces/line';

// Mock child component
@Component({
  selector: 'app-supports-table',
  template: ''
})
class MockSupportsTableComponent {
  @Input() supports: Support[] = [];
  @Output() addSupport = new EventEmitter<{
    index: number;
    position: 'before' | 'after';
  }>();
  @Output() deleteSupport = new EventEmitter<string>();
  @Output() supportChange = new EventEmitter<{
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
  refreshStudio = jest.fn();
}

// Mock services
const mockMaintenanceService = {
  getMaintenance: jest.fn().mockResolvedValue([] as MaintenanceData[])
};

const mockLinesService = {
  getLines: jest.fn().mockResolvedValue([] as Line[])
};

// Mock data
const mockMaintenanceData: MaintenanceData[] = [
  {
    cm_id: 'cm1',
    cm_name: 'CM 1',
    gmr_id: 'gmr1',
    gmr_name: 'GMR 1',
    eel_id: 'eel1',
    eel_name: 'EEL 1'
  },
  {
    cm_id: 'cm2',
    cm_name: 'CM 2',
    gmr_id: 'gmr1',
    gmr_name: 'GMR 1',
    eel_id: 'eel2',
    eel_name: 'EEL 2'
  }
];

const mockLinesData: Line[] = [
  {
    uuid: 'line1',
    link_idr: 'link1',
    lit_idr: 'lit1',
    lit_adr: 'LIT 1',
    branch_idr: 'branch1',
    branch_adr: 'BRANCH 1',
    electric_tension_level_idr: 'tension1',
    electric_tension_level_adr: '400'
  },
  {
    uuid: 'line2',
    link_idr: 'link2',
    lit_idr: 'lit2',
    lit_adr: 'LIT 2',
    branch_idr: 'branch1',
    branch_adr: 'BRANCH 1',
    electric_tension_level_idr: 'tension2',
    electric_tension_level_adr: '225'
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
      gmr: '',
      eel: '',
      cm: '',
      link_name: '',
      lit: '',
      branch_name: '',
      electric_tension_level: '',
      comment: '',
      supports_comment: '',
      supports: [],
      initial_conditions: [],
      selected_initial_condition_uuid: undefined
    };

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ManualSectionComponent,
        MockSupportsTableComponent,
        MockStudioComponent,
        NoopAnimationsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: MaintenanceService, useValue: mockMaintenanceService },
        { provide: LinesService, useValue: mockLinesService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ManualSectionComponent);
    component = fixture.componentInstance;
    // Patch the input() API for test
    (component.section as unknown as () => Section) = () => mockSection;
    (component.mode as unknown as () => 'create' | 'edit' | 'view') = () =>
      'create';
    component.sectionChange = {
      emit: jest.fn()
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
      mockSection.supports = [
        createSupportMock(),
        createSupportMock(),
        createSupportMock()
      ];
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
    it('should delete a support by uuid', () => {
      const s1 = createSupportMock();
      const s2 = createSupportMock();
      mockSection.supports = [s1, s2];
      component.deleteSupport(s1.uuid);
      expect(mockSection.supports.length).toBe(1);
      expect(mockSection.supports[0].uuid).toBe(s2.uuid);
    });
  });

  describe('onSupportChange', () => {
    it('should update the correct field of a support', () => {
      const s1 = createSupportMock();
      mockSection.supports = [s1];
      component.onSupportChange({
        uuid: s1.uuid,
        field: 'name',
        value: { name: 'newName' } as Support
      });
      expect(mockSection.supports[0].name).toMatchObject({ name: 'newName' });
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
      const setupFilterTablesSpy = jest.spyOn(component, 'setupFilterTables');
      component.ngOnInit();
      expect(setupFilterTablesSpy).toHaveBeenCalled();
    });
  });

  describe('setupFilterTables', () => {
    beforeEach(() => {
      mockMaintenanceService.getMaintenance.mockResolvedValue(
        mockMaintenanceData
      );
      mockLinesService.getLines.mockResolvedValue(mockLinesData);
    });

    it('should load and sort maintenance data', async () => {
      await component.setupFilterTables();
      expect(mockMaintenanceService.getMaintenance).toHaveBeenCalled();
      expect(component.maintenanceFilterTable()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ eel_name: 'EEL 1' }),
          expect.objectContaining({ eel_name: 'EEL 2' })
        ])
      );
    });

    it('should load and sort lines data', async () => {
      await component.setupFilterTables();
      expect(mockLinesService.getLines).toHaveBeenCalled();
      expect(component.linesFilterTable()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ electric_tension_level_adr: '225' }),
          expect.objectContaining({ electric_tension_level_adr: '400' })
        ])
      );
    });
  });

  describe('tabValueChange', () => {
    it('should refresh studio when switching to graphical tab', () => {
      const mockStudio = { refreshStudio: jest.fn() };
      (component.studio as unknown as () => {
        refreshStudio: jest.Mock;
      } | null) = () => mockStudio;

      component.tabValueChange('graphical');
      expect(mockStudio.refreshStudio).toHaveBeenCalled();
    });

    it('should not refresh studio when switching to other tabs', () => {
      const mockStudio = { refreshStudio: jest.fn() };
      (component.studio as unknown as () => {
        refreshStudio: jest.Mock;
      } | null) = () => mockStudio;

      component.tabValueChange('general');
      expect(mockStudio.refreshStudio).not.toHaveBeenCalled();
    });

    it('should handle case when studio is not available', () => {
      (component.studio as unknown as () => {
        refreshStudio: jest.Mock;
      } | null) = () => null;

      expect(() => component.tabValueChange('graphical')).not.toThrow();
    });
  });

  describe('onSupportsAmountChangeBlur', () => {
    it('should update supports amount on blur', () => {
      mockSection.supports = [createSupportMock()];
      const event = { target: { value: 3 } };

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
      mockSection.supports = [
        createSupportMock(),
        createSupportMock(),
        createSupportMock()
      ];

      component.updateSupportsAmount(1);
      expect(mockSection.supports.length).toBe(1);
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
      mockMaintenanceService.getMaintenance.mockResolvedValue(
        mockMaintenanceData
      );
      const event = { value: null };

      await component.onMaintenanceSelect(event, 'cm');

      expect(mockSection.eel).toBeUndefined();
      expect(mockSection.cm).toBeUndefined();
      expect(mockSection.gmr).toBeUndefined();
      expect(component.maintenanceFilterTable()).toEqual(
        expect.arrayContaining(mockMaintenanceData)
      );
    });

    it('should filter by cm_id and auto-populate related fields', async () => {
      const event = { value: 'cm1' };

      await component.onMaintenanceSelect(event, 'cm');

      expect(component.maintenanceFilterTable()).toHaveLength(1);
      expect(component.maintenanceFilterTable()[0].cm_id).toBe('cm1');
      expect(mockSection.cm).toBe('cm1');
      expect(mockSection.gmr).toBe('gmr1');
      expect(mockSection.eel).toBe('eel1');
    });

    it('should filter by gmr_id and auto-populate related fields', async () => {
      const event = { value: 'gmr1' };

      await component.onMaintenanceSelect(event, 'gmr');

      expect(component.maintenanceFilterTable()).toHaveLength(2);
      expect(mockSection.gmr).toBe('gmr1');
    });

    it('should filter by eel_id and auto-populate related fields', async () => {
      const event = { value: 'eel1' };

      await component.onMaintenanceSelect(event, 'eel');

      expect(component.maintenanceFilterTable()).toHaveLength(1);
      expect(mockSection.eel).toBe('eel1');
      expect(mockSection.cm).toBe('cm1');
      expect(mockSection.gmr).toBe('gmr1');
    });
  });

  describe('onLinesSelect', () => {
    beforeEach(() => {
      component.linesFilterTable.set(mockLinesData);
    });

    it('should reset filters when no value selected', async () => {
      mockLinesService.getLines.mockResolvedValue(mockLinesData);
      const event = { value: null };

      await component.onLinesSelect(event, 'link_idr');

      expect(mockSection.lit).toBeUndefined();
      expect(mockSection.branch_name).toBeUndefined();
      expect(mockSection.link_name).toBeUndefined();
      expect(mockSection.electric_tension_level).toBeUndefined();
      expect(component.linesFilterTable()).toEqual(
        expect.arrayContaining(mockLinesData)
      );
    });

    it('should filter by link_idr and auto-populate related fields', async () => {
      const event = { value: 'link1' };

      await component.onLinesSelect(event, 'link_idr');

      expect(component.linesFilterTable()).toHaveLength(1);
      expect(mockSection.link_name).toBe('link1');
      expect(mockSection.lit).toBe('LIT 1');
      expect(mockSection.branch_name).toBe('BRANCH 1');
      expect(mockSection.electric_tension_level).toBe('400');
    });

    it('should filter by lit_adr and auto-populate related fields', async () => {
      const event = { value: 'LIT 1' };

      await component.onLinesSelect(event, 'lit_adr');

      expect(component.linesFilterTable()).toHaveLength(1);
      expect(mockSection.lit).toBe('LIT 1');
    });

    it('should filter by branch_adr and auto-populate related fields', async () => {
      const event = { value: 'BRANCH 1' };

      await component.onLinesSelect(event, 'branch_adr');

      expect(component.linesFilterTable()).toHaveLength(2);
      expect(mockSection.branch_name).toBe('BRANCH 1');
    });

    it('should filter by electric_tension_level_adr and auto-populate related fields', async () => {
      const event = { value: '400' };

      await component.onLinesSelect(event, 'electric_tension_level_adr');

      expect(component.linesFilterTable()).toHaveLength(1);
      expect(mockSection.electric_tension_level).toBe('400');
    });

    it('should handle empty electric_tension_level_adr', async () => {
      const linesWithEmptyTension = [
        {
          ...mockLinesData[0],
          electric_tension_level_adr: ''
        }
      ];
      component.linesFilterTable.set(linesWithEmptyTension);
      const event = { value: '' };

      await component.onLinesSelect(event, 'electric_tension_level_adr');

      expect(mockSection.electric_tension_level).toBeUndefined();
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
    attachmentPosition: null
  };
}
