import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudioPageComponent } from './studio-page.component';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ElementRef } from '@angular/core';
import { PlotService } from './plot.service';
import { StudiesService } from '@core/services/studies/studies.service';

interface Section {
  uuid: string;
  supports: number[];
}
interface Study {
  sections: Section[];
}

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
  study: SignalFn<Study | null> = createSignalMock<Study | null>(null);
  section: SignalFn<Section | null> = createSignalMock<Section | null>(null);
  loading: SignalFn<boolean> = createSignalMock<boolean>(false);
  plotOptions = jest.fn().mockReturnValue({ invert: false });
  plotOptionsChange = jest.fn();
}

// StudiesService mock
class StudiesServiceMock {
  ready = new Subject<boolean>();
  getStudyAsObservable = jest.fn();
}

describe('StudioPageComponent', () => {
  let component: StudioPageComponent;
  let fixture: ComponentFixture<StudioPageComponent>;
  let router: Router;
  let route: ActivatedRoute;
  let plotService: PlotServiceMock;
  let studiesService: StudiesServiceMock;

  beforeEach(async () => {
    plotService = new PlotServiceMock();
    studiesService = new StudiesServiceMock();

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

  it('should create', () => {
    expect(component).toBeTruthy();
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
    expect(component.sliderOptions().ceil).toBe(99);
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
    (route.snapshot.queryParamMap.get as jest.Mock).mockReturnValue(
      sectionUuid
    );

    const study: Study = {
      sections: [
        { uuid: 'other', supports: [1] },
        { uuid: sectionUuid, supports: [1, 2, 3] }
      ]
    };

    (studiesService.getStudyAsObservable as jest.Mock).mockReturnValue(
      of(study)
    );

    const sectionSetSpy = jest.spyOn(plotService.section, 'set');

    component.ngOnInit();

    // Emit ready
    studiesService.ready.next(true);

    expect(typeof plotService.study.set).toBe('function');
    expect(sectionSetSpy).toHaveBeenCalledWith(study.sections[1]);
    expect(plotService.plotOptionsChange).toHaveBeenCalledWith('endSupport', 2);
  });

  it('ngOnInit should navigate if section not found', () => {
    (route.snapshot.paramMap.get as jest.Mock).mockReturnValue('study-1');
    (route.snapshot.queryParamMap.get as jest.Mock).mockReturnValue(
      'missing-section'
    );

    const study: Study = { sections: [{ uuid: 'a', supports: [1] }] };
    (studiesService.getStudyAsObservable as jest.Mock).mockReturnValue(
      of(study)
    );

    component.ngOnInit();
    studiesService.ready.next(true);

    expect(router.navigate).toHaveBeenCalledWith(['/studies']);
  });

  it('debounceUpdateSliderOptions should call plotOptionsChange after delay', () => {
    jest.useFakeTimers();
    component.debounceUpdateSliderOptions('startSupport', 1);
    expect(plotService.plotOptionsChange).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);
    expect(plotService.plotOptionsChange).toHaveBeenCalledWith(
      'startSupport',
      1
    );
  });

  it('ngOnDestroy should clean up subscription, section, and resizeObserver', () => {
    const unsubscribe = jest.fn();
    (
      component as unknown as { subscription: { unsubscribe: () => void } }
    ).subscription = { unsubscribe };
    (
      component as unknown as { resizeObserver: { disconnect: () => void } }
    ).resizeObserver = { disconnect: jest.fn() } as { disconnect: () => void };

    const sectionSetSpy = jest.spyOn(plotService.section, 'set');

    component.ngOnDestroy();

    expect(sectionSetSpy).toHaveBeenCalledWith(null);
    expect(unsubscribe).toHaveBeenCalled();
    expect(
      (component as unknown as { resizeObserver: { disconnect: jest.Mock } })
        .resizeObserver.disconnect
    ).toHaveBeenCalled();
  });
});
