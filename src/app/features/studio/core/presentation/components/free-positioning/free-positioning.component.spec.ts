import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FormArray, FormBuilder } from '@angular/forms';
import { FreePositioningComponent } from './free-positioning.component';
import { WorkerPythonService } from '@core/services/worker_python/worker-python.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { SideTabsService } from '@services/side-tabs/side-tabs.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { createPlotData } from '@shared/components/studio/section/helpers/createPlotData';
import { PythonErrorCode, TaskError } from '@core/services/worker_python/tasks/types';
import Plotly from 'plotly.js-dist-min';

vi.mock('@shared/components/studio/section/helpers/createPlotData');
vi.mock('plotly.js-dist-min', () => ({
  __esModule: true,
  default: {
    newPlot: vi.fn().mockResolvedValue({ data: [] } as unknown as Plotly.PlotlyHTMLElement),
    relayout: vi.fn(),
    purge: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined)
  },
  newPlot: vi.fn().mockResolvedValue({ data: [] } as unknown as Plotly.PlotlyHTMLElement),
  relayout: vi.fn(),
  purge: vi.fn(),
  update: vi.fn().mockResolvedValue(undefined)
}));

const mockCreatePlotData = createPlotData as vi.MockedFunction<typeof createPlotData>;

describe('FreePositioningComponent', () => {
  let component: FreePositioningComponent;
  let fixture: ComponentFixture<FreePositioningComponent>;
  let fb: FormBuilder;

  const plotOptionsSignal = signal({
    view: '2d' as const,
    side: 'profile' as const,
    startSupport: 0,
    endSupport: 1,
    invert: false
  });
  const workerReadySignal = signal(false);
  const litDataSignal = signal<unknown>(null);
  const sectionSignal = signal<unknown>({
    supports: [
      { uuid: 's0', number: '0' },
      { uuid: 's1', number: '1' }
    ],
    obstacles: []
  });
  const errorSignal = signal<unknown>(null);
  const pythonErrorCodeSignal = signal<unknown>(null);
  const loadingSignal = signal(false);

  const mockPlotService = {
    workerReady: workerReadySignal,
    litData: litDataSignal,
    error: errorSignal,
    pythonErrorCode: pythonErrorCodeSignal,
    loading: loadingSignal,
    temporaryLoadData: null
  };

  const mockSpanService = {
    section: sectionSignal
  };

  const mockPlotOptionsService = {
    plotOptions: plotOptionsSignal,
    camera: signal(null),
    isFreePositioningMode: signal(false)
  };

  const mockWorkerPythonService = {
    runTask: vi.fn().mockResolvedValue({
      result: {
        supports: [[[1, 2, 3]]],
        insulators: [[[10, 20, 30]]],
        spans: [[[100, 200, 300]]],
        L0: [],
        elevation: [],
        line_angle: [],
        vtl_under_chain: [],
        vtl_under_console: [],
        r_under_chain: [],
        r_under_console: [],
        ground_altitude: [],
        load_angle: [],
        displacement: [],
        span_length: [],
        loads_coords: {},
        parameter: [],
        tension_sup: [],
        tension_inf: [],
        horizontal_distance: [],
        arc_length: [],
        T_h: []
      }
    })
  };

  const mockSideTabsService = {
    sideTabs: signal<number | null>(null)
  };

  const mockObstaclesService = {
    activePointIndex: signal<number | null>(0)
  };

  let positionsFormArray: FormArray;

  const buildMockObstacleFormService = () => {
    fb = new FormBuilder();
    positionsFormArray = fb.array([fb.group({ x: 1, y: 2, z: 3 }), fb.group({ x: 4, y: 5, z: 6 })]);

    const form = fb.group({
      uuid: [null as string | null],
      name: ['test'],
      type: ['tree'],
      supportUuid: ['s0'],
      referenceSupport: [null as string | null],
      altitudeType: ['absolute'],
      lateralDistanceType: ['left'],
      positions: positionsFormArray
    });

    return {
      form,
      positions: positionsFormArray,
      buildObstacleFromForm: vi.fn().mockReturnValue({
        uuid: null,
        name: 'test',
        type: 'tree',
        supportUuid: 's0',
        referenceSupport: null,
        altitudeType: 'absolute',
        lateralDistanceType: 'left',
        positions: [
          { x: 1, y: 2, z: 3 },
          { x: 4, y: 5, z: 6 }
        ]
      })
    };
  };

  let mockObstacleFormService: ReturnType<typeof buildMockObstacleFormService>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockCreatePlotData.mockReturnValue([]);
    mockObstacleFormService = buildMockObstacleFormService();

    // Reset signals
    workerReadySignal.set(false);
    litDataSignal.set(null);
    errorSignal.set(null);
    loadingSignal.set(false);

    await TestBed.configureTestingModule({
      imports: [FreePositioningComponent],
      providers: [
        { provide: WorkerPythonService, useValue: mockWorkerPythonService },
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: PlotOptionsService, useValue: mockPlotOptionsService },
        { provide: SideTabsService, useValue: mockSideTabsService },
        { provide: ObstacleFormService, useValue: mockObstacleFormService },
        { provide: ObstaclesService, useValue: mockObstaclesService }
      ]
    })
      .overrideComponent(FreePositioningComponent, {
        set: { template: '<div></div>' }
      })
      .compileComponents();

    fixture = TestBed.createComponent(FreePositioningComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Component creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should start with isLoading true', () => {
      expect(component.isLoading()).toBe(true);
    });

    it('should have null initial plot references', () => {
      expect(component.plotFace()).toBeNull();
      expect(component.plotProfile()).toBeNull();
    });

    it('should have null initial mouse positions', () => {
      expect(component.profileMousePosition()).toBeNull();
      expect(component.faceMousePosition()).toBeNull();
    });
  });

  describe('Click to position (profile)', () => {
    const makeFakePlotElement = (xValue: number, yValue: number) =>
      ({
        _fullLayout: {
          margin: { l: 0, r: 0, t: 0, b: 0 },
          xaxis: { p2c: () => xValue },
          yaxis: { p2c: () => yValue }
        }
      }) as unknown as {
        _fullLayout: {
          margin: { l: number; r: number; t: number; b: number };
          xaxis: { p2c: () => number };
          yaxis: { p2c: () => number };
        };
      };

    const makeClickEvent = () =>
      ({
        layerX: 10,
        layerY: 10,
        target: { tagName: 'CANVAS' }
      }) as unknown as { layerX: number; layerY: number; target: { tagName: string } };

    it('should store absolute altitude in absolute mode', () => {
      // absolute by default
      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 0, y: 0, z: 0 }));
      mockObstaclesService.activePointIndex.set(0);

      const plotElement = makeFakePlotElement(100, 50);
      (component as unknown as { handleClick: (evt: unknown, type: string, plotElement: unknown) => void }).handleClick(
        makeClickEvent(),
        'profile',
        plotElement
      );

      expect(positionsFormArray.at(0).get('x')?.value).toBe(100);
      expect(positionsFormArray.at(0).get('z')?.value).toBe(50);
    });

    it('should store delta altitude in relative mode', () => {
      (mockObstacleFormService.form.get('altitudeType') as { setValue: (v: string) => void }).setValue('relative');
      component.referenceSupportAltitudeNgf.set(30);

      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 0, y: 0, z: 0 }));
      mockObstaclesService.activePointIndex.set(0);

      const plotElement = makeFakePlotElement(100, 50);
      (component as unknown as { handleClick: (evt: unknown, type: string, plotElement: unknown) => void }).handleClick(
        makeClickEvent(),
        'profile',
        plotElement
      );

      // 50 (absolute) - 30 (support) = 20
      expect(positionsFormArray.at(0).get('z')?.value).toBe(20);
    });
  });

  describe('Click to position (face)', () => {
    const makeFakePlotElement = (xValue: number, yValue: number) =>
      ({
        _fullLayout: {
          margin: { l: 0, r: 0, t: 0, b: 0 },
          xaxis: { p2c: () => xValue },
          yaxis: { p2c: () => yValue }
        }
      }) as unknown as HTMLElement;

    const makeClickEvent = () =>
      ({
        layerX: 10,
        layerY: 10,
        target: { tagName: 'CANVAS' }
      }) as unknown as MouseEvent;

    it('should update y only on face click in absolute mode, keeping z unchanged', () => {
      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 10, y: 0, z: 0 }));
      mockObstaclesService.activePointIndex.set(0);

      const plotElement = makeFakePlotElement(5, 25);
      component['handleClick'](makeClickEvent(), 'face', plotElement);

      expect(positionsFormArray.at(0).get('x')?.value).toBe(10); // x kept
      expect(positionsFormArray.at(0).get('y')?.value).toBe(5); // y updated from xaxis
      expect(positionsFormArray.at(0).get('z')?.value).toBe(0); // z kept unchanged
    });

    it('should update y only on face click in relative mode, keeping z unchanged', () => {
      mockObstacleFormService.form.get('altitudeType')!.setValue('relative');
      component.referenceSupportAltitudeNgf.set(30);

      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 10, y: 0, z: 7 }));
      mockObstaclesService.activePointIndex.set(0);

      const plotElement = makeFakePlotElement(5, 50);
      component['handleClick'](makeClickEvent(), 'face', plotElement);

      expect(positionsFormArray.at(0).get('x')?.value).toBe(10); // x kept
      expect(positionsFormArray.at(0).get('y')?.value).toBe(5); // y updated from xaxis
      expect(positionsFormArray.at(0).get('z')?.value).toBe(7); // z kept unchanged
    });
  });

  describe('getErrorString', () => {
    it('should return unknown error string when error is null', () => {
      errorSignal.set(null);
      // formatStudioError returns 'Unknown error' for null
      expect(component.getErrorString()).toBeTruthy();
    });

    it('should return python-specific message when pythonErrorCode is set', () => {
      errorSignal.set('CALCULATION_ERROR');
      pythonErrorCodeSignal.set('SolverError');
      expect(component.getErrorString()).toContain('solver');
    });
  });

  describe('relayoutPlots', () => {
    it('should not call Plotly.relayout when plots are null', () => {
      component.plotFace.set(null);
      component.plotProfile.set(null);

      component.relayoutPlots();

      expect(Plotly.relayout).not.toHaveBeenCalled();
    });

    it('should call Plotly.relayout on face plot when it exists', () => {
      const fakePlot = {} as unknown as Plotly.PlotlyHTMLElement;
      component.plotFace.set(fakePlot);
      component.plotProfile.set(null);

      component.relayoutPlots();

      expect(Plotly.relayout).toHaveBeenCalledTimes(1);
      expect(Plotly.relayout).toHaveBeenCalledWith(
        fakePlot,
        expect.objectContaining({ autosize: true, showlegend: false })
      );
    });

    it('should call Plotly.relayout on both plots when both exist', () => {
      const fakeFace = { id: 'face' } as unknown as Plotly.PlotlyHTMLElement;
      const fakeProfile = { id: 'profile' } as unknown as Plotly.PlotlyHTMLElement;
      component.plotFace.set(fakeFace);
      component.plotProfile.set(fakeProfile);

      component.relayoutPlots();

      expect(Plotly.relayout).toHaveBeenCalledTimes(2);
    });

    it('should include shared Y range in layout when set', () => {
      const fakeFace = { id: 'face' } as unknown as Plotly.PlotlyHTMLElement;
      const fakeProfile = { id: 'profile' } as unknown as Plotly.PlotlyHTMLElement;
      component.plotFace.set(fakeFace);
      component.plotProfile.set(fakeProfile);
      component['sharedYRange'].set([0, 100]);

      component.relayoutPlots();

      expect(Plotly.relayout).toHaveBeenCalledWith(
        fakeFace,
        expect.objectContaining({
          yaxis: expect.objectContaining({ range: [0, 100], autorange: false })
        })
      );
      expect(Plotly.relayout).toHaveBeenCalledWith(
        fakeProfile,
        expect.objectContaining({
          yaxis: expect.objectContaining({ range: [0, 100], autorange: false })
        })
      );
    });
  });

  describe('synchronizeYAxisRanges', () => {
    it('should compute shared Y range from both plots data', () => {
      const fakeFace = {
        data: [{ y: [10, 20, 30] }]
      } as unknown as Plotly.PlotlyHTMLElement;
      const fakeProfile = {
        data: [{ y: [5, 15, 50] }]
      } as unknown as Plotly.PlotlyHTMLElement;
      component.plotFace.set(fakeFace);
      component.plotProfile.set(fakeProfile);

      component['synchronizeYAxisRanges']();

      // min=5, max=50, padding = (50-5)*0.05 = 2.25 → range = [2.75, 52.25]
      const range = component.sharedYRange() as [number, number];
      expect(range).not.toBeNull();
      expect(range[0]).toBeCloseTo(2.75, 10);
      expect(range[1]).toBeCloseTo(52.25, 10);

      expect(Plotly.relayout).toHaveBeenCalledWith(fakeFace, {
        'yaxis.range': expect.arrayContaining([expect.closeTo(2.75, 10), expect.closeTo(52.25, 10)]),
        'yaxis.autorange': false
      });
      expect(Plotly.relayout).toHaveBeenCalledWith(fakeProfile, {
        'yaxis.range': expect.arrayContaining([expect.closeTo(2.75, 10), expect.closeTo(52.25, 10)]),
        'yaxis.autorange': false
      });
    });

    it('should not synchronize when a plot is null', () => {
      component.plotFace.set(null);
      component.plotProfile.set({ data: [{ y: [1] }] } as unknown as Plotly.PlotlyHTMLElement);

      component['synchronizeYAxisRanges']();

      expect(component.sharedYRange()).toBeNull();
      expect(Plotly.relayout).not.toHaveBeenCalled();
    });

    it('should not synchronize when both plots have no y data', () => {
      component.plotFace.set({ data: [] } as unknown as Plotly.PlotlyHTMLElement);
      component.plotProfile.set({ data: [] } as unknown as Plotly.PlotlyHTMLElement);

      component['synchronizeYAxisRanges']();

      expect(component.sharedYRange()).toBeNull();
    });
  });

  describe('createPlot', () => {
    const mockLitData = {
      supports: [[[1, 2, 3]]],
      insulators: [[[10, 20, 30]]],
      spans: [[[100, 200, 300]]],
      L0: [],
      elevation: [],
      line_angle: [],
      vtl_under_chain: [],
      vtl_under_console: [],
      r_under_chain: [],
      r_under_console: [],
      ground_altitude: [],
      load_angle: [],
      displacement: [],
      span_length: [],
      loads_coords: {},
      parameter: [],
      tension_sup: [],
      tension_inf: [],
      horizontal_distance: [],
      arc_length: [],
      T_h: []
    };

    it('should return early when litData is null', async () => {
      await component.createPlot(
        null as unknown as import('@core/services/worker_python/tasks/types').GetSectionOutput,
        0,
        'face',
        []
      );

      expect(mockCreatePlotData).not.toHaveBeenCalled();
      expect(Plotly.newPlot).not.toHaveBeenCalled();
    });

    it('should return early when DOM element is not found', async () => {
      vi.spyOn(document, 'getElementById').mockReturnValue(null);
      const consoleSpy = vi.spyOn(console, 'warn').mockReturnValue(undefined);

      await component.createPlot(mockLitData, 0, 'profile', []);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Plot element not found'));
    });

    it('should call createPlotData and Plotly.newPlot when element exists', async () => {
      const fakeElement = document.createElement('div');
      vi.spyOn(document, 'getElementById').mockReturnValue(fakeElement);

      await component.createPlot(mockLitData, 0, 'profile', []);

      expect(mockCreatePlotData).toHaveBeenCalledWith(
        mockLitData,
        expect.objectContaining({ view: '2d', side: 'profile' }),
        []
      );
      expect(Plotly.newPlot).toHaveBeenCalled();
    });

    it('should set plotFace when side is face', async () => {
      const fakeElement = document.createElement('div');
      vi.spyOn(document, 'getElementById').mockReturnValue(fakeElement);
      (Plotly.newPlot as vi.Mock).mockResolvedValue({ _face: true, data: [] } as unknown as Plotly.PlotlyHTMLElement);

      await component.createPlot(mockLitData, 0, 'face', []);

      expect(component.plotFace()).toEqual(expect.objectContaining({ _face: true }));
    });

    it('should set plotProfile when side is profile', async () => {
      const fakeElement = document.createElement('div');
      vi.spyOn(document, 'getElementById').mockReturnValue(fakeElement);
      (Plotly.newPlot as vi.Mock).mockResolvedValue({
        _profile: true,
        data: []
      } as unknown as Plotly.PlotlyHTMLElement);

      await component.createPlot(mockLitData, 0, 'profile', []);

      expect(component.plotProfile()).toEqual(expect.objectContaining({ _profile: true }));
    });

    it('should handle errors gracefully', async () => {
      const fakeElement = document.createElement('div');
      vi.spyOn(document, 'getElementById').mockReturnValue(fakeElement);
      mockCreatePlotData.mockImplementation(() => {
        throw new Error('plot data failure');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      await component.createPlot(mockLitData, 0, 'face', []);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error creating plot'), expect.any(Error));
    });
  });

  describe('ngOnDestroy', () => {
    it('should purge existing plots on destroy', () => {
      const fakeFace = { id: 'face' } as unknown as Plotly.PlotlyHTMLElement;
      const fakeProfile = { id: 'profile' } as unknown as Plotly.PlotlyHTMLElement;
      component.plotFace.set(fakeFace);
      component.plotProfile.set(fakeProfile);

      component.ngOnDestroy();

      expect(Plotly.purge).toHaveBeenCalledTimes(2);
      expect(Plotly.purge).toHaveBeenCalledWith(fakeFace);
      expect(Plotly.purge).toHaveBeenCalledWith(fakeProfile);
      expect(component.plotFace()).toBeNull();
      expect(component.plotProfile()).toBeNull();
    });

    it('should handle destroy when no plots exist', () => {
      component.plotFace.set(null);
      component.plotProfile.set(null);

      component.ngOnDestroy();

      expect(Plotly.purge).not.toHaveBeenCalled();
    });
  });

  describe('getAnnotations (via updateSelectedPositionMarkers)', () => {
    it('should invoke Plotly.relayout with annotations when plots exist', () => {
      const fakePlot = {
        _fullLayout: { margin: { l: 0, r: 0, t: 0, b: 0 } }
      } as unknown as Plotly.PlotlyHTMLElement;
      component.plotFace.set(fakePlot);
      component.plotProfile.set(fakePlot);

      // Trigger via the debounced wrapper — flush timers
      component.debounceUpdateSelectedPositionMarkers();
      vi.advanceTimersByTime(200);

      expect(Plotly.relayout).toHaveBeenCalled();
    });

    it('should not call Plotly.relayout when plots are null', () => {
      component.plotFace.set(null);
      component.plotProfile.set(null);

      component.debounceUpdateSelectedPositionMarkers();
      vi.advanceTimersByTime(200);

      expect(Plotly.relayout).not.toHaveBeenCalled();
    });

    it('should skip positions with null x or z', () => {
      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: null, y: 2, z: 3 }));
      positionsFormArray.push(fb.group({ x: 1, y: 2, z: null }));

      const fakePlot = {
        _fullLayout: { margin: { l: 0, r: 0, t: 0, b: 0 } }
      } as unknown as Plotly.PlotlyHTMLElement;
      component.plotProfile.set(fakePlot);

      component.debounceUpdateSelectedPositionMarkers();
      vi.advanceTimersByTime(200);

      // The annotations array in the relayout call should be empty
      const relayoutCall = (Plotly.relayout as vi.Mock).mock.calls[0];
      const layout = relayoutCall[1];
      expect(layout.annotations).toEqual([]);
    });

    it('should skip face positions with null y', () => {
      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 1, y: null, z: 3 }));

      const fakePlot = {
        _fullLayout: { margin: { l: 0, r: 0, t: 0, b: 0 } }
      } as unknown as Plotly.PlotlyHTMLElement;
      component.plotFace.set(fakePlot);
      component.plotProfile.set(null);

      component.debounceUpdateSelectedPositionMarkers();
      vi.advanceTimersByTime(200);

      // Face view requires y — annotation should be skipped for face, but profile would have it
      const relayoutCall = (Plotly.relayout as vi.Mock).mock.calls[0];
      const layout = relayoutCall[1];
      expect(layout.annotations).toEqual([]);
    });

    it('should highlight current point index in red', () => {
      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 1, y: 2, z: 3 }));
      positionsFormArray.push(fb.group({ x: 4, y: 5, z: 6 }));
      mockObstaclesService.activePointIndex.set(1);

      const fakePlot = {
        _fullLayout: { margin: { l: 0, r: 0, t: 0, b: 0 } }
      } as unknown as Plotly.PlotlyHTMLElement;
      component.plotProfile.set(fakePlot);
      component.plotFace.set(null);

      component.debounceUpdateSelectedPositionMarkers();
      vi.advanceTimersByTime(200);

      const relayoutCall = (Plotly.relayout as vi.Mock).mock.calls[0];
      const annotations = relayoutCall[1].annotations;
      expect(annotations[0].font.color).toBe('black');
      expect(annotations[1].font.color).toBe('red');
    });

    it('should use raw NGF altitude in absolute mode', () => {
      // altitudeType is absolute by default in the mock form
      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 1, y: 2, z: 3 }));

      const fakePlot = {
        _fullLayout: { margin: { l: 0, r: 0, t: 0, b: 0 } }
      } as unknown as Plotly.PlotlyHTMLElement;
      component.plotProfile.set(fakePlot);

      component.debounceUpdateSelectedPositionMarkers();
      vi.advanceTimersByTime(200);

      const relayoutCall = (Plotly.relayout as vi.Mock).mock.calls[0];
      const annotations = relayoutCall[1].annotations;
      expect(annotations[0].y).toBe(3);
    });

    it('should add reference support altitude in relative mode', () => {
      // Switch to relative altitude mode
      (mockObstacleFormService.form.get('altitudeType') as { setValue: (v: string) => void }).setValue('relative');

      // Simulate support altitude NGF = 30
      component.referenceSupportAltitudeNgf.set(30);

      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 1, y: 2, z: 3 }));

      const fakePlot = {
        _fullLayout: { margin: { l: 0, r: 0, t: 0, b: 0 } }
      } as unknown as Plotly.PlotlyHTMLElement;
      component.plotProfile.set(fakePlot);

      component.debounceUpdateSelectedPositionMarkers();
      vi.advanceTimersByTime(200);

      const relayoutCall = (Plotly.relayout as vi.Mock).mock.calls[0];
      const annotations = relayoutCall[1].annotations;
      expect(annotations[0].y).toBe(33);
    });
  });

  describe('recreatePlots – referenceSupportAltitudeNgf uses selected reference support', () => {
    // Two supports with different altitudes:
    //   support 0 (left)  → altitude 100  (first point [x, y, z=100])
    //   support 1 (right) → altitude 250  (first point [x, y, z=250])
    const litDataWithTwoSupports = {
      supports: [[[10, 20, 100]], [[30, 40, 250]]],
      insulators: [[[0, 0, 0]]],
      spans: [[[0, 0, 0]]],
      L0: [],
      elevation: [],
      line_angle: [],
      vtl_under_chain: [],
      vtl_under_console: [],
      r_under_chain: [],
      r_under_console: [],
      ground_altitude: [],
      load_angle: [],
      displacement: [],
      span_length: [],
      loads_coords: {},
      parameter: [],
      tension_sup: [],
      tension_inf: [],
      horizontal_distance: [],
      arc_length: [],
      T_h: []
    };

    const flushDebounceAndMicrotasks = async () => {
      // Advance past the debounce delay
      vi.advanceTimersByTime(500);
      // Flush the resolved promise from runTask
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      // Flush any remaining microtasks
      vi.advanceTimersByTime(0);
      await Promise.resolve();
      await Promise.resolve();
    };

    beforeEach(() => {
      // Mock DOM elements so createPlot doesn't warn about missing elements
      vi.spyOn(document, 'getElementById').mockReturnValue(document.createElement('div'));
      vi.spyOn(console, 'warn').mockReturnValue(undefined);
    });

    it('should use left support altitude when referenceSupport is null', async () => {
      const obstacleOutput = { obstacles: [{ uuid: 'obs-1', points: [[1, 2, 3]] }] };
      mockWorkerPythonService.runTask.mockResolvedValueOnce({
        result: obstacleOutput,
        error: null
      });
      litDataSignal.set(litDataWithTwoSupports);
      mockObstacleFormService.form.get('referenceSupport')?.setValue(null);

      component.recreatePlots();
      await flushDebounceAndMicrotasks();

      expect(component.referenceSupportAltitudeNgf()).toBe(100);
      expect(mockPlotService.litData()).toEqual(litDataWithTwoSupports);
      expect(mockCreatePlotData).toHaveBeenCalled();
      expect(mockCreatePlotData.mock.calls[0][0]).toEqual({
        ...litDataWithTwoSupports,
        obstacles: obstacleOutput.obstacles
      });
    });

    it('should use left support altitude when referenceSupport is LEFT', async () => {
      mockWorkerPythonService.runTask.mockResolvedValueOnce({
        result: { obstacles: [] },
        error: null
      });
      litDataSignal.set(litDataWithTwoSupports);
      (mockObstacleFormService.form.get('referenceSupport') as { setValue: (v: ReferenceSupport) => void }).setValue(
        ReferenceSupport.LEFT
      );

      component.recreatePlots();
      await flushDebounceAndMicrotasks();

      expect(component.referenceSupportAltitudeNgf()).toBe(100);
    });

    it('should use right support altitude when referenceSupport is RIGHT', async () => {
      mockWorkerPythonService.runTask.mockResolvedValueOnce({
        result: { obstacles: [] },
        error: null
      });
      litDataSignal.set(litDataWithTwoSupports);
      (mockObstacleFormService.form.get('referenceSupport') as { setValue: (v: ReferenceSupport) => void }).setValue(
        ReferenceSupport.RIGHT
      );

      component.recreatePlots();
      await flushDebounceAndMicrotasks();

      expect(component.referenceSupportAltitudeNgf()).toBe(250);
    });

    it('should fall back to 0 when right support data is missing', async () => {
      const litDataOnlyOneSupport = {
        ...litDataWithTwoSupports,
        supports: [[[10, 20, 100]]]
      };
      mockWorkerPythonService.runTask.mockResolvedValueOnce({
        result: { obstacles: [] },
        error: null
      });
      litDataSignal.set(litDataOnlyOneSupport);
      (mockObstacleFormService.form.get('referenceSupport') as { setValue: (v: ReferenceSupport) => void }).setValue(
        ReferenceSupport.RIGHT
      );

      component.recreatePlots();
      await flushDebounceAndMicrotasks();

      // Support index 1 doesn't exist → getSupportAltitudeNgf returns 0
      expect(component.referenceSupportAltitudeNgf()).toBe(0);
    });

    it('should stop and expose worker errors without clearing litData', async () => {
      mockWorkerPythonService.runTask.mockResolvedValueOnce({
        result: null,
        error: TaskError.CALCULATION_ERROR,
        pythonErrorCode: PythonErrorCode.SolverError
      });
      litDataSignal.set(litDataWithTwoSupports);

      component.recreatePlots();
      await flushDebounceAndMicrotasks();

      expect(mockPlotService.error()).toBe(TaskError.CALCULATION_ERROR);
      expect(mockPlotService.pythonErrorCode()).toBe(PythonErrorCode.SolverError);
      expect(mockPlotService.litData()).toEqual(litDataWithTwoSupports);
      expect(mockCreatePlotData).not.toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });
  });
});
