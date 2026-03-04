import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FormArray, FormBuilder } from '@angular/forms';
import { FreePositioningComponent } from './free-positioning.component';
import { WorkerPythonService } from '@core/services/worker_python/worker-python.service';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { SideTabsService } from '@ui/pages/studio/side-tabs/side-tabs.service';
import { ObstacleFormService } from '@src/app/ui/pages/studio/obstacles/obstaclesForm/obstaclesForm.service';
import { ObstaclesService } from '@src/app/ui/pages/studio/obstacles/obstacles.service';
import { ReferenceSupport } from '@src/app/core/domain/models/obstacle.model';
import { createPlotData } from '../section/helpers/createPlotData';
import Plotly from 'plotly.js-dist-min';

jest.mock('../section/helpers/createPlotData');
jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn().mockResolvedValue({} as any),
  relayout: jest.fn(),
  purge: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined)
}));

const mockCreatePlotData = createPlotData as jest.MockedFunction<typeof createPlotData>;

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
  const litDataSignal = signal<any>(null);
  const sectionSignal = signal<any>({
    supports: [
      { uuid: 's0', number: '0' },
      { uuid: 's1', number: '1' }
    ],
    obstacles: []
  });
  const errorSignal = signal<any>(null);
  const loadingSignal = signal(false);

  const mockPlotService = {
    plotOptions: plotOptionsSignal,
    workerReady: workerReadySignal,
    litData: litDataSignal,
    section: sectionSignal,
    error: errorSignal,
    loading: loadingSignal,
    camera: signal(null),
    isFreePositioningMode: signal(false),
    temporaryLoadData: null
  };

  const mockWorkerPythonService = {
    runTask: jest.fn().mockResolvedValue({
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
    currentPointIndex: signal(0)
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
      positions: positionsFormArray
    };
  };

  let mockObstacleFormService: ReturnType<typeof buildMockObstacleFormService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
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
    jest.useRealTimers();
    jest.restoreAllMocks();
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
      }) as any;

    const makeClickEvent = () =>
      ({
        layerX: 10,
        layerY: 10,
        target: { tagName: 'CANVAS' }
      }) as any;

    it('should store absolute altitude in absolute mode', () => {
      // absolute by default
      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 0, y: 0, z: 0 }));
      mockObstaclesService.currentPointIndex.set(0);

      const plotElement = makeFakePlotElement(100, 50);
      (component as any).handleClick(makeClickEvent(), 'profile', plotElement);

      expect(positionsFormArray.at(0).get('x')?.value).toBe(100);
      expect(positionsFormArray.at(0).get('z')?.value).toBe(50);
    });

    it('should store delta altitude in relative mode', () => {
      (mockObstacleFormService.form.get('altitudeType') as any).setValue('relative');
      component.referenceSupportAltitudeNgf.set(30);

      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 0, y: 0, z: 0 }));
      mockObstaclesService.currentPointIndex.set(0);

      const plotElement = makeFakePlotElement(100, 50);
      (component as any).handleClick(makeClickEvent(), 'profile', plotElement);

      // 50 (absolute) - 30 (support) = 20
      expect(positionsFormArray.at(0).get('z')?.value).toBe(20);
    });
  });

  describe('getErrorString', () => {
    it('should return unknown error string when error is null', () => {
      errorSignal.set(null);
      // formatStudioError returns 'Unknown error' for null
      expect(component.getErrorString()).toBeTruthy();
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
      const fakePlot = {} as any;
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
      const fakeFace = { id: 'face' } as any;
      const fakeProfile = { id: 'profile' } as any;
      component.plotFace.set(fakeFace);
      component.plotProfile.set(fakeProfile);

      component.relayoutPlots();

      expect(Plotly.relayout).toHaveBeenCalledTimes(2);
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
      await component.createPlot(null as any, 0, 'face', []);

      expect(mockCreatePlotData).not.toHaveBeenCalled();
      expect(Plotly.newPlot).not.toHaveBeenCalled();
    });

    it('should return early when DOM element is not found', async () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await component.createPlot(mockLitData, 0, 'profile', []);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Plot element not found'));
    });

    it('should call createPlotData and Plotly.newPlot when element exists', async () => {
      const fakeElement = document.createElement('div');
      jest.spyOn(document, 'getElementById').mockReturnValue(fakeElement);

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
      jest.spyOn(document, 'getElementById').mockReturnValue(fakeElement);
      (Plotly.newPlot as jest.Mock).mockResolvedValue({ _face: true } as any);

      await component.createPlot(mockLitData, 0, 'face', []);

      expect(component.plotFace()).toEqual({ _face: true });
    });

    it('should set plotProfile when side is profile', async () => {
      const fakeElement = document.createElement('div');
      jest.spyOn(document, 'getElementById').mockReturnValue(fakeElement);
      (Plotly.newPlot as jest.Mock).mockResolvedValue({
        _profile: true
      } as any);

      await component.createPlot(mockLitData, 0, 'profile', []);

      expect(component.plotProfile()).toEqual({ _profile: true });
    });

    it('should handle errors gracefully', async () => {
      const fakeElement = document.createElement('div');
      jest.spyOn(document, 'getElementById').mockReturnValue(fakeElement);
      mockCreatePlotData.mockImplementation(() => {
        throw new Error('plot data failure');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await component.createPlot(mockLitData, 0, 'face', []);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error creating plot'), expect.any(Error));
    });
  });

  describe('ngOnDestroy', () => {
    it('should purge existing plots on destroy', () => {
      const fakeFace = { id: 'face' } as any;
      const fakeProfile = { id: 'profile' } as any;
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
    it('should invoke Plotly.update with annotations when plots exist', () => {
      const fakePlot = {
        _fullLayout: { margin: { l: 0, r: 0, t: 0, b: 0 } }
      } as any;
      component.plotFace.set(fakePlot);
      component.plotProfile.set(fakePlot);

      // Trigger via the debounced wrapper — flush timers
      component.debounceUpdateSelectedPositionMarkers();
      jest.advanceTimersByTime(200);

      expect(Plotly.update).toHaveBeenCalled();
    });

    it('should not call Plotly.update when plots are null', () => {
      component.plotFace.set(null);
      component.plotProfile.set(null);

      component.debounceUpdateSelectedPositionMarkers();
      jest.advanceTimersByTime(200);

      expect(Plotly.update).not.toHaveBeenCalled();
    });

    it('should skip positions with null x or z', () => {
      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: null, y: 2, z: 3 }));
      positionsFormArray.push(fb.group({ x: 1, y: 2, z: null }));

      const fakePlot = {
        _fullLayout: { margin: { l: 0, r: 0, t: 0, b: 0 } }
      } as any;
      component.plotProfile.set(fakePlot);

      component.debounceUpdateSelectedPositionMarkers();
      jest.advanceTimersByTime(200);

      // The annotations array in the update call should be empty
      const updateCall = (Plotly.update as jest.Mock).mock.calls[0];
      const layout = updateCall[2];
      expect(layout.annotations).toEqual([]);
    });

    it('should skip face positions with null y', () => {
      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 1, y: null, z: 3 }));

      const fakePlot = {
        _fullLayout: { margin: { l: 0, r: 0, t: 0, b: 0 } }
      } as any;
      component.plotFace.set(fakePlot);
      component.plotProfile.set(null);

      component.debounceUpdateSelectedPositionMarkers();
      jest.advanceTimersByTime(200);

      // Face view requires y — annotation should be skipped for face, but profile would have it
      const updateCall = (Plotly.update as jest.Mock).mock.calls[0];
      const layout = updateCall[2];
      expect(layout.annotations).toEqual([]);
    });

    it('should highlight current point index in red', () => {
      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 1, y: 2, z: 3 }));
      positionsFormArray.push(fb.group({ x: 4, y: 5, z: 6 }));
      mockObstaclesService.currentPointIndex.set(1);

      const fakePlot = {
        _fullLayout: { margin: { l: 0, r: 0, t: 0, b: 0 } }
      } as any;
      component.plotProfile.set(fakePlot);
      component.plotFace.set(null);

      component.debounceUpdateSelectedPositionMarkers();
      jest.advanceTimersByTime(200);

      const updateCall = (Plotly.update as jest.Mock).mock.calls[0];
      const annotations = updateCall[2].annotations;
      expect(annotations[0].font.color).toBe('black');
      expect(annotations[1].font.color).toBe('red');
    });

    it('should use raw NGF altitude in absolute mode', () => {
      // altitudeType is absolute by default in the mock form
      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 1, y: 2, z: 3 }));

      const fakePlot = {
        _fullLayout: { margin: { l: 0, r: 0, t: 0, b: 0 } }
      } as any;
      component.plotProfile.set(fakePlot);

      component.debounceUpdateSelectedPositionMarkers();
      jest.advanceTimersByTime(200);

      const updateCall = (Plotly.update as jest.Mock).mock.calls[0];
      const annotations = updateCall[2].annotations;
      expect(annotations[0].y).toBe(3);
    });

    it('should add reference support altitude in relative mode', () => {
      // Switch to relative altitude mode
      (mockObstacleFormService.form.get('altitudeType') as any).setValue('relative');

      // Simulate support altitude NGF = 30
      component.referenceSupportAltitudeNgf.set(30);

      positionsFormArray.clear();
      positionsFormArray.push(fb.group({ x: 1, y: 2, z: 3 }));

      const fakePlot = {
        _fullLayout: { margin: { l: 0, r: 0, t: 0, b: 0 } }
      } as any;
      component.plotProfile.set(fakePlot);

      component.debounceUpdateSelectedPositionMarkers();
      jest.advanceTimersByTime(200);

      const updateCall = (Plotly.update as jest.Mock).mock.calls[0];
      const annotations = updateCall[2].annotations;
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
      jest.advanceTimersByTime(500);
      // Flush the resolved promise from runTask
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      // Flush any remaining microtasks
      jest.advanceTimersByTime(0);
      await Promise.resolve();
      await Promise.resolve();
    };

    beforeEach(() => {
      // Mock DOM elements so createPlot doesn't warn about missing elements
      jest.spyOn(document, 'getElementById').mockReturnValue(document.createElement('div'));
      jest.spyOn(console, 'warn').mockImplementation();
    });

    it('should use left support altitude when referenceSupport is null', async () => {
      mockWorkerPythonService.runTask.mockResolvedValueOnce({
        result: { current: litDataWithTwoSupports }
      });
      mockObstacleFormService.form.get('referenceSupport')?.setValue(null);

      component.recreatePlots();
      await flushDebounceAndMicrotasks();

      expect(component.referenceSupportAltitudeNgf()).toBe(100);
    });

    it('should use left support altitude when referenceSupport is LEFT', async () => {
      mockWorkerPythonService.runTask.mockResolvedValueOnce({
        result: { current: litDataWithTwoSupports }
      });
      (mockObstacleFormService.form.get('referenceSupport') as any).setValue(ReferenceSupport.LEFT);

      component.recreatePlots();
      await flushDebounceAndMicrotasks();

      expect(component.referenceSupportAltitudeNgf()).toBe(100);
    });

    it('should use right support altitude when referenceSupport is RIGHT', async () => {
      mockWorkerPythonService.runTask.mockResolvedValueOnce({
        result: { current: litDataWithTwoSupports }
      });
      (mockObstacleFormService.form.get('referenceSupport') as any).setValue(ReferenceSupport.RIGHT);

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
        result: { current: litDataOnlyOneSupport }
      });
      (mockObstacleFormService.form.get('referenceSupport') as any).setValue(ReferenceSupport.RIGHT);

      component.recreatePlots();
      await flushDebounceAndMicrotasks();

      // Support index 1 doesn't exist → getSupportAltitudeNgf returns 0
      expect(component.referenceSupportAltitudeNgf()).toBe(0);
    });
  });
});
