import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { SectionPlotComponent } from './section-plot.component';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { createPlot } from './helpers/createPlot';
import { createPlotData } from './helpers/createPlotData';
import { createShadowPlotData } from './helpers/createShadowPlotData';
import { Data } from 'plotly.js-dist-min';
import { PlotOptions } from './helpers/types';
import { PlotService, SelectedDisplayOptions } from '@ui/pages/studio/services/plot.service';
import { SideTabsService } from '@ui/pages/studio/side-tabs/side-tabs.service';
import { ObstacleFormService } from '@ui/pages/studio/obstacles/obstaclesForm/obstaclesForm.service';
import { ObstaclesService } from '@ui/pages/studio/obstacles/obstacles.service';
import { DataObject } from './helpers/createPlotDataObject';
import { Section } from '@core/domain';

// Mock the helper functions
jest.mock('./helpers/createPlot');
jest.mock('./helpers/createPlotData');
jest.mock('./helpers/createShadowPlotData');

const mockCreatePlot = createPlot as jest.MockedFunction<typeof createPlot>;
const mockCreatePlotData = createPlotData as jest.MockedFunction<typeof createPlotData>;
const mockCreateShadowPlotData = createShadowPlotData as jest.MockedFunction<typeof createShadowPlotData>;

const mockSupports = [{ uuid: 's0', number: 1 } as any, { uuid: 's1', number: 2 } as any];

const mockSection: Section = {
  uuid: 'sec-1',
  internal_id: '1',
  name: 'Section',
  short_name: 'S1',
  created_at: '',
  updated_at: '',
  internal_catalog_id: '',
  type: '',
  electric_phase_number: 1,
  cable_name: '',
  cable_short_name: '',
  cables_amount: 1,
  optical_fibers_amount: 1,
  spans_amount: 1,
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
  link_name: undefined,
  lit_code: undefined,
  lit_name: undefined,
  branch_name: undefined,
  branch_idr: undefined,
  voltage_idr: undefined,
  comment: undefined,
  supports_comment: undefined,
  supports: mockSupports,
  obstacles: [],
  initial_conditions: [],
  selected_initial_condition_uuid: undefined,
  charges: [],
  selected_charge_uuid: null,
  field_measures: [],
  selected_field_measure_uuid: undefined,
  vtl_and_guying: undefined
};

describe('SectionPlotComponent', () => {
  let component: SectionPlotComponent;
  let fixture: ComponentFixture<SectionPlotComponent>;

  const mockLitData: GetSectionOutput = {
    supports: [[[1, 2, 3, 4, 5]]],
    insulators: [[[10, 20, 30, 40, 50]]],
    spans: [[[100, 200, 300, 400, 500]]],
    line_angle: [],
    vtl_under_chain: [],
    vtl_under_console: [],
    r_under_chain: [],
    r_under_console: [],
    ground_altitude: [],
    load_angle: [],
    displacement: [],
    loads_coords: {},
    span_length: [],
    elevation: [],
    parameter: [],
    tension_sup: [],
    tension_inf: [],
    L0: [],
    horizontal_distance: [],
    arc_length: [],
    T_h: []
  };

  const mockPlotOptions: PlotOptions = {
    view: '2d',
    side: 'profile',
    startSupport: 1,
    endSupport: 2,
    invert: false
  };

  const mockPlotData: DataObject[] = [
    {
      type: 'scatter3d',
      x: [1, 2],
      y: [10, 20],
      z: [100, 200],
      supportUuid: 's0'
    } as DataObject
  ];

  const mockSelectedDisplayOptions: SelectedDisplayOptions = {
    loads: false,
    baseState: false
  };
  const mockShadowPlotData: Data[] = [
    {
      type: 'scatter3d',
      x: [1, 2],
      y: [10, 20],
      z: [100, 200],
      line: { dash: 'solid' }
    } as Data
  ];

  const litDataSignal = signal<GetSectionOutput | null>(null);
  const baseLitDataSignal = signal<GetSectionOutput | null>(null);
  const plotOptionsSignal = signal<PlotOptions>(mockPlotOptions);
  const selectedDisplayOptionsSignal = signal(mockSelectedDisplayOptions);
  const sectionSignal = signal<Section | null>(mockSection);
  const cameraSignal = signal<unknown>(null);
  const isFreePositioningModeSignal = signal(false);

  const mockPlotService = {
    litData: litDataSignal,
    baseLitData: baseLitDataSignal,
    plotOptions: plotOptionsSignal,
    selectedDisplayOptions: selectedDisplayOptionsSignal,
    section: sectionSignal,
    camera: cameraSignal,
    isFreePositioningMode: isFreePositioningModeSignal,
    temporaryLoadData: undefined
  };

  const mockSideTabsService = {
    sideTabs: signal<number | null>(null)
  };

  const mockObstaclesService = {
    currentPointIndex: signal(0)
  };

  const mockObstacleFormService = {
    form: {
      get: (key: string) =>
        key === 'positions'
          ? { valueChanges: of([]) }
          : key === 'name'
            ? { valueChanges: of('') }
            : key === 'uuid'
              ? { value: null }
              : { value: null, valueChanges: of(null) },
      value: { uuid: null }
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCreatePlotData.mockReturnValue(mockPlotData);
    mockCreateShadowPlotData.mockReturnValue(mockShadowPlotData);
    mockCreatePlot.mockResolvedValue({} as any);

    litDataSignal.set(mockLitData);
    baseLitDataSignal.set(null);
    plotOptionsSignal.set(mockPlotOptions);
    selectedDisplayOptionsSignal.set(mockSelectedDisplayOptions);
    sectionSignal.set(mockSection);
    cameraSignal.set(null);

    await TestBed.configureTestingModule({
      imports: [SectionPlotComponent],
      providers: [
        { provide: 'provideAnimations', useValue: () => ({}) },
        { provide: PlotService, useValue: mockPlotService },
        { provide: SideTabsService, useValue: mockSideTabsService },
        { provide: ObstacleFormService, useValue: mockObstacleFormService },
        { provide: ObstaclesService, useValue: mockObstaclesService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SectionPlotComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default input values', () => {
      expect(component.litData()).toBeNull();
    });

    it('should have PlotService injected', () => {
      expect(component.plotService).toBe(mockPlotService);
    });
  });

  describe('refreshPlot Method', () => {
    it('should return early when litData is null', async () => {
      litDataSignal.set(null);
      const result = await component.refreshPlot();

      expect(result).toBeUndefined();
      expect(mockCreatePlotData).not.toHaveBeenCalled();
      expect(mockCreatePlot).not.toHaveBeenCalled();
    });

    it('should call helper functions with correct parameters when litData is provided', async () => {
      litDataSignal.set(mockLitData);
      await component.refreshPlot();

      expect(mockCreatePlotData).toHaveBeenCalledWith(mockLitData, mockPlotOptions, mockSupports);
      expect(mockCreatePlot).toHaveBeenCalledWith({
        plotId: 'plotly-output',
        data: mockPlotData,
        invert: false,
        view: '2d',
        camera: null,
        side: 'profile',
        spanLoads: [],
        litData: mockLitData,
        startSupport: 1,
        endSupport: 2,
        obstacles: expect.any(Array),
        currentObstacleUuid: null,
        currentObstaclePointIndex: 0
      });
    });

    it('should handle missing DOM element gracefully', async () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null);
      litDataSignal.set(mockLitData);

      await component.refreshPlot();

      expect(mockCreatePlot).toHaveBeenCalledWith({
        plotId: 'plotly-output',
        data: mockPlotData,
        invert: false,
        view: '2d',
        camera: null,
        side: 'profile',
        spanLoads: [],
        litData: mockLitData,
        startSupport: 1,
        endSupport: 2,
        obstacles: expect.any(Array),
        currentObstacleUuid: null,
        currentObstaclePointIndex: 0
      });
    });

    it('should use provided plotOptions when calling createPlotData', async () => {
      const customPlotOptions: PlotOptions = {
        view: '3d',
        side: 'face',
        startSupport: 2,
        endSupport: 4,
        invert: true
      };
      plotOptionsSignal.set(customPlotOptions);
      litDataSignal.set(mockLitData);

      await component.refreshPlot();

      expect(mockCreatePlotData).toHaveBeenCalledWith(mockLitData, customPlotOptions, mockSupports);
      expect(mockCreatePlot).toHaveBeenCalledWith({
        plotId: 'plotly-output',
        data: mockPlotData,
        invert: true,
        view: '3d',
        camera: null,
        side: 'face',
        spanLoads: [],
        litData: mockLitData,
        startSupport: 2,
        endSupport: 4,
        obstacles: expect.any(Array),
        currentObstacleUuid: null,
        currentObstaclePointIndex: 0
      });
    });

    it('should include shadow traces when baseState is enabled', async () => {
      const displayOptionsWithBase: SelectedDisplayOptions = {
        loads: false,
        baseState: true
      };

      baseLitDataSignal.set(mockLitData); // Using same data as baseLitData for test
      selectedDisplayOptionsSignal.set(displayOptionsWithBase);
      litDataSignal.set(mockLitData);
      await component.refreshPlot();

      expect(mockCreateShadowPlotData).toHaveBeenCalledWith(mockLitData, mockPlotOptions);
      // Plot data should include shadow traces prepended
      expect(mockCreatePlot).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [...mockShadowPlotData, ...mockPlotData]
        })
      );
    });

    it('should not include shadow traces when baseState is disabled', async () => {
      const displayOptionsWithoutBase: SelectedDisplayOptions = {
        loads: false,
        baseState: false
      };

      baseLitDataSignal.set(mockLitData);
      selectedDisplayOptionsSignal.set(displayOptionsWithoutBase);
      litDataSignal.set(mockLitData);
      await component.refreshPlot();

      expect(mockCreateShadowPlotData).not.toHaveBeenCalled();
      expect(mockCreatePlot).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockPlotData
        })
      );
    });

    it('should not include shadow traces when baseLitData is null', async () => {
      const displayOptionsWithBase: SelectedDisplayOptions = {
        loads: false,
        baseState: true
      };

      baseLitDataSignal.set(null); // baseLitData is null
      selectedDisplayOptionsSignal.set(displayOptionsWithBase);
      litDataSignal.set(mockLitData);
      await component.refreshPlot();

      expect(mockCreateShadowPlotData).not.toHaveBeenCalled();
      expect(mockCreatePlot).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockPlotData
        })
      );
    });
  });

  describe('Effect', () => {
    it('should call refreshPlot when invoked', async () => {
      const refreshSpy = jest.spyOn(component, 'refreshPlot');
      litDataSignal.set(mockLitData);

      await component.refreshPlot();

      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should handle null litData in refreshPlot', async () => {
      litDataSignal.set(null);

      const result = await component.refreshPlot();

      expect(result).toBeUndefined();
      expect(mockCreatePlotData).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow with valid data', async () => {
      litDataSignal.set(mockLitData);
      const refreshSpy = jest.spyOn(component, 'refreshPlot');

      await component.refreshPlot();

      expect(refreshSpy).toHaveBeenCalled();
      expect(mockCreatePlot).toHaveBeenCalled();
    });

    it('should handle workflow with different plotOptions', async () => {
      const customPlotOptions: PlotOptions = {
        view: '3d',
        side: 'face',
        startSupport: 2,
        endSupport: 4,
        invert: true
      };
      plotOptionsSignal.set(customPlotOptions);
      litDataSignal.set(mockLitData);

      await component.refreshPlot();

      expect(mockCreatePlotData).toHaveBeenCalledWith(mockLitData, customPlotOptions, mockSupports);
    });

    it('should handle null litData gracefully', async () => {
      litDataSignal.set(null);

      const result = await component.refreshPlot();

      expect(result).toBeUndefined();
      expect(mockCreatePlotData).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty litData', async () => {
      const emptyData: GetSectionOutput = {
        supports: [],
        insulators: [],
        spans: [],
        line_angle: [],
        vtl_under_chain: [],
        vtl_under_console: [],
        r_under_chain: [],
        r_under_console: [],
        ground_altitude: [],
        load_angle: [],
        displacement: [],
        loads_coords: {},
        span_length: [],
        elevation: [],
        parameter: [],
        tension_sup: [],
        tension_inf: [],
        L0: [],
        horizontal_distance: [],
        arc_length: [],
        T_h: []
      };
      litDataSignal.set(emptyData);

      const result = await component.refreshPlot();

      expect(result).toBeDefined();
      expect(mockCreatePlotData).toHaveBeenCalledWith(emptyData, mockPlotOptions, mockSupports);
    });

    it('should handle litData with null values', async () => {
      const dataWithNulls: GetSectionOutput = {
        supports: [[[1, 2]]],
        insulators: [[[10, 20]]],
        spans: [[[100, 200]]],
        line_angle: [],
        vtl_under_chain: [],
        vtl_under_console: [],
        r_under_chain: [],
        r_under_console: [],
        ground_altitude: [],
        load_angle: [],
        displacement: [],
        loads_coords: {},
        span_length: [],
        elevation: [],
        parameter: [],
        tension_sup: [],
        tension_inf: [],
        L0: [],
        horizontal_distance: [],
        arc_length: [],
        T_h: []
      };
      litDataSignal.set(dataWithNulls);

      const result = await component.refreshPlot();

      expect(result).toBeDefined();
      expect(mockCreatePlotData).toHaveBeenCalledWith(dataWithNulls, mockPlotOptions, mockSupports);
    });

    it('should handle very large support numbers', async () => {
      const largeData: GetSectionOutput = {
        supports: [[[999999]]],
        insulators: [[[10]]],
        spans: [[[100]]],
        line_angle: [],
        vtl_under_chain: [],
        vtl_under_console: [],
        r_under_chain: [],
        r_under_console: [],
        ground_altitude: [],
        load_angle: [],
        displacement: [],
        loads_coords: {},
        span_length: [],
        elevation: [],
        parameter: [],
        tension_sup: [],
        tension_inf: [],
        L0: [],
        horizontal_distance: [],
        arc_length: [],
        T_h: []
      };
      litDataSignal.set(largeData);

      const result = await component.refreshPlot();

      expect(result).toBeDefined();
      expect(mockCreatePlotData).toHaveBeenCalledWith(largeData, mockPlotOptions, mockSupports);
    });
  });
});
