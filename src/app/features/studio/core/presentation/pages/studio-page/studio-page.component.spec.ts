import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudioPageComponent } from './studio-page.component';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ElementRef } from '@angular/core';
import { PlotService } from '@features/studio/core/services/plot.service';
import { StudiesService } from '@services/studies/studies.service';
import { SectionService } from '@services/sections/section.service';
import { Section, Study } from '@core/domain';

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
  spanAmountChoice: SignalFn<'single' | 'double' | 'all'> = createSignalMock<'single' | 'double' | 'all'>('all');
  study: SignalFn<Study | null> = createSignalMock<Study | null>(null);
  section: SignalFn<Section | null> = createSignalMock<Section | null>(null);
  loading: SignalFn<boolean> = createSignalMock<boolean>(false);
  isFreePositioningMode: SignalFn<boolean> = createSignalMock<boolean>(false);
  plotOptions = jest.fn().mockReturnValue({ invert: false });
  plotOptionsChange = jest.fn();
  resetAll = jest.fn();
}

// StudiesService mock
class StudiesServiceMock {
  ready = new Subject<boolean>();
  getStudyAsObservable = jest.fn();
  setCurrentStudy = jest.fn();
}

describe('StudioPageComponent', () => {
  let component: StudioPageComponent;
  let fixture: ComponentFixture<StudioPageComponent>;
  let router: Router;
  let route: ActivatedRoute;
  let plotService: PlotServiceMock;
  let studiesService: StudiesServiceMock;
  let sectionService: jest.Mocked<SectionService>;

  beforeEach(async () => {
    plotService = new PlotServiceMock();
    studiesService = new StudiesServiceMock();
    sectionService = {} as unknown as jest.Mocked<SectionService>;

    await TestBed.configureTestingModule({
      imports: [StudioPageComponent],
      providers: [
        { provide: Router, useValue: { navigate: jest.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: jest.fn().mockReturnValue('study-1') },
              queryParamMap: { get: jest.fn().mockReturnValue('section-1') }
            }
          }
        },
        { provide: PlotService, useValue: plotService },
        { provide: StudiesService, useValue: studiesService },
        { provide: SectionService, useValue: sectionService },
        {
          provide: ElementRef,
          useValue: {
            nativeElement: {
              querySelector: jest.fn().mockReturnValue(null) // prevent ResizeObserver branch
            }
          }
        }
      ]
    })
      .overrideComponent(StudioPageComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(StudioPageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    route = TestBed.inject(ActivatedRoute);
  });

  afterEach(() => {
    jest.useRealTimers();
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
    (route.snapshot.paramMap.get as jest.Mock).mockReturnValueOnce(null);

    component.ngOnInit();
    expect(router.navigate).toHaveBeenCalledWith(['/studies']);
  });

  it('ngOnInit should load study and section, then set plot options', () => {
    const studyUuid = 'study-1';
    const sectionUuid = 'section-1';
    (route.snapshot.paramMap.get as jest.Mock).mockReturnValue(studyUuid);
    (route.snapshot.queryParamMap.get as jest.Mock).mockReturnValue(sectionUuid);

    const study = {
      sections: [
        { uuid: 'other', supports: [1] },
        { uuid: sectionUuid, supports: [1, 2, 3] }
      ]
    } as unknown as Study;

    (studiesService.getStudyAsObservable as jest.Mock).mockReturnValue(of(study));

    const sectionSetSpy = jest.spyOn(plotService.section, 'set');
    const studySetSpy = jest.spyOn(plotService.study, 'set');

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
    (route.snapshot.paramMap.get as jest.Mock).mockReturnValue('study-1');
    (route.snapshot.queryParamMap.get as jest.Mock).mockReturnValue('missing-section');

    const study = {
      sections: [{ uuid: 'a', supports: [1] }]
    } as unknown as Study;
    (studiesService.getStudyAsObservable as jest.Mock).mockReturnValue(of(study));

    component.ngOnInit();
    studiesService.ready.next(true);

    // Wait for async operations
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/studies']);
  });

  it('debounceUpdateSliderOptions should call plotOptionsChange after delay', () => {
    jest.useFakeTimers();
    component.debounceUpdateSliderOptions('startSupport', 1);
    expect(plotService.plotOptionsChange).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);
    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 1
    });
  });

  it('debounceUpdateSliderOptions should set supports to single when diff is 1', () => {
    jest.useFakeTimers();
    plotService.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 2,
      endSupport: 3
    });

    component.debounceUpdateSliderOptions('endSupport', 3);
    jest.advanceTimersByTime(300);

    expect(plotService.spanAmountChoice()).toBe('single');
  });

  it('debounceUpdateSliderOptions should set spanAmountChoice to double when diff is 2', () => {
    jest.useFakeTimers();
    plotService.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 1,
      endSupport: 3
    });

    component.debounceUpdateSliderOptions('endSupport', 3);
    jest.advanceTimersByTime(300);

    expect(plotService.spanAmountChoice()).toBe('double');
  });

  it('sliderOptions translate callback should return value + 1 as string', () => {
    const translate = component.sliderOptions().translate;
    expect(translate!(0, 0)).toBe('1');
    expect(translate!(4, 0)).toBe('5');
  });

  it('ngOnInit should navigate when study is null', () => {
    (route.snapshot.paramMap.get as jest.Mock).mockReturnValue('study-1');
    (route.snapshot.queryParamMap.get as jest.Mock).mockReturnValue('section-1');

    (studiesService.getStudyAsObservable as jest.Mock).mockReturnValue(of(null));

    component.ngOnInit();
    studiesService.ready.next(true);
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/studies']);
  });

  it('updateSliderOptions should debounce startSupport changes', () => {
    jest.useFakeTimers();
    plotService.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 0,
      endSupport: 3
    });

    component.updateSliderOptions({ value: 1, highValue: 3 });

    jest.advanceTimersByTime(300);

    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 1
    });
  });

  it('updateSliderOptions should debounce endSupport changes', () => {
    jest.useFakeTimers();
    plotService.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 0,
      endSupport: 3
    });

    component.updateSliderOptions({ value: 0, highValue: 5 });

    jest.advanceTimersByTime(300);

    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      endSupport: 5
    });
  });

  it('updateSliderOptions should not call debounce when values unchanged', () => {
    jest.useFakeTimers();
    plotService.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 0,
      endSupport: 3
    });

    component.updateSliderOptions({ value: 0, highValue: 3 });

    jest.advanceTimersByTime(300);

    expect(plotService.plotOptionsChange).not.toHaveBeenCalled();
  });

  it('onSelectSpanAmount should set single span offset', () => {
    plotService.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 1,
      endSupport: 5
    });
    plotService.section.set({
      supports: [1, 2, 3, 4, 5, 6]
    } as unknown as Section);

    component.onSelectSpanAmount('single');

    expect(plotService.spanAmountChoice()).toBe('single');
    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      endSupport: 2
    });
  });

  it('onSelectSpanAmount should set double span offset', () => {
    plotService.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 1,
      endSupport: 5
    });
    plotService.section.set({
      supports: [1, 2, 3, 4, 5, 6]
    } as unknown as Section);

    component.onSelectSpanAmount('double');

    expect(plotService.spanAmountChoice()).toBe('double');
    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      endSupport: 3
    });
  });

  it('onSelectSpanAmount should reset to all supports', () => {
    plotService.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 1,
      endSupport: 3
    });
    plotService.section.set({
      supports: [1, 2, 3, 4, 5, 6]
    } as unknown as Section);

    component.onSelectSpanAmount('all');

    expect(plotService.spanAmountChoice()).toBe('all');
    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 0,
      endSupport: 5
    });
  });

  it('onSelectSpanAmount single should clamp to maxSupport', () => {
    plotService.plotOptions.mockReturnValue({
      invert: false,
      startSupport: 4,
      endSupport: 5
    });
    plotService.section.set({
      supports: [1, 2, 3, 4, 5]
    } as unknown as Section);

    component.onSelectSpanAmount('single');

    expect(plotService.plotOptionsChange).toHaveBeenCalledWith({
      endSupport: 4
    });
  });

  it('onSupportButtonClick right should increment supports', () => {
    plotService.spanAmountChoice.set('single');
    plotService.plotOptions.mockReturnValue({
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
    plotService.spanAmountChoice.set('double');
    plotService.plotOptions.mockReturnValue({
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
    plotService.spanAmountChoice.set('single');
    plotService.plotOptions.mockReturnValue({
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
    plotService.plotOptions.mockReturnValue({
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
    plotService.plotOptions.mockReturnValue({
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
    plotService.plotOptions.mockReturnValue({
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

  it('ngOnDestroy should clean up subscription and reset plot service', () => {
    const unsubscribe = jest.fn();
    (component as unknown as { subscription: { unsubscribe: () => void } }).subscription = { unsubscribe };

    component.ngOnDestroy();

    expect(plotService.resetAll).toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalled();
  });

  describe('UC: studio page initialization and navigation', () => {
    it('UC-SP1: should redirect to studies when route params are missing', () => {
      (route.snapshot.paramMap.get as jest.Mock).mockReturnValueOnce(null);
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
});
