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
  refreshSection = jest.fn();
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

const mockLinesData: Line[] = [
  {
    uuid: 'line1',
    link_idr: 'link1',
    lit_idr: 'lit1',
    lit_adr: 'LIT 1',
    branch_idr: 'branch1',
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
    branch_idr: 'branch1',
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
      lit: '',
      branch_name: '',
      voltage_idr: '',
      comment: '',
      supports_comment: '',
      supports: [],
      initial_conditions: [],
      selected_initial_condition_uuid: undefined,
      charges: [],
      selected_charge_uuid: null
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
      mockSection.supports = [
        createSupportMock(),
        createSupportMock(),
        createSupportMock()
      ];

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
      mockMaintenanceService.getMaintenance.mockResolvedValue(
        mockMaintenanceData
      );
      const event = { value: '' };

      await component.onMaintenanceSelect(event, 'maintenance_center_id');

      expect(mockSection.maintenance_team_id).toBeUndefined();
      expect(mockSection.maintenance_center_id).toBeUndefined();
      expect(mockSection.regional_team_id).toBeUndefined();
      expect(component.maintenanceFilterTable()).toEqual(
        expect.arrayContaining(mockMaintenanceData)
      );
      expect(component.maintenanceFilterTable()).toHaveLength(2);
      expect(component.maintenanceFilterTable()[0].maintenance_center_id).toBe(
        'cm1'
      );
    });

    it('should filter by eel_id and auto-populate related fields', async () => {
      const event = { value: 'maintenance_team1' };

      await component.onMaintenanceSelect(event, 'maintenance_team_id');

      expect(component.maintenanceFilterTable()).toHaveLength(1);
      expect(mockSection.maintenance_team_id).toBe('maintenance_team1');
      expect(mockSection.maintenance_center_id).toBe('cm1');
      expect(mockSection.regional_team_id).toBe('gmr1');
    });
  });

  describe('onLinesSelect', () => {
    beforeEach(() => {
      component.linesFilterTable.set(mockLinesData);
    });

    it('should filter by link_idr and auto-populate related fields', async () => {
      const event = { value: 'link1' };

      await component.onLinesSelect(event, 'link_idr');

      expect(component.linesFilterTable()).toHaveLength(1);
      expect(mockSection.link_name).toBe('link1');
      expect(mockSection.lit).toBe('lit1');
      expect(mockSection.branch_name).toBe('branch1');
      expect(mockSection.voltage_idr).toBe('tension1');
    });

    it('should filter by lit_idr and auto-populate related fields', async () => {
      const event = { value: 'lit1' };

      await component.onLinesSelect(event, 'lit_idr');

      expect(component.linesFilterTable()).toHaveLength(1);
      expect(mockSection.lit).toBe('lit1');
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
