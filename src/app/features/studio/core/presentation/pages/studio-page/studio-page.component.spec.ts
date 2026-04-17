import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { StudioPageComponent } from './studio-page.component';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ElementRef, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { InputNumberModule } from 'primeng/inputnumber';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TabsModule } from 'primeng/tabs';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { StudiesService } from '@services/studies/studies.service';
import { SectionService } from '@services/section/section.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { LoadFormsService } from '@features/studio/loads/presentation/services/loadForms.service';
import { Section, Study } from '@shared/domain';

interface SignalFn<T> {
  (): T;
  set: (v: T) => void;
}

// Helper to create a signal-like mock that is both callable and has a .set method
function createSignalMock<T>(initialValue: T): SignalFn<T> {
  let value = initialValue;
  const fn = (() => value) as SignalFn<T>;
  fn.set = (v: T) => {
    value = v;
  };
  return fn;
}

// PlotService mock shape used by the component
class PlotServiceMock {
  isStudioActive: SignalFn<boolean> = createSignalMock<boolean>(false);
  study: SignalFn<Study | null> = createSignalMock<Study | null>(null);
  litData = signal<{ parameter?: number[]; utilization_rate?: number[] } | null>(null);
  loading: SignalFn<boolean> = createSignalMock<boolean>(false);
  plotOptions = vi.fn().mockReturnValue({ invert: false, startSupport: 0, endSupport: 4 });
  plotOptionsChange = vi.fn();
  resetAll = vi.fn();
}

// SpanService mock
class SpanServiceMock {
  // Real Angular signal so computed() in the component properly tracks it
  section = signal<Section | null>(null);
  spanAmountChoice: SignalFn<'single' | 'double' | 'all'> = createSignalMock<'single' | 'double' | 'all'>('all');
  getSupportIndex = vi.fn().mockReturnValue(0);
}

// StudiesService mock
class StudiesServiceMock {
  ready = new Subject<boolean>();
  getStudyAsObservable = vi.fn();
  setCurrentStudy = vi.fn();
}

describe('StudioPageComponent', () => {
  let component: StudioPageComponent;
  let fixture: ComponentFixture<StudioPageComponent>;
  let router: Router;
  let route: ActivatedRoute;
  let plotService: PlotServiceMock;
  let spanService: SpanServiceMock;
  let plotOptionsServiceMock: { plotOptions: ReturnType<typeof vi.fn>; isFreePositioningMode: SignalFn<boolean> };
  let studiesService: StudiesServiceMock;
  let sectionService: vi.Mocked<SectionService>;
  let obstaclesService: ObstaclesService;
  let obstacleFormService: vi.Mocked<ObstacleFormService>;
  let mockObstacleStateService: { distanceType: SignalFn<'oblique' | 'vertical' | 'horizontal' | null> };

  beforeEach(async () => {
    plotService = new PlotServiceMock();
    spanService = new SpanServiceMock();
    plotOptionsServiceMock = {
      plotOptions: vi.fn().mockReturnValue({ invert: false }),
      isFreePositioningMode: createSignalMock<boolean>(false)
    };
    studiesService = new StudiesServiceMock();
    sectionService = {} as unknown as vi.Mocked<SectionService>;
    obstacleFormService = {
      setExistingObstacle: vi.fn(),
      clearPositions: vi.fn()
    } as unknown as vi.Mocked<ObstacleFormService>;
    mockObstacleStateService = { distanceType: createSignalMock<'oblique' | 'vertical' | 'horizontal' | null>(null) };

    await TestBed.configureTestingModule({
      imports: [StudioPageComponent],
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: vi.fn().mockReturnValue('study-1') },
              queryParamMap: { get: vi.fn().mockReturnValue('section-1') }
            }
          }
        },
        { provide: PlotService, useValue: plotService },
        { provide: PlotSpanService, useValue: spanService },
        { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
        { provide: StudiesService, useValue: studiesService },
        { provide: SectionService, useValue: sectionService },
        { provide: ObstacleFormService, useValue: obstacleFormService },
        { provide: ObstacleStateService, useValue: mockObstacleStateService },
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ElementRef,
          useValue: {
            nativeElement: {
              querySelector: vi.fn().mockReturnValue(null) // prevent ResizeObserver branch
            }
          }
        }
      ]
    })
      .overrideComponent(StudioPageComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(StudioPageComponent);
    component = fixture.componentInstance;
    obstaclesService = TestBed.inject(ObstaclesService);
    router = TestBed.inject(Router);
    route = TestBed.inject(ActivatedRoute);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('toggleSidebar should toggle open state and width', () => {
    expect(component.sidebarOpen()).toBe(false);
    expect(component.sidebarWidth()).toBe(300); // initial width signal default

    component.toggleSidebar();
    expect(component.sidebarOpen()).toBe(true);
    expect(component.sidebarWidth()).toBe(300);

    component.toggleSidebar();
    expect(component.sidebarOpen()).toBe(false);
    expect(component.sidebarWidth()).toBe(0);
  });

  it('sliderOptions should reflect initial ceil and invert values', () => {
    // Initial state: no section and invert=false per mock
    expect(component.sliderOptions().ceil).toBeUndefined();
    expect(component.sliderOptions().rightToLeft).toBe(false);
  });

  it('ngOnInit should navigate when params are missing', () => {
    (route.snapshot.paramMap.get as vi.Mock).mockReturnValueOnce(null);

    component.ngOnInit();
    expect(router.navigate).toHaveBeenCalledWith(['/studies']);
  });

  it('ngOnInit should load study and section, then set plot options', () => {
    const studyUuid = 'study-1';
    const sectionUuid = 'section-1';
    (route.snapshot.paramMap.get as vi.Mock).mockReturnValue(studyUuid);
    (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue(sectionUuid);

    const study = {
      sections: [
        { uuid: 'other', supports: [1], obstacles: [] },
        { uuid: sectionUuid, supports: [1, 2, 3], obstacles: [] }
      ]
    } as unknown as Study;

    studiesService.getStudyAsObservable.mockReturnValue(of(study));

    const sectionSetSpy = vi.spyOn(spanService.section, 'set');
    const studySetSpy = vi.spyOn(plotService.study, 'set');

    component.ngOnInit();

    // Emit ready - this triggers the subscription
    studiesService.ready.next(true);

    // Wait for async operations
    fixture.detectChanges();

    expect(studySetSpy).toHaveBeenCalledWith(study);
    expect(sectionSetSpy).toHaveBeenCalledWith(study.sections[1]);
    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      endSupport: 2,
      startSupport: 0
    });
  });

  it('ngOnInit should navigate if section not found', () => {
    (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
    (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue('missing-section');

    const study = {
      sections: [{ uuid: 'a', supports: [1] }]
    } as unknown as Study;
    studiesService.getStudyAsObservable.mockReturnValue(of(study));

    component.ngOnInit();
    studiesService.ready.next(true);

    // Wait for async operations
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/studies']);
  });

  it('debounceUpdateSliderOptions should call plotOptionsChange after delay', () => {
    vi.useFakeTimers();
    component.debounceUpdateSliderOptions('startSupport', 1);
    expect(plotService.plotOptionsChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 1
    });
  });

  it('debounceUpdateSliderOptions should set supports to single when diff is 1', () => {
    vi.useFakeTimers();
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 2,
      endSupport: 3
    });

    component.debounceUpdateSliderOptions('endSupport', 3);
    vi.advanceTimersByTime(300);

    expect(spanService.spanAmountChoice()).toBe('single');
  });

  it('debounceUpdateSliderOptions should set spanAmountChoice to double when diff is 2', () => {
    vi.useFakeTimers();
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 1,
      endSupport: 3
    });

    component.debounceUpdateSliderOptions('endSupport', 3);
    vi.advanceTimersByTime(300);

    expect(spanService.spanAmountChoice()).toBe('double');
  });

  it('sliderOptions translate callback should return value + 1 as string', () => {
    const translate = component.sliderOptions().translate;
    expect(translate!(0, 0)).toBe('1');
    expect(translate!(4, 0)).toBe('5');
  });

  it('ngOnInit should navigate when study is null', () => {
    (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
    (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue('section-1');

    studiesService.getStudyAsObservable.mockReturnValue(of(null));

    component.ngOnInit();
    studiesService.ready.next(true);
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/studies']);
  });

  it('updateSliderOptions should debounce startSupport changes', () => {
    vi.useFakeTimers();
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 0,
      endSupport: 3
    });

    component.updateSliderOptions({ value: 1, highValue: 3 });

    vi.advanceTimersByTime(300);

    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 1
    });
  });

  it('updateSliderOptions should debounce endSupport changes', () => {
    vi.useFakeTimers();
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 0,
      endSupport: 3
    });

    component.updateSliderOptions({ value: 0, highValue: 5 });

    vi.advanceTimersByTime(300);

    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      endSupport: 5
    });
  });

  it('updateSliderOptions should not call debounce when values unchanged', () => {
    vi.useFakeTimers();
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 0,
      endSupport: 3
    });

    component.updateSliderOptions({ value: 0, highValue: 3 });

    vi.advanceTimersByTime(300);

    expect(plotService.plotOptionsChange).not.toHaveBeenCalled();
  });

  it('onSelectSpanAmount should set single span offset', () => {
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 1,
      endSupport: 5
    });
    spanService.section.set({
      supports: [1, 2, 3, 4, 5, 6]
    } as unknown as Section);

    component.onSelectSpanAmount('single');

    expect(spanService.spanAmountChoice()).toBe('single');
    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      endSupport: 2
    });
  });

  it('onSelectSpanAmount should set double span offset', () => {
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 1,
      endSupport: 5
    });
    spanService.section.set({
      supports: [1, 2, 3, 4, 5, 6]
    } as unknown as Section);

    component.onSelectSpanAmount('double');

    expect(spanService.spanAmountChoice()).toBe('double');
    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      endSupport: 3
    });
  });

  it('onSelectSpanAmount should reset to all supports', () => {
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 1,
      endSupport: 3
    });
    spanService.section.set({
      supports: [1, 2, 3, 4, 5, 6]
    } as unknown as Section);

    component.onSelectSpanAmount('all');

    expect(spanService.spanAmountChoice()).toBe('all');
    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 0,
      endSupport: 5
    });
  });

  it('onSelectSpanAmount single should clamp to maxSupport', () => {
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 4,
      endSupport: 5
    });
    spanService.section.set({
      supports: [1, 2, 3, 4, 5]
    } as unknown as Section);

    component.onSelectSpanAmount('single');

    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      endSupport: 4
    });
  });

  it('onSupportButtonClick right should increment supports', () => {
    spanService.spanAmountChoice.set('single');
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 1,
      endSupport: 2
    });

    component.onSupportButtonClick('right');

    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 2,
      endSupport: 3
    });
  });

  it('onSupportButtonClick left should decrement supports', () => {
    spanService.spanAmountChoice.set('double');
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 2,
      endSupport: 4
    });

    component.onSupportButtonClick('left');

    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 1,
      endSupport: 3
    });
  });

  it('onSupportButtonClick left should clamp to zero', () => {
    spanService.spanAmountChoice.set('single');
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 0,
      endSupport: 1
    });

    component.onSupportButtonClick('left');

    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 0,
      endSupport: 0
    });
  });

  it('onSupportButtonClick right with invert should decrement supports', () => {
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: true,
      startSupport: 2,
      endSupport: 4
    });

    component.onSupportButtonClick('right');

    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 1,
      endSupport: 3
    });
  });

  it('onSupportButtonClick left with invert should increment supports', () => {
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: true,
      startSupport: 1,
      endSupport: 2
    });

    component.onSupportButtonClick('left');

    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 2,
      endSupport: 3
    });
  });

  it('onSupportButtonClick right with invert should clamp to zero', () => {
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: true,
      startSupport: 0,
      endSupport: 1
    });

    component.onSupportButtonClick('right');

    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 0,
      endSupport: 0
    });
  });

  it('ngOnDestroy should reset plot service and clear obstacle selection', () => {
    obstaclesService.selectedObstacleUuid.set('obs-1');
    obstaclesService.activePointIndex.set(2);

    component.ngOnDestroy();

    expect(plotService.resetAll).toHaveBeenCalled();
    expect(plotService.isStudioActive()).toBe(false);
    expect(obstaclesService.selectedObstacleUuid()).toBeNull();
    expect(obstaclesService.activePointIndex()).toBeNull();
  });

  describe('UC: studio page initialization and navigation', () => {
    it('UC-SP1: should redirect to studies when route params are missing', () => {
      (route.snapshot.paramMap.get as vi.Mock).mockReturnValueOnce(null);
      component.ngOnInit();
      expect(router.navigate).toHaveBeenCalledWith(['/studies']);
    });

    it('UC-SP2: should initialize sidebar in closed state', () => {
      expect(component.sidebarOpen()).toBe(false);
    });

    it('UC-SP3: should open sidebar on toggle', () => {
      component.toggleSidebar();
      expect(component.sidebarOpen()).toBe(true);
      expect(component.sidebarWidth()).toBe(300);
    });
  });

  describe('filteredObstaclesOptions', () => {
    it('should return empty array when section is null', () => {
      expect(component.filteredObstaclesOptions()).toEqual([]);
    });

    it('should include only obstacles whose supportUuid falls within the slider range (endSupport inclusive)', () => {
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 0, endSupport: 2 });
      spanService.section.set({
        supports: [{ uuid: 'sup-0' }, { uuid: 'sup-1' }, { uuid: 'sup-2' }],
        obstacles: [
          { uuid: 'obs-0', name: 'Obstacle A', supportUuid: 'sup-0' },
          { uuid: 'obs-1', name: 'Obstacle B', supportUuid: 'sup-1' },
          { uuid: 'obs-2', name: 'Obstacle C', supportUuid: 'sup-2' }
        ]
      } as unknown as Section);

      expect(component.filteredObstaclesOptions()).toEqual([
        { label: 'No selected', value: null },
        { label: 'Obstacle A', value: 'obs-0' },
        { label: 'Obstacle B', value: 'obs-1' },
        { label: 'Obstacle C', value: 'obs-2' }
      ]);
    });

    it('should exclude obstacles outside the slider range', () => {
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 1, endSupport: 2 });
      spanService.section.set({
        supports: [{ uuid: 'sup-0' }, { uuid: 'sup-1' }, { uuid: 'sup-2' }],
        obstacles: [
          { uuid: 'obs-0', name: 'Obstacle A', supportUuid: 'sup-0' },
          { uuid: 'obs-1', name: 'Obstacle B', supportUuid: 'sup-1' }
        ]
      } as unknown as Section);

      expect(component.filteredObstaclesOptions()).toEqual([
        { label: 'No selected', value: null },
        { label: 'Obstacle B', value: 'obs-1' }
      ]);
    });

    it('should not include selected obstacle when it is outside the visible slider range', () => {
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 1, endSupport: 2 });
      spanService.section.set({
        supports: [{ uuid: 'sup-0' }, { uuid: 'sup-1' }, { uuid: 'sup-2' }],
        obstacles: [
          { uuid: 'obs-0', name: 'Obstacle A', supportUuid: 'sup-0' },
          { uuid: 'obs-1', name: 'Obstacle B', supportUuid: 'sup-1' }
        ]
      } as unknown as Section);
      obstaclesService.selectedObstacleUuid.set('obs-0');

      expect(component.filteredObstaclesOptions()).toEqual([
        { label: 'No selected', value: null },
        { label: 'Obstacle B', value: 'obs-1' }
      ]);
    });
  });

  describe('obstacle selection reset on span change', () => {
    it('should reset obstacle selection when startSupport or endSupport change', async () => {
      // Setup: select an obstacle
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 0, endSupport: 2 });
      spanService.section.set({
        supports: [{ uuid: 'sup-0' }, { uuid: 'sup-1' }, { uuid: 'sup-2' }],
        obstacles: [{ uuid: 'obs-0', name: 'Obstacle A', supportUuid: 'sup-0', positions: [{ x: 0, y: 0, z: 0 }] }]
      } as unknown as Section);
      component.onObstacleSelect('obs-0');
      expect(obstaclesService.selectedObstacleUuid()).toBe('obs-0');

      // Simulate span change — obstacle is now outside visible range
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 1, endSupport: 2 });

      // Verify filtered options no longer include the obstacle from sup-0
      expect(component.filteredObstaclesOptions()).toEqual([]);
    });
  });

  describe('obstaclePointOptions', () => {
    it('should return empty array when no obstacle is selected', () => {
      expect(component.obstaclePointOptions()).toEqual([]);
    });

    it('should return labeled point options for the selected obstacle', () => {
      spanService.section.set({
        supports: [],
        obstacles: [
          {
            uuid: 'obs-1',
            name: 'Obstacle A',
            supportUuid: 'sup-0',
            positions: [
              { x: 1, y: 2, z: 3 },
              { x: 4, y: 5, z: 6 }
            ]
          }
        ]
      } as unknown as Section);

      obstaclesService.selectedObstacleUuid.set('obs-1');

      expect(component.obstaclePointOptions()).toEqual([
        { label: 'Point 1', value: 0 },
        { label: 'Point 2', value: 1 }
      ]);
    });

    it('should return empty array when selected obstacle uuid does not match any obstacle', () => {
      spanService.section.set({ supports: [], obstacles: [] } as unknown as Section);
      obstaclesService.selectedObstacleUuid.set('non-existent');

      expect(component.obstaclePointOptions()).toEqual([]);
    });
  });

  describe('onObstacleSelect', () => {
    it('should auto-select point index 0 when obstacle has exactly one point', () => {
      spanService.section.set({
        supports: [],
        obstacles: [{ uuid: 'obs-1', name: 'Obstacle A', supportUuid: 'sup-0', positions: [{ x: 1, y: 2, z: 3 }] }]
      } as unknown as Section);

      component.onObstacleSelect('obs-1');

      expect(obstaclesService.selectedObstacleUuid()).toBe('obs-1');
      expect(obstaclesService.activePointIndex()).toBe(0);
    });

    it('should set null point index when obstacle has multiple points', () => {
      spanService.section.set({
        supports: [],
        obstacles: [
          {
            uuid: 'obs-1',
            name: 'Obstacle A',
            supportUuid: 'sup-0',
            positions: [
              { x: 1, y: 2, z: 3 },
              { x: 4, y: 5, z: 6 }
            ]
          }
        ]
      } as unknown as Section);
      obstaclesService.activePointIndex.set(1);

      component.onObstacleSelect('obs-1');

      expect(obstaclesService.selectedObstacleUuid()).toBe('obs-1');
      expect(obstaclesService.activePointIndex()).toBeNull();
    });

    it('should clear obstacle UUID and reset point index when called with null', () => {
      obstaclesService.selectedObstacleUuid.set('obs-1');
      obstaclesService.activePointIndex.set(2);

      component.onObstacleSelect(null);

      expect(obstaclesService.selectedObstacleUuid()).toBeNull();
      expect(obstaclesService.activePointIndex()).toBeNull();
    });

    it('should reset distanceType to null when selecting an obstacle', () => {
      mockObstacleStateService.distanceType.set('oblique');
      spanService.section.set({
        supports: [],
        obstacles: [{ uuid: 'obs-1', name: 'Obstacle A', supportUuid: 'sup-0', positions: [{ x: 1, y: 2, z: 3 }] }]
      } as unknown as Section);

      component.onObstacleSelect('obs-1');

      expect(mockObstacleStateService.distanceType()).toBeNull();
    });

    it('should reset distanceType to null when deselecting an obstacle', () => {
      mockObstacleStateService.distanceType.set('vertical');

      component.onObstacleSelect(null);

      expect(mockObstacleStateService.distanceType()).toBeNull();
    });

    it('should load the obstacle into the form when selected', () => {
      spanService.section.set({
        supports: [],
        obstacles: [{ uuid: 'obs-1', name: 'Obstacle A', supportUuid: 'sup-2', positions: [{ x: 1, y: 2, z: 3 }] }]
      } as unknown as Section);

      component.onObstacleSelect('obs-1');

      expect(obstacleFormService.setExistingObstacle).toHaveBeenCalled();
    });
  });

  describe('globalState', () => {
    it('should default to max_section', () => {
      expect(component.globalState()).toBe('max_section');
    });
  });

  describe('globalParameter', () => {
    it('should return null when litData is null', () => {
      plotService.litData.set(null);
      expect(component.globalParameter()).toBeNull();
    });

    it('should return null when parameter array is empty', () => {
      plotService.litData.set({ parameter: [] });
      expect(component.globalParameter()).toBeNull();
    });

    it('should return the max value across all spans in max_section mode', () => {
      component.globalState.set('max_section');
      plotService.litData.set({ parameter: [100, 250.789, 180] });
      expect(component.globalParameter()).toBe(250.79);
    });

    it('should return the middle span value in span mode', () => {
      component.globalState.set('span');
      // startSupport=0, endSupport=4 → findMiddleSpan(0,4) = [2,3] → middleSpanIndex=2
      plotService.plotOptions.mockReturnValue({ invert: false, startSupport: 0, endSupport: 4 });
      plotService.litData.set({ parameter: [100, 150, 200, 250, 300] });
      expect(component.globalParameter()).toBe(200);
    });

    it('should return null when middle span index is out of bounds in span mode', () => {
      component.globalState.set('span');
      // startSupport=8, endSupport=10 → findMiddleSpan(8,10) = [9,10] → index 9 is out of bounds
      plotService.plotOptions.mockReturnValue({ invert: false, startSupport: 8, endSupport: 10 });
      plotService.litData.set({ parameter: [100, 150] });
      expect(component.globalParameter()).toBeNull();
    });

    it('should return the same span value for a single span in span mode', () => {
      component.globalState.set('span');
      // startSupport=2, endSupport=3 → findMiddleSpan(2,3) = [2,3] → middleSpanIndex=2
      plotService.plotOptions.mockReturnValue({ invert: false, startSupport: 2, endSupport: 3 });
      plotService.litData.set({ parameter: [100, 150, 200, 250] });
      expect(component.globalParameter()).toBe(200);
    });

    it('should round to 2 decimal places', () => {
      component.globalState.set('max_section');
      plotService.litData.set({ parameter: [123.4567] });
      expect(component.globalParameter()).toBe(123.46);
    });

    it('should recompute when globalState changes', () => {
      plotService.plotOptions.mockReturnValue({ invert: false, startSupport: 0, endSupport: 4 });
      plotService.litData.set({ parameter: [10, 20, 30, 40, 50] });

      component.globalState.set('max_section');
      expect(component.globalParameter()).toBe(50);

      component.globalState.set('span');
      // findMiddleSpan(0,4) = [2,3] → index 2 → 30
      expect(component.globalParameter()).toBe(30);
    });
  });

  describe('globalStressRate', () => {
    it('should return null when litData is null', () => {
      plotService.litData.set(null);
      expect(component.globalStressRate()).toBeNull();
    });

    it('should return null when utilization_rate array is empty', () => {
      plotService.litData.set({ utilization_rate: [] });
      expect(component.globalStressRate()).toBeNull();
    });

    it('should return the max value across all spans in max_section mode', () => {
      component.globalState.set('max_section');
      plotService.litData.set({ utilization_rate: [40, 90.456, 65] });
      expect(component.globalStressRate()).toBe(90.46);
    });

    it('should return the middle span value in span mode', () => {
      component.globalState.set('span');
      // startSupport=0, endSupport=4 → findMiddleSpan(0,4) = [2,3] → middleSpanIndex=2
      plotService.plotOptions.mockReturnValue({ invert: false, startSupport: 0, endSupport: 4 });
      plotService.litData.set({ utilization_rate: [40, 55, 70, 85, 95] });
      expect(component.globalStressRate()).toBe(70);
    });

    it('should recompute when globalState changes', () => {
      plotService.plotOptions.mockReturnValue({ invert: false, startSupport: 0, endSupport: 4 });
      plotService.litData.set({ utilization_rate: [10, 20, 30, 40, 50] });

      component.globalState.set('max_section');
      expect(component.globalStressRate()).toBe(50);

      component.globalState.set('span');
      // findMiddleSpan(0,4) = [2,3] → index 2 → 30
      expect(component.globalStressRate()).toBe(30);
    });
  });
});

describe('StudioPageComponent - HTML rendering', () => {
  let fixture: ComponentFixture<StudioPageComponent>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    const mockPlotService = {
      isFreePositioningMode: signal(false),
      section: signal<Section | null>(null),
      litData: signal(null),
      loading: signal(false),
      distanceType: signal<'oblique' | 'vertical' | 'horizontal' | null>(null),
      plotOptions: vi.fn().mockReturnValue({ invert: false, startSupport: 0, endSupport: 4 }),
      plotOptionsChange: vi.fn(),
      spanAmountChoice: signal<'single' | 'double' | 'all'>('all'),
      study: signal(null),
      isStudioActive: signal(false),
      resetAll: vi.fn()
    };

    const mockLoadFormsService = {
      activeLoadTab: signal('0')
    };

    const mockObstacleFormService = {
      setExistingObstacle: vi.fn(),
      results: signal({ oblique: null, vertical: null, horizontal: null })
    };

    await TestBed.configureTestingModule({
      imports: [StudioPageComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: vi.fn().mockReturnValue('study-1') },
              queryParamMap: { get: vi.fn().mockReturnValue('section-1') }
            }
          }
        },
        { provide: PlotService, useValue: mockPlotService },
        {
          provide: StudiesService,
          useValue: { ready: new Subject<boolean>(), getStudyAsObservable: vi.fn() }
        },
        { provide: ObstacleFormService, useValue: mockObstacleFormService },
        { provide: LoadFormsService, useValue: mockLoadFormsService }
      ]
    })
      .overrideComponent(StudioPageComponent, {
        set: {
          imports: [
            DecimalPipe,
            FormsModule,
            NgxSliderModule,
            InputNumberModule,
            RadioButtonModule,
            SelectModule,
            SelectButtonModule,
            TabsModule
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(StudioPageComponent);
    fixture.detectChanges();
  });

  describe('HTML rendering - global-state-select', () => {
    it('should render global-state-select', () => {
      const el = getByTestId('global-state-select');
      expect(el).toBeTruthy();
    });
  });
});

describe('HTML rendering - distance radio buttons disabled state', () => {
  let fixture: ComponentFixture<StudioPageComponent>;
  let obstaclesService: ObstaclesService;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    const plotServiceMock = new PlotServiceMock();
    const spanServiceMock = new SpanServiceMock();
    const plotOptionsServiceMock = {
      plotOptions: vi.fn().mockReturnValue({ invert: false, startSupport: 0, endSupport: 0 }),
      isFreePositioningMode: createSignalMock<boolean>(false)
    };
    const studiesServiceMock = new StudiesServiceMock();
    const mockObstacleStateService = {
      distanceType: createSignalMock<'oblique' | 'vertical' | 'horizontal' | null>(null),
      distances: createSignalMock([])
    };
    const obstacleFormServiceMock = {
      setExistingObstacle: vi.fn(),
      clearPositions: vi.fn(),
      results: createSignalMock({ oblique: null, vertical: null, horizontal: null }),
      formValue: createSignalMock({ uuid: null })
    };
    const loadFormsServiceMock = {
      activeLoadTab: createSignalMock('0'),
      selectedSpanSupportUuid: createSignalMock(null)
    };

    await TestBed.configureTestingModule({
      imports: [StudioPageComponent],
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: vi.fn().mockReturnValue('study-1') },
              queryParamMap: { get: vi.fn().mockReturnValue('section-1') }
            }
          }
        },
        { provide: PlotService, useValue: plotServiceMock },
        { provide: PlotSpanService, useValue: spanServiceMock },
        { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
        { provide: StudiesService, useValue: studiesServiceMock },
        { provide: SectionService, useValue: {} },
        { provide: ObstacleFormService, useValue: obstacleFormServiceMock },
        { provide: ObstacleStateService, useValue: mockObstacleStateService },
        { provide: LoadFormsService, useValue: loadFormsServiceMock },
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ElementRef,
          useValue: {
            nativeElement: {
              querySelector: vi.fn().mockReturnValue(null)
            }
          }
        }
      ]
    })
      .overrideComponent(StudioPageComponent, {
        set: {
          imports: [FormsModule, RadioButtonModule, SelectModule, DecimalPipe],
          schemas: [CUSTOM_ELEMENTS_SCHEMA]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(StudioPageComponent);
    obstaclesService = TestBed.inject(ObstaclesService);
    fixture.detectChanges();
  });

  it('should render the three distance radio buttons', () => {
    expect(getByTestId('oblique-distance-radio')).toBeTruthy();
    expect(getByTestId('vertical-distance-radio')).toBeTruthy();
    expect(getByTestId('horizontal-distance-radio')).toBeTruthy();
  });

  it('should disable all distance radio buttons when no obstacle is selected', () => {
    obstaclesService.selectedObstacleUuid.set(null);
    fixture.detectChanges();

    const obliqueInput = getByTestId('oblique-distance-radio')?.querySelector(
      'input[type="radio"]'
    ) as HTMLInputElement;
    const verticalInput = getByTestId('vertical-distance-radio')?.querySelector(
      'input[type="radio"]'
    ) as HTMLInputElement;
    const horizontalInput = getByTestId('horizontal-distance-radio')?.querySelector(
      'input[type="radio"]'
    ) as HTMLInputElement;

    expect(obliqueInput?.disabled).toBe(true);
    expect(verticalInput?.disabled).toBe(true);
    expect(horizontalInput?.disabled).toBe(true);
  });

  it('should enable all distance radio buttons when an obstacle is selected', () => {
    obstaclesService.selectedObstacleUuid.set('obs-1');
    fixture.detectChanges();

    const obliqueInput = getByTestId('oblique-distance-radio')?.querySelector(
      'input[type="radio"]'
    ) as HTMLInputElement;
    const verticalInput = getByTestId('vertical-distance-radio')?.querySelector(
      'input[type="radio"]'
    ) as HTMLInputElement;
    const horizontalInput = getByTestId('horizontal-distance-radio')?.querySelector(
      'input[type="radio"]'
    ) as HTMLInputElement;

    expect(obliqueInput?.disabled).toBe(false);
    expect(verticalInput?.disabled).toBe(false);
    expect(horizontalInput?.disabled).toBe(false);
  });

  it('should disable radio buttons when obstacle is deselected', () => {
    obstaclesService.selectedObstacleUuid.set('obs-1');
    fixture.detectChanges();

    obstaclesService.selectedObstacleUuid.set(null);
    fixture.detectChanges();

    const obliqueInput = getByTestId('oblique-distance-radio')?.querySelector(
      'input[type="radio"]'
    ) as HTMLInputElement;
    expect(obliqueInput?.disabled).toBe(true);
  });
});
