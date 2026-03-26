import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { SectionPlotComponent } from './section-plot.component';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { createPlot } from './helpers/createPlot';
import { createPlotData } from './helpers/createPlotData';
import { Data, PlotlyHTMLElement } from 'plotly.js-dist-min';
import { PlotOptions } from '@shared/types/plot.types';
import { PlotService, SelectedDisplayOptions } from '@services/plot/plot.service';
import { SideTabsService } from '@services/side-tabs/side-tabs.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { DataObject } from './helpers/createPlotDataObject';
import { Section, Support, SpanLoad } from '@shared/domain';
import { ChargeData } from '@shared/domain/models/charge.model';
import { Obstacle, ReferenceSupport, LateralDistanceType } from '@shared/domain/models/obstacle.model';
import { LoadType } from './helpers/createLoadAnnotations';
import { LoadFormsService } from '@features/studio/loads/presentation/services/loadForms.service';

const DEBOUNCED_REFRESH_STUDIO_DELAY = 300;

vi.mock('./helpers/createPlot');
vi.mock('./helpers/createPlotData');
vi.mock('./helpers/createShadowPlotData');

import { createShadowPlotData } from './helpers/createShadowPlotData';

const mockCreatePlot = vi.mocked(createPlot);
const mockCreatePlotData = vi.mocked(createPlotData);
const mockCreateShadowPlotData = vi.mocked(createShadowPlotData);

const mockSupports: Support[] = [
  {
    uuid: 's0',
    number: '1',
    name: null,
    spanLength: null,
    spanAngle: null,
    attachmentSet: null,
    attachmentHeight: null,
    heightBelowConsole: null,
    towerModel: null,
    cableType: null,
    armLength: null,
    chainName: null,
    chainLength: null,
    chainWeight: null,
    chainV: null,
    counterWeight: null,
    supportFootAltitude: null,
    attachmentPosition: null,
    chainSurface: null
  },
  {
    uuid: 's1',
    number: '2',
    name: null,
    spanLength: null,
    spanAngle: null,
    attachmentSet: null,
    attachmentHeight: null,
    heightBelowConsole: null,
    towerModel: null,
    cableType: null,
    armLength: null,
    chainName: null,
    chainLength: null,
    chainWeight: null,
    chainV: null,
    counterWeight: null,
    supportFootAltitude: null,
    attachmentPosition: null,
    chainSurface: null
  }
];

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

const mockObstacle: Obstacle = {
  uuid: 'obs-1',
  supportUuid: 's0',
  name: 'Test Obstacle',
  type: 'House',
  altitudeType: 'absolute',
  lateralDistanceType: LateralDistanceType.SPAN_AXIS,
  referenceSupport: ReferenceSupport.LEFT,
  positions: [{ x: 1, y: 2, z: 3 }]
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
    startSupport: 0,
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

  const mockPlotElement = { on: vi.fn() };
  const noopMock = vi.fn();

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
    axesNorms: signal({ x: 1, y: 1, z: 1, aspectMode: 'data' }),
    temporaryLoadData: null as ChargeData | null | undefined,
    plotOptionsChange: noopMock,
    refreshCamera: noopMock,
    distances: signal([]),
    distanceType: signal<'oblique' | 'vertical' | 'horizontal'>('oblique')
  };

  const mockSideTabsService = {
    sideTabs: signal<number | null>(null)
  };

  const mockLoadFormsService = {
    activeLoadTab: signal<string>('0'),
    selectedSpanSupportUuid: signal<string | null>(null)
  };

  const mockObstaclesService = {
    selectedObstacleUuid: signal<string | null>(null),
    activePointIndex: signal<number | null>(null),
    setSelectedObstacle: vi.fn()
  };

  const createFormGet =
    (uuid: string | null = null) =>
    (key: string) => {
      if (key === 'positions') {
        return { valueChanges: of([]) };
      }
      if (key === 'name') {
        return { valueChanges: of('') };
      }
      if (key === 'uuid') {
        return { value: uuid };
      }
      return { value: null, valueChanges: of(null) };
    };

  const mockObstacleFormService: {
    form: { get: (key: string) => Record<string, unknown> | null; value: Partial<Obstacle> | { uuid: null } | null };
  } = {
    form: {
      get: createFormGet(),
      value: { uuid: null }
    }
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreatePlotData.mockReturnValue(mockPlotData);
    mockCreatePlot.mockResolvedValue(mockPlotElement as unknown as PlotlyHTMLElement);
    mockCreateShadowPlotData.mockReturnValue([]);

    litDataSignal.set(mockLitData);
    baseLitDataSignal.set(null);
    plotOptionsSignal.set(mockPlotOptions);
    selectedDisplayOptionsSignal.set(mockSelectedDisplayOptions);
    sectionSignal.set(mockSection);
    cameraSignal.set(null);
    mockObstacleFormService.form.get = createFormGet();
    mockObstacleFormService.form.value = { uuid: null };

    await TestBed.configureTestingModule({
      imports: [SectionPlotComponent],
      providers: [
        { provide: PlotService, useValue: mockPlotService },
        { provide: SideTabsService, useValue: mockSideTabsService },
        { provide: ObstacleFormService, useValue: mockObstacleFormService },
        { provide: ObstaclesService, useValue: mockObstaclesService },
        { provide: LoadFormsService, useValue: mockLoadFormsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SectionPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should have default input values', () => {
      expect(component.litData()).toBeNull();
    });

    it('should inject all required services', () => {
      expect(component['plotService']).toBe(mockPlotService);
      expect(component['sideTabsService']).toBe(mockSideTabsService);
      expect(component['obstacleFormService']).toBe(mockObstacleFormService);
      expect(component['obstaclesService']).toBe(mockObstaclesService);
    });

    it('should render plot container with data-testid', () => {
      const container = fixture.nativeElement.querySelector('[data-testid="section-plot-container"]');
      expect(container).toBeTruthy();
      expect(container.id).toBe('plotly-output');
    });

    it('should have correct container classes', () => {
      const container = fixture.nativeElement.querySelector('[data-testid="section-plot-container"]');
      expect(container.className).toContain('w-full');
      expect(container.className).toContain('h-full');
    });
  });

  describe('refreshPlot Method', () => {
    it('should return early when litData is null', async () => {
      litDataSignal.set(null);
      const result = await component.refreshPlot();

      expect(result).toBeUndefined();
      expect(mockCreatePlot).not.toHaveBeenCalled();
      expect(mockCreatePlotData).not.toHaveBeenCalled();
    });

    it('should call helper functions with correct parameters', async () => {
      litDataSignal.set(mockLitData);
      await component.refreshPlot();

      expect(mockCreatePlotData).toHaveBeenCalledWith(mockLitData, mockPlotOptions, mockSupports);
      expect(mockCreatePlot).toHaveBeenCalledWith(
        expect.objectContaining({
          plotId: 'plotly-output',
          data: mockPlotData,
          invert: false,
          view: '2d',
          side: 'profile',
          litData: mockLitData,
          startSupport: 0,
          endSupport: 2
        })
      );
    });

    it('should handle custom plotOptions', async () => {
      const customOptions: PlotOptions = {
        view: '3d',
        side: 'face',
        startSupport: 1,
        endSupport: 3,
        invert: true
      };
      plotOptionsSignal.set(customOptions);
      litDataSignal.set(mockLitData);

      await component.refreshPlot();

      expect(mockCreatePlotData).toHaveBeenCalledWith(mockLitData, customOptions, mockSupports);
      expect(mockCreatePlot).toHaveBeenCalledWith(
        expect.objectContaining({
          invert: true,
          view: '3d',
          side: 'face'
        })
      );
    });

    it('should handle missing section gracefully', async () => {
      sectionSignal.set(null);
      litDataSignal.set(mockLitData);

      await component.refreshPlot();

      expect(mockCreatePlot).toHaveBeenCalledWith(
        expect.objectContaining({
          obstacles: []
        })
      );
    });

    it('should pass correct obstacle data to createPlot', async () => {
      const sectionWithObstacles = {
        ...mockSection,
        obstacles: [mockObstacle]
      };
      sectionSignal.set(sectionWithObstacles);
      litDataSignal.set(mockLitData);

      mockObstaclesService.selectedObstacleUuid.set('obs-1');

      await component.refreshPlot();

      expect(mockCreatePlot).toHaveBeenCalledWith(
        expect.objectContaining({
          currentObstacleUuid: 'obs-1',
          obstacles: expect.arrayContaining([
            expect.objectContaining({
              uuid: 'obs-1'
            })
          ])
        })
      );
    });

    it('should set isPlotRefreshing signal during refresh', async () => {
      litDataSignal.set(mockLitData);

      const refreshPromise = component.refreshPlot();

      expect(component['isPlotRefreshing']()).toBe(true);

      await refreshPromise;

      expect(component['isPlotRefreshing']()).toBe(false);
    });

    it('should set isPlotRefreshing to false on error', async () => {
      mockCreatePlot.mockRejectedValueOnce(new Error('Plot creation failed'));
      litDataSignal.set(mockLitData);

      vi.spyOn(console, 'error').mockReturnValue(undefined);

      await component.refreshPlot();

      expect(component['isPlotRefreshing']()).toBe(false);
    });

    it('should log error when plot creation fails', async () => {
      const error = new Error('Plot creation failed');
      mockCreatePlot.mockRejectedValueOnce(error);
      litDataSignal.set(mockLitData);

      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      await component.refreshPlot();

      expect(consoleSpy).toHaveBeenCalledWith('Error refreshing plot:', error);

      consoleSpy.mockRestore();
    });

    it('should include shadow traces when baseState is enabled', async () => {
      const displayOptionsWithBase: SelectedDisplayOptions = {
        loads: false,
        baseState: true
      };

      mockCreateShadowPlotData.mockReturnValue(mockShadowPlotData);
      baseLitDataSignal.set(mockLitData);
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

  describe('getSpanLoadsToDisplay Method', () => {
    it('should return empty array when loads option is disabled', () => {
      const displayOptions = { loads: false, baseState: false };
      const result = component['getSpanLoadsToDisplay'](displayOptions, mockPlotOptions);

      expect(result).toEqual([]);
    });

    it('should return empty array when section is null', () => {
      sectionSignal.set(null);
      const displayOptions = { loads: true, baseState: false };
      const result = component['getSpanLoadsToDisplay'](displayOptions, mockPlotOptions);

      expect(result).toEqual([]);
    });

    it('should return span loads based on support slice', () => {
      const spanLoad = {
        supportUuid: 's0',
        loadWeight: 100,
        type: 'weight'
      } as unknown as SpanLoad;

      mockPlotService.temporaryLoadData = {
        spanLoads: [spanLoad]
      } as unknown as ChargeData;

      const displayOptions = { loads: true, baseState: false };
      const result = component['getSpanLoadsToDisplay'](displayOptions, mockPlotOptions);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(spanLoad);
      expect(result[1]).toBeNull();
    });

    it('should filter loads without weight or non-marking type', () => {
      mockPlotService.temporaryLoadData = {
        spanLoads: [
          { supportUuid: 's0', loadWeight: 0, loadPosition: 0, type: 'other' } as unknown as SpanLoad,
          { supportUuid: 's1', loadWeight: 100, loadPosition: 0, type: 'weight' } as unknown as SpanLoad
        ]
      } as unknown as ChargeData;

      const displayOptions = { loads: true, baseState: false };
      const result = component['getSpanLoadsToDisplay'](displayOptions, mockPlotOptions);

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({ supportUuid: 's1', loadWeight: 100, loadPosition: 0, type: 'weight' });
    });

    it('should include punctual load when loadWeight is 0 but loadPosition is non-zero', () => {
      const punctualLoad = {
        supportUuid: 's0',
        loadWeight: 0,
        loadPosition: 100,
        type: LoadType.PUNCTUAL
      } as unknown as SpanLoad;
      mockPlotService.temporaryLoadData = {
        spanLoads: [punctualLoad]
      } as unknown as ChargeData;

      const displayOptions = { loads: true, baseState: false };
      const result = component['getSpanLoadsToDisplay'](displayOptions, mockPlotOptions);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(punctualLoad);
    });

    it('should include marking loads even without weight', () => {
      const markingLoad = { supportUuid: 's0', loadWeight: 0, type: LoadType.MARKING } as unknown as SpanLoad;
      mockPlotService.temporaryLoadData = {
        spanLoads: [markingLoad]
      } as unknown as ChargeData;

      const displayOptions = { loads: true, baseState: false };
      const result = component['getSpanLoadsToDisplay'](displayOptions, mockPlotOptions);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(markingLoad);
      expect(result[1]).toBeNull();
    });

    it('should handle missing temporaryLoadData', () => {
      mockPlotService.temporaryLoadData = undefined;
      const displayOptions = { loads: true, baseState: false };
      const result = component['getSpanLoadsToDisplay'](displayOptions, mockPlotOptions);

      expect(result).toEqual([null, null]);
    });
  });

  describe('buildObstacleList Method', () => {
    it('should return existing obstacles when form obstacle is null', () => {
      mockObstacleFormService.form.value = null;
      const result = component['buildObstacleList']();

      expect(result).toEqual([]);
    });

    it('should append form obstacle to existing obstacles', () => {
      mockObstacleFormService.form.value = mockObstacle;
      sectionSignal.set({
        ...mockSection,
        obstacles: []
      });

      const result = component['buildObstacleList']();

      expect(result).toContainEqual(mockObstacle);
    });

    it('should replace existing obstacle with same uuid', () => {
      const existingObstacle = { ...mockObstacle, name: 'Old Name' };
      const updatedObstacle = { ...mockObstacle, name: 'New Name' };

      mockObstacleFormService.form.value = updatedObstacle;
      sectionSignal.set({
        ...mockSection,
        obstacles: [existingObstacle]
      });

      const result = component['buildObstacleList']();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('New Name');
    });

    it('should handle missing section obstacles', () => {
      mockObstacleFormService.form.value = mockObstacle;
      sectionSignal.set({ ...mockSection, obstacles: undefined } as unknown as Section);

      const result = component['buildObstacleList']();

      expect(result).toContainEqual(mockObstacle);
    });
  });

  describe('Debounced Effect', () => {
    it('should not refresh plot before debounce delay', fakeAsync(() => {
      mockCreatePlot.mockClear();
      fixture.componentRef.setInput('litData', mockLitData);
      fixture.detectChanges();

      tick(DEBOUNCED_REFRESH_STUDIO_DELAY - 100);
      expect(mockCreatePlot).not.toHaveBeenCalled();
    }));

    it('should not trigger more than one refresh within the same debounce period', fakeAsync(() => {
      mockCreatePlot.mockClear();
      mockSideTabsService.sideTabs.set(1);

      tick(DEBOUNCED_REFRESH_STUDIO_DELAY - 50);
      mockSideTabsService.sideTabs.set(2);

      tick(DEBOUNCED_REFRESH_STUDIO_DELAY);
      expect(mockCreatePlot.mock.calls.length).toBeLessThanOrEqual(1);
    }));
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow with valid data', async () => {
      litDataSignal.set(mockLitData);
      sectionSignal.set(mockSection);

      await component.refreshPlot();

      expect(mockCreatePlotData).toHaveBeenCalled();
      expect(mockCreatePlot).toHaveBeenCalled();
    });

    it('should handle multiple successive plot refreshes', async () => {
      litDataSignal.set(mockLitData);

      await component.refreshPlot();
      await component.refreshPlot();

      expect(mockCreatePlot).toHaveBeenCalledTimes(2);
    });

    it('should preserve obstacle data across refreshes', async () => {
      const obstacleWithMultiplePositions = {
        ...mockObstacle,
        positions: [
          { x: 1, y: 2, z: 3 },
          { x: 4, y: 5, z: 6 }
        ]
      };

      mockObstacleFormService.form.value = obstacleWithMultiplePositions;
      sectionSignal.set({
        ...mockSection,
        obstacles: [obstacleWithMultiplePositions]
      });

      litDataSignal.set(mockLitData);
      await component.refreshPlot();

      expect(mockCreatePlot).toHaveBeenCalledWith(
        expect.objectContaining({
          obstacles: expect.arrayContaining([
            expect.objectContaining({
              positions: obstacleWithMultiplePositions.positions
            })
          ])
        })
      );
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

      await component.refreshPlot();

      expect(mockCreatePlotData).toHaveBeenCalledWith(emptyData, mockPlotOptions, mockSupports);
      expect(mockCreatePlot).toHaveBeenCalled();
    });

    it('should handle camera null value', async () => {
      cameraSignal.set(null);
      litDataSignal.set(mockLitData);

      await component.refreshPlot();

      expect(mockCreatePlot).toHaveBeenCalledWith(
        expect.objectContaining({
          camera: null
        })
      );
    });

    it('should handle camera with valid value', async () => {
      const cameraValue = { x: 1, y: 2, z: 3 };
      cameraSignal.set(cameraValue);
      litDataSignal.set(mockLitData);

      await component.refreshPlot();

      expect(mockCreatePlot).toHaveBeenCalledWith(
        expect.objectContaining({
          camera: cameraValue
        })
      );
    });

    it('should handle obstacle point index updates', async () => {
      mockObstaclesService.activePointIndex.set(5);
      litDataSignal.set(mockLitData);

      await component.refreshPlot();

      expect(mockCreatePlot).toHaveBeenCalledWith(
        expect.objectContaining({
          currentObstaclePointIndex: 5
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle plot creation error gracefully', async () => {
      const error = new Error('Plot creation error');
      mockCreatePlot.mockRejectedValueOnce(error);
      litDataSignal.set(mockLitData);

      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      await component.refreshPlot();

      expect(consoleSpy).toHaveBeenCalledWith('Error refreshing plot:', error);
      expect(component['isPlotRefreshing']()).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should handle plotData creation error', async () => {
      mockCreatePlotData.mockImplementationOnce(() => {
        throw new Error('PlotData creation error');
      });
      litDataSignal.set(mockLitData);

      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      await component.refreshPlot();

      expect(consoleSpy).toHaveBeenCalledWith('Error refreshing plot:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Template', () => {
    it('should render the plotly output container', () => {
      const container = fixture.nativeElement.querySelector('#plotly-output');
      expect(container).toBeTruthy();
    });

    it('should have correct data-testid attribute', () => {
      const container = fixture.nativeElement.querySelector('[data-testid="section-plot-container"]');
      expect(container).toBeTruthy();
      expect(container.id).toBe('plotly-output');
    });
  });

  describe('addEventListenersToPlot — span load click', () => {
    let capturedHandler: ((event: { annotation?: { data?: unknown } }) => void) | null = null;

    beforeEach(() => {
      capturedHandler = null;
      mockLoadFormsService.activeLoadTab.set('0');
      mockLoadFormsService.selectedSpanSupportUuid.set(null);
      mockSideTabsService.sideTabs.set(null);
    });

    const makePlotWithCapture = () => {
      const self = {
        removeAllListeners: vi.fn(),
        on: (event: string, fn: (event: { annotation?: { data?: unknown } }) => void) => {
          if (event === 'plotly_clickannotation') {
            capturedHandler = fn;
          }
          return self;
        }
      } as unknown as PlotlyHTMLElement;
      return self;
    };

    it('should open Charges side tab and select span when span load annotation is clicked', () => {
      sectionSignal.set({ ...mockSection, supports: mockSupports });
      component.addEventListenersToPlot(makePlotWithCapture());

      capturedHandler!({ annotation: { data: { type: 'spanLoad', supportUuid: 's0' } } });

      expect(mockSideTabsService.sideTabs()).toBe(0);
      expect(mockLoadFormsService.activeLoadTab()).toBe('1');
      expect(mockLoadFormsService.selectedSpanSupportUuid()).toBe('s0');
    });

    it('should set selectedSpanSupportUuid to the clicked support uuid', () => {
      sectionSignal.set({ ...mockSection, supports: mockSupports });
      component.addEventListenersToPlot(makePlotWithCapture());

      capturedHandler!({ annotation: { data: { type: 'spanLoad', supportUuid: 's1' } } });

      expect(mockLoadFormsService.selectedSpanSupportUuid()).toBe('s1');
    });

    it('should open Charges tab even when supportUuid is unknown (SpanComponent handles validation)', () => {
      sectionSignal.set({ ...mockSection, supports: mockSupports });
      component.addEventListenersToPlot(makePlotWithCapture());

      capturedHandler!({ annotation: { data: { type: 'spanLoad', supportUuid: 'unknown-uuid' } } });

      expect(mockSideTabsService.sideTabs()).toBe(0);
      expect(mockLoadFormsService.activeLoadTab()).toBe('1');
      expect(mockLoadFormsService.selectedSpanSupportUuid()).toBe('unknown-uuid');
    });

    it('should not process span load click when annotation data is absent', () => {
      sectionSignal.set({ ...mockSection, supports: mockSupports });
      component.addEventListenersToPlot(makePlotWithCapture());

      capturedHandler!({});

      expect(mockSideTabsService.sideTabs()).toBeNull();
      expect(mockLoadFormsService.activeLoadTab()).toBe('0');
    });
  });
});
