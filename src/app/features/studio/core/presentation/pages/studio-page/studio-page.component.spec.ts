import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import { PlotResolutionService } from '@services/plot/plot-resolution.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { StudiesService } from '@services/studies/studies.service';
import { SectionService } from '@services/section/section.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { LoadFormsService } from '@features/studio/loads/presentation/services/loadForms.service';
import { Section, Study } from '@shared/domain';
import { Camera } from 'plotly.js-dist-min';
import { ScalingFactors, StudioViewCamera, StudioViewState } from '@shared/types/plot.types';
import { StudioViewPersistenceService } from '@services/plot/studio-view-persistence.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { SectionStateReportService } from '@features/studio/toolbar/presentation/services/section-state-report/section-state-report.service';

import { TranslocoModule, TranslocoTestingModule } from '@jsverse/transloco';
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
  litData = signal<{ output_parameters?: { parameter?: number[]; utilization_rate?: number[] } } | null>(null);
  loading: SignalFn<boolean> = createSignalMock<boolean>(false);
  section = signal<Section | null>(null);
  plotOptions = vi.fn().mockReturnValue({ invert: false, startSupport: 0, endSupport: 4 });
  plotOptionsChange = vi.fn();
  resetAll = vi.fn();
  workerReady: SignalFn<boolean> = createSignalMock<boolean>(true);
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
  updateStudy = vi.fn().mockResolvedValue(undefined);
}

describe('StudioPageComponent', () => {
  let component: StudioPageComponent;
  let fixture: ComponentFixture<StudioPageComponent>;
  let router: Router;
  let route: ActivatedRoute;
  let plotService: PlotServiceMock;
  let spanService: SpanServiceMock;
  let plotOptionsServiceMock: {
    plotOptions: ReturnType<typeof vi.fn>;
    isFreePositioningMode: SignalFn<boolean>;
    camera: SignalFn<Camera | null>;
    pendingCameraRestore: SignalFn<Camera | null>;
    setScalingFactors: ReturnType<typeof vi.fn>;
    scalingFactors: SignalFn<ScalingFactors>;
    getCamera: ReturnType<typeof vi.fn>;
  };
  let studiesService: StudiesServiceMock;
  let mockResolutionService: {
    resolution: SignalFn<number>;
    setResolution: ReturnType<typeof vi.fn>;
    applyResolution: ReturnType<typeof vi.fn>;
  };
  let mockPersistenceService: {
    save: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let sectionService: vi.Mocked<SectionService>;
  let obstaclesService: ObstaclesService;
  let obstacleFormService: vi.Mocked<ObstacleFormService>;
  let mockObstacleStateService: { distanceType: SignalFn<'oblique' | 'vertical' | 'horizontal' | null> };
  let mockNotificationService: { warning: ReturnType<typeof vi.fn> };
  let mockSectionStateReportService: { generateReport: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    plotService = new PlotServiceMock();
    spanService = new SpanServiceMock();
    plotOptionsServiceMock = {
      plotOptions: vi.fn().mockReturnValue({ invert: false }),
      isFreePositioningMode: createSignalMock<boolean>(false),
      camera: createSignalMock<Camera | null>(null),
      pendingCameraRestore: createSignalMock<Camera | null>(null),
      setScalingFactors: vi.fn(),
      scalingFactors: createSignalMock<ScalingFactors>({ x: 1, y: 1, z: 1, aspectMode: 'data' }),
      getCamera: vi.fn().mockReturnValue(null)
    };
    studiesService = new StudiesServiceMock();
    mockResolutionService = {
      resolution: createSignalMock<number>(100),
      setResolution: vi.fn(),
      applyResolution: vi.fn().mockResolvedValue(undefined)
    };
    mockPersistenceService = {
      save: vi.fn(),
      load: vi.fn().mockReturnValue(null),
      remove: vi.fn()
    };
    sectionService = {} as unknown as vi.Mocked<SectionService>;
    obstacleFormService = {
      setExistingObstacle: vi.fn(),
      clearPositions: vi.fn()
    } as unknown as vi.Mocked<ObstacleFormService>;
    mockObstacleStateService = { distanceType: createSignalMock<'oblique' | 'vertical' | 'horizontal' | null>(null) };
    mockNotificationService = { warning: vi.fn() };
    mockSectionStateReportService = { generateReport: vi.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'studio.studio-page.add-charge-case-label': 'Add a charge case',
              'studio.studio-page.all-option': 'All',
              'studio.studio-page.cable-length-change-label': 'Cable length change',
              'studio.studio-page.cable-manip-span-label': 'Cable manip. at span',
              'studio.studio-page.cable-manip-support-label': 'Cable manip. at support',
              'studio.studio-page.climate-condition-label': 'Climate condition',
              'studio.studio-page.distances-label': 'Distances',
              'studio.shared.horizontal': 'Horizontal',
              'studio.studio-page.load-marking-label': 'Load / Marking',
              'studio.studio-page.max-section-option': 'Max section',
              'studio.studio-page.next-support-aria-label': 'Next support',
              'studio.studio-page.no-charge-case-message': 'In order to add charges, you need to create a charge case.',
              'studio.quick-measures.not-selected-option': 'Not selected',
              'studio.shared.oblique': 'Oblique',
              'studio.studio-page.one-span-option': 'One span',
              'studio.studio-page.parameter-label': 'Parameter',
              'studio.quick-measures.point-option': 'Point {{ index }}',
              'studio.studio-page.previous-support-aria-label': 'Previous support',
              'studio.quick-measures.select-obstacle-aria-label': 'select an obstacle',
              'studio.quick-measures.select-obstacle-point-aria-label': "select an obstacle's point",
              'studio.studio-page.span-option': 'Span',
              'studio.studio-page.strand-cut-aria-label': 'strand is cut',
              'studio.studio-page.strand-not-cut-aria-label': 'strand is not cut',
              'studio.studio-page.two-spans-option': 'Two spans',
              'studio.shared.vertical': 'Vertical',
              'studio.studio-page.working-load-at-risk-aria-label': 'working load is at risk',
              'studio.studio-page.working-load-fine-aria-label': 'working load is fine',
              'studio.studio-page.working-load-label': 'Working load',
              'studio.studio-page.working-load-too-high-aria-label': 'working load is too high',
              'studio.studio-page.working-load-unknown-aria-label': 'working load is unknown'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        StudioPageComponent
      ],
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
        { provide: PlotResolutionService, useValue: mockResolutionService },
        { provide: StudiesService, useValue: studiesService },
        { provide: SectionService, useValue: sectionService },
        { provide: ObstacleFormService, useValue: obstacleFormService },
        { provide: ObstacleStateService, useValue: mockObstacleStateService },
        { provide: StudioViewPersistenceService, useValue: mockPersistenceService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: SectionStateReportService, useValue: mockSectionStateReportService },
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
      startSupport: 1,
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
      startSupport: 1,
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

  it('onSelectSpanAmount single should clamp to maxSupport and pull startSupport back', () => {
    // startSupport at last index → endSupport would overflow → startSupport must be adjusted
    plotOptionsServiceMock.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 4,
      endSupport: 4
    });
    spanService.section.set({
      supports: [1, 2, 3, 4, 5]
    } as unknown as Section);

    component.onSelectSpanAmount('single');

    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 3,
      endSupport: 4
    });
  });

  describe('onSelectSpanAmount - range clamping', () => {
    it('should pull startSupport backward when selecting double from the last single span', () => {
      // 5 supports → maxSupport=4. Last span: startSupport=3, endSupport=4.
      // Selecting double: endSupport=min(3+2,4)=4, startSupport=max(4-2,0)=2.
      plotOptionsServiceMock.plotOptions.mockReturnValue({
        invert: false,
        startSupport: 3,
        endSupport: 4
      });
      spanService.section.set({ supports: [1, 2, 3, 4, 5] } as unknown as Section);

      component.onSelectSpanAmount('double');

      expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
        startSupport: 2,
        endSupport: 4
      });
    });

    it('should pull startSupport backward when selecting double from second-to-last position at boundary', () => {
      // 4 supports → maxSupport=3. startSupport=2, endSupport=3.
      // Selecting double: endSupport=min(2+2,3)=3, startSupport=max(3-2,0)=1.
      plotOptionsServiceMock.plotOptions.mockReturnValue({
        invert: false,
        startSupport: 2,
        endSupport: 3
      });
      spanService.section.set({ supports: [1, 2, 3, 4] } as unknown as Section);

      component.onSelectSpanAmount('double');

      expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
        startSupport: 1,
        endSupport: 3
      });
    });

    it('should not move startSupport when there is room for the double span', () => {
      // 6 supports → maxSupport=5. startSupport=1 → room for double span.
      plotOptionsServiceMock.plotOptions.mockReturnValue({
        invert: false,
        startSupport: 1,
        endSupport: 2
      });
      spanService.section.set({ supports: [1, 2, 3, 4, 5, 6] } as unknown as Section);

      component.onSelectSpanAmount('double');

      expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
        startSupport: 1,
        endSupport: 3
      });
    });

    it('should clamp to section bounds when section has fewer supports than the requested span count', () => {
      // 2 supports → maxSupport=1. Only 1 span exists, cannot fit 2 spans.
      // endSupport=min(0+2,1)=1, startSupport=max(1-2,0)=0.
      plotOptionsServiceMock.plotOptions.mockReturnValue({
        invert: false,
        startSupport: 0,
        endSupport: 1
      });
      spanService.section.set({ supports: [1, 2] } as unknown as Section);

      component.onSelectSpanAmount('double');

      expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
        startSupport: 0,
        endSupport: 1
      });
    });
  });

  describe('sliderOptions - range constraints', () => {
    it('should set noSwitching to true to prevent end handle from crossing start handle', () => {
      expect(component.sliderOptions().noSwitching).toBe(true);
    });

    it('should set minRange to 1 to prevent start and end from landing on the same support', () => {
      expect(component.sliderOptions().minRange).toBe(1);
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
    obstaclesService.selectedMeasureUuid.set('obs-1');
    obstaclesService.activePointIndex.set(2);

    component.ngOnDestroy();

    expect(plotService.resetAll).toHaveBeenCalled();
    expect(plotService.isStudioActive()).toBe(false);
    expect(obstaclesService.selectedMeasureUuid()).toBeNull();
    expect(obstaclesService.activePointIndex()).toBeNull();
    // study is null → saveViewState does not call updateStudy
    expect(studiesService.updateStudy).not.toHaveBeenCalled();
  });

  describe('saveViewState()', () => {
    const sectionUuid = 'section-1';
    const baseStudy = {
      uuid: 'study-1',
      author_email: 'test@test.com',
      sections: [{ uuid: sectionUuid, supports: [1, 2, 3, 4], obstacles: [] }]
    } as unknown as Study;

    beforeEach(() => {
      (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
      (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue(sectionUuid);
      studiesService.getStudyAsObservable.mockReturnValue(of(baseStudy));
      component.ngOnInit();
      studiesService.ready.next(true);
      fixture.detectChanges();
      // At this point plotService.study() is set and activeSectionUuid is populated
    });

    it('should call updateStudy with studioViewState on the active section', () => {
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 1, endSupport: 3 });
      const mockCam: StudioViewCamera = {
        eye: { x: 0.02, y: -3.5, z: 0.2 },
        center: { x: 0, y: 0, z: 0 },
        up: { x: 0, y: 0, z: 1 }
      };
      plotOptionsServiceMock.camera.set(mockCam);
      const savedScaling: ScalingFactors = { x: 1, y: 1, z: 0.5, aspectMode: 'manual' };
      plotOptionsServiceMock.scalingFactors.set(savedScaling);
      mockResolutionService.resolution.set(75);

      component.ngOnDestroy();

      expect(studiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: sectionUuid,
              studio_view_state: {
                camera: mockCam,
                scalingFactors: savedScaling,
                resolution: 75,
                startSupport: 1,
                endSupport: 3
              }
            })
          ])
        }),
        true
      );
    });

    it('should set camera to null in studioViewState when camera signal is null', () => {
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 0, endSupport: 3 });
      plotOptionsServiceMock.camera.set(null);

      component.ngOnDestroy();

      const updatedStudy = (studiesService.updateStudy as vi.Mock).mock.calls[0][0];
      const savedState = updatedStudy.sections.find((s: { uuid: string }) => s.uuid === sectionUuid)
        ?.studio_view_state as StudioViewState;
      expect(savedState.camera).toBeNull();
    });

    it('should not call updateStudy when study is null', () => {
      plotService.study.set(null);
      // Reset call count from beforeEach initialization
      (studiesService.updateStudy as vi.Mock).mockClear();

      component.ngOnDestroy();

      expect(studiesService.updateStudy).not.toHaveBeenCalled();
    });

    it('should save to localStorage via persistenceService.save on exit', () => {
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 0, endSupport: 3 });
      mockPersistenceService.save.mockClear();

      component.ngOnDestroy();

      expect(mockPersistenceService.save).toHaveBeenCalledWith(sectionUuid, expect.any(Object));
    });

    it('should save camera signal value to localStorage on exit', () => {
      // Simulate: user rotated the camera — camera() signal reflects the live position
      const liveCam: StudioViewCamera = {
        eye: { x: 2, y: 1, z: 0.5 },
        center: { x: 0, y: 0, z: 0 },
        up: { x: 0, y: 0, z: 1 }
      };
      plotOptionsServiceMock.camera.set(liveCam);
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 0, endSupport: 3 });
      mockPersistenceService.save.mockClear();

      component.ngOnDestroy();

      expect(mockPersistenceService.save).toHaveBeenCalledWith(
        sectionUuid,
        expect.objectContaining({ camera: liveCam })
      );
    });
  });

  describe('ngOnInit – studioViewState restoration', () => {
    it('should restore startSupport, endSupport, camera, scalingFactors and resolution', () => {
      (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
      (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue('section-1');

      const savedCamera: StudioViewCamera = {
        eye: { x: 1, y: 2, z: 3 },
        center: { x: 0, y: 0, z: 0 },
        up: { x: 0, y: 0, z: 1 }
      };
      const savedScaling: ScalingFactors = { x: 1, y: 1, z: 0.5, aspectMode: 'manual' };
      const studioViewState: StudioViewState = {
        camera: savedCamera,
        scalingFactors: savedScaling,
        resolution: 75,
        startSupport: 1,
        endSupport: 3
      };
      const study = {
        sections: [{ uuid: 'section-1', supports: [1, 2, 3, 4], obstacles: [], studio_view_state: studioViewState }]
      } as unknown as Study;

      studiesService.getStudyAsObservable.mockReturnValue(of(study));
      const cameraSpy = vi.spyOn(plotOptionsServiceMock.camera, 'set');
      const pendingCameraRestoreSpy = vi.spyOn(plotOptionsServiceMock.pendingCameraRestore, 'set');

      component.ngOnInit();
      studiesService.ready.next(true);
      fixture.detectChanges();

      expect(plotService.plotOptionsChange).toHaveBeenCalledWith({ startSupport: 1, endSupport: 3 });
      expect(cameraSpy).toHaveBeenCalledWith(savedCamera);
      expect(pendingCameraRestoreSpy).toHaveBeenCalledWith(savedCamera);
      expect(plotOptionsServiceMock.setScalingFactors).toHaveBeenCalledWith(savedScaling);
      expect(mockResolutionService.setResolution).toHaveBeenCalledWith(75);
    });

    it('should fall back to 0/maxSupport when studioViewState is absent', () => {
      (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
      (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue('section-1');

      const study = {
        sections: [{ uuid: 'section-1', supports: [1, 2, 3], obstacles: [] }]
      } as unknown as Study;

      studiesService.getStudyAsObservable.mockReturnValue(of(study));

      component.ngOnInit();
      studiesService.ready.next(true);
      fixture.detectChanges();

      expect(plotService.plotOptionsChange).toHaveBeenCalledWith({ startSupport: 0, endSupport: 2 });
      expect(plotOptionsServiceMock.setScalingFactors).not.toHaveBeenCalled();
      expect(mockResolutionService.setResolution).not.toHaveBeenCalled();
    });

    it('should clamp startSupport/endSupport when out of bounds', () => {
      (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
      (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue('section-1');

      const studioViewState: StudioViewState = { startSupport: 10, endSupport: 20 };
      const study = {
        sections: [{ uuid: 'section-1', supports: [1, 2, 3], obstacles: [], studio_view_state: studioViewState }]
      } as unknown as Study;

      studiesService.getStudyAsObservable.mockReturnValue(of(study));

      component.ngOnInit();
      studiesService.ready.next(true);
      fixture.detectChanges();

      expect(plotService.plotOptionsChange).toHaveBeenCalledWith({ startSupport: 0, endSupport: 2 });
    });

    it('should call applyResolution with saved resolution when studioViewState has resolution', () => {
      (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
      (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue('section-1');

      const studioViewState: StudioViewState = { resolution: 75, startSupport: 0, endSupport: 2 };
      const study = {
        sections: [{ uuid: 'section-1', supports: [1, 2, 3], obstacles: [], studio_view_state: studioViewState }]
      } as unknown as Study;

      studiesService.getStudyAsObservable.mockReturnValue(of(study));

      component.ngOnInit();
      studiesService.ready.next(true);
      fixture.detectChanges();

      expect(mockResolutionService.applyResolution).toHaveBeenCalledWith(75);
    });

    it('should not call applyResolution when studioViewState has no resolution', () => {
      (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
      (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue('section-1');

      const studioViewState: StudioViewState = { startSupport: 0, endSupport: 2 };
      const study = {
        sections: [{ uuid: 'section-1', supports: [1, 2, 3], obstacles: [], studio_view_state: studioViewState }]
      } as unknown as Study;

      studiesService.getStudyAsObservable.mockReturnValue(of(study));

      component.ngOnInit();
      studiesService.ready.next(true);
      fixture.detectChanges();

      expect(mockResolutionService.applyResolution).not.toHaveBeenCalled();
    });

    it('should not call applyResolution when studioViewState is absent', () => {
      (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
      (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue('section-1');

      const study = {
        sections: [{ uuid: 'section-1', supports: [1, 2, 3], obstacles: [] }]
      } as unknown as Study;

      studiesService.getStudyAsObservable.mockReturnValue(of(study));

      component.ngOnInit();
      studiesService.ready.next(true);
      fixture.detectChanges();

      expect(mockResolutionService.applyResolution).not.toHaveBeenCalled();
    });
    it('should not set camera when studioViewState.camera is absent', () => {
      (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
      (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue('section-1');

      const studioViewState: StudioViewState = { startSupport: 0, endSupport: 2 };
      const study = {
        sections: [{ uuid: 'section-1', supports: [1, 2, 3], obstacles: [], studio_view_state: studioViewState }]
      } as unknown as Study;

      studiesService.getStudyAsObservable.mockReturnValue(of(study));
      const cameraSpy = vi.spyOn(plotOptionsServiceMock.camera, 'set');

      component.ngOnInit();
      studiesService.ready.next(true);
      fixture.detectChanges();

      expect(cameraSpy).not.toHaveBeenCalled();
    });
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

  describe('ngOnInit – localStorage restore priority', () => {
    it('should prefer localStorage state over section.studio_view_state when both exist', () => {
      (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
      (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue('section-1');

      const dexieState: StudioViewState = { startSupport: 0, endSupport: 2 };
      const localStorageState: StudioViewState = { startSupport: 1, endSupport: 3 };
      mockPersistenceService.load.mockReturnValue(localStorageState);

      const study = {
        sections: [{ uuid: 'section-1', supports: [1, 2, 3, 4], obstacles: [], studio_view_state: dexieState }]
      } as unknown as Study;
      studiesService.getStudyAsObservable.mockReturnValue(of(study));

      component.ngOnInit();
      studiesService.ready.next(true);
      fixture.detectChanges();

      // localStorage wins over Dexie
      expect(plotService.plotOptionsChange).toHaveBeenCalledWith({ startSupport: 1, endSupport: 3 });
    });

    it('should fall back to section.studio_view_state when localStorage returns null', () => {
      (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
      (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue('section-1');

      const dexieState: StudioViewState = { startSupport: 0, endSupport: 2 };
      mockPersistenceService.load.mockReturnValue(null);

      const study = {
        sections: [{ uuid: 'section-1', supports: [1, 2, 3, 4], obstacles: [], studio_view_state: dexieState }]
      } as unknown as Study;
      studiesService.getStudyAsObservable.mockReturnValue(of(study));

      component.ngOnInit();
      studiesService.ready.next(true);
      fixture.detectChanges();

      expect(plotService.plotOptionsChange).toHaveBeenCalledWith({ startSupport: 0, endSupport: 2 });
    });

    it('should call persistenceService.load with the sectionUuid', () => {
      (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
      (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue('section-1');

      const study = {
        sections: [{ uuid: 'section-1', supports: [1, 2, 3], obstacles: [] }]
      } as unknown as Study;
      studiesService.getStudyAsObservable.mockReturnValue(of(study));

      component.ngOnInit();
      studiesService.ready.next(true);
      fixture.detectChanges();

      expect(mockPersistenceService.load).toHaveBeenCalledWith('section-1');
    });
  });

  describe('continuous localStorage save', () => {
    it('should not save before isViewReady is true', () => {
      // Do not call ngOnInit → isViewReady stays false, activeSectionUuid stays null
      mockPersistenceService.save.mockClear();
      fixture.detectChanges();

      expect(mockPersistenceService.save).not.toHaveBeenCalled();
    });

    it('should save to localStorage immediately once view is ready — no timer needed', () => {
      (route.snapshot.paramMap.get as vi.Mock).mockReturnValue('study-1');
      (route.snapshot.queryParamMap.get as vi.Mock).mockReturnValue('section-1');

      const study = {
        sections: [{ uuid: 'section-1', supports: [1, 2, 3], obstacles: [] }]
      } as unknown as Study;
      studiesService.getStudyAsObservable.mockReturnValue(of(study));

      mockPersistenceService.save.mockClear();

      // The effect saves as soon as isViewReady becomes true, without any timer
      component.ngOnInit();
      studiesService.ready.next(true);
      fixture.detectChanges();

      expect(mockPersistenceService.save).toHaveBeenCalledWith('section-1', expect.any(Object));
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
      plotService.litData.set({ output_parameters: { parameter: [] } });
      expect(component.globalParameter()).toBeNull();
    });

    it('should return the max value across all spans in max_section mode', () => {
      component.globalState.set('max_section');
      plotService.litData.set({ output_parameters: { parameter: [100, 250.789, 180] } });
      expect(component.globalParameter()).toBe(250.7);
    });

    it('should return the middle span value in span mode', () => {
      component.globalState.set('span');
      // startSupport=0, endSupport=4 → findMiddleSpan(0,4) = [2,3] → middleSpanIndex=2
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 0, endSupport: 4 });
      plotService.litData.set({ output_parameters: { parameter: [100, 150, 200, 250, 300] } });
      expect(component.globalParameter()).toBe(200);
    });

    it('should return null when middle span index is out of bounds in span mode', () => {
      component.globalState.set('span');
      // startSupport=8, endSupport=10 → findMiddleSpan(8,10) = [9,10] → index 9 is out of bounds
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 8, endSupport: 10 });
      plotService.litData.set({ output_parameters: { parameter: [100, 150] } });
      expect(component.globalParameter()).toBeNull();
    });

    it('should return the same span value for a single span in span mode', () => {
      component.globalState.set('span');
      // startSupport=2, endSupport=3 → findMiddleSpan(2,3) = [2,3] → middleSpanIndex=2
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 2, endSupport: 3 });
      plotService.litData.set({ output_parameters: { parameter: [100, 150, 200, 250] } });
      expect(component.globalParameter()).toBe(200);
    });

    it('should truncate to 1 decimal place', () => {
      component.globalState.set('max_section');
      plotService.litData.set({ output_parameters: { parameter: [123.4567] } });
      expect(component.globalParameter()).toBe(123.4);
    });

    it('should recompute when globalState changes', () => {
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 0, endSupport: 4 });
      plotService.litData.set({ output_parameters: { parameter: [10, 20, 30, 40, 50] } });

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
      plotService.litData.set({ output_parameters: { utilization_rate: [] } });
      expect(component.globalStressRate()).toBeNull();
    });

    it('should return the max value across all spans in max_section mode', () => {
      component.globalState.set('max_section');
      plotService.litData.set({ output_parameters: { utilization_rate: [40, 90.456, 65] } });
      expect(component.globalStressRate()).toBe(90.46);
    });

    it('should return the middle span value in span mode', () => {
      component.globalState.set('span');
      // startSupport=0, endSupport=4 → findMiddleSpan(0,4) = [2,3] → middleSpanIndex=2
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 0, endSupport: 4 });
      plotService.litData.set({ output_parameters: { utilization_rate: [40, 55, 70, 85, 95] } });
      expect(component.globalStressRate()).toBe(70);
    });

    it('should recompute when globalState changes', () => {
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 0, endSupport: 4 });
      plotService.litData.set({ output_parameters: { utilization_rate: [10, 20, 30, 40, 50] } });

      component.globalState.set('max_section');
      expect(component.globalStressRate()).toBe(50);

      component.globalState.set('span');
      // findMiddleSpan(0,4) = [2,3] → index 2 → 30
      expect(component.globalStressRate()).toBe(30);
    });
  });

  describe('onGenerateReport', () => {
    it('should warn and not generate when there is no computed data', async () => {
      spanService.section.set({ supports: [] } as unknown as Section);
      plotService.litData.set(null);

      await component.onGenerateReport();

      expect(mockNotificationService.warning).toHaveBeenCalled();
      expect(mockSectionStateReportService.generateReport).not.toHaveBeenCalled();
    });

    it('should build the report data and delegate to the report service', async () => {
      plotOptionsServiceMock.plotOptions.mockReturnValue({ startSupport: 0, endSupport: 1 });
      spanService.section.set({
        name: 'Section A',
        comment: 'A comment',
        supports: [{ number: '1' }, { number: '2' }],
        initial_conditions: [{ uuid: 'ic-1', name: 'IC 1' }],
        selected_initial_condition_uuid: 'ic-1',
        charges: [{ uuid: 'ch-1', name: 'Charge 1', description: 'desc' }],
        selected_charge_uuid: 'ch-1'
      } as unknown as Section);
      plotService.litData.set({ output_parameters: { parameter: [10, 20], utilization_rate: [30, 40] } });

      await component.onGenerateReport();

      expect(mockNotificationService.warning).not.toHaveBeenCalled();
      expect(mockSectionStateReportService.generateReport).toHaveBeenCalledTimes(1);
      const data = mockSectionStateReportService.generateReport.mock.calls[0][0];
      expect(data.sectionName).toBe('Section A');
      expect(data.chargeName).toBe('Charge 1');
      expect(data.icName).toBe('IC 1');
      expect(data.maxParameter).toBe(20);
      expect(data.maxStressRate).toBe(40);
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
      resetAll: vi.fn(),
      workerReady: signal(true)
    };

    const mockLoadFormsService = {
      activeLoadTab: signal('0')
    };

    const mockObstacleFormService = {
      setExistingObstacle: vi.fn(),
      clearPositions: vi.fn(),
      results: signal({ oblique: null, vertical: null, horizontal: null })
    };

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'studio.studio-page.add-charge-case-label': 'Add a charge case',
              'studio.studio-page.all-option': 'All',
              'studio.studio-page.cable-length-change-label': 'Cable length change',
              'studio.studio-page.cable-manip-span-label': 'Cable manip. at span',
              'studio.studio-page.cable-manip-support-label': 'Cable manip. at support',
              'studio.studio-page.climate-condition-label': 'Climate condition',
              'studio.studio-page.distances-label': 'Distances',
              'studio.shared.horizontal': 'Horizontal',
              'studio.studio-page.load-marking-label': 'Load / Marking',
              'studio.studio-page.max-section-option': 'Max section',
              'studio.studio-page.next-support-aria-label': 'Next support',
              'studio.studio-page.no-charge-case-message': 'In order to add charges, you need to create a charge case.',
              'studio.quick-measures.not-selected-option': 'Not selected',
              'studio.shared.oblique': 'Oblique',
              'studio.studio-page.one-span-option': 'One span',
              'studio.studio-page.parameter-label': 'Parameter',
              'studio.quick-measures.point-option': 'Point {{ index }}',
              'studio.studio-page.previous-support-aria-label': 'Previous support',
              'studio.quick-measures.select-obstacle-aria-label': 'select an obstacle',
              'studio.quick-measures.select-obstacle-point-aria-label': "select an obstacle's point",
              'studio.studio-page.span-option': 'Span',
              'studio.studio-page.strand-cut-aria-label': 'strand is cut',
              'studio.studio-page.strand-not-cut-aria-label': 'strand is not cut',
              'studio.studio-page.two-spans-option': 'Two spans',
              'studio.shared.vertical': 'Vertical',
              'studio.studio-page.working-load-at-risk-aria-label': 'working load is at risk',
              'studio.studio-page.working-load-fine-aria-label': 'working load is fine',
              'studio.studio-page.working-load-label': 'Working load',
              'studio.studio-page.working-load-too-high-aria-label': 'working load is too high',
              'studio.studio-page.working-load-unknown-aria-label': 'working load is unknown'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        StudioPageComponent
      ],
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
            TranslocoModule,
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
