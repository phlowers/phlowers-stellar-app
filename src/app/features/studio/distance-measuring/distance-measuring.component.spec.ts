import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DistanceMeasuringComponent } from './distance-measuring.component';
import { DistanceMeasuringService } from './distance-measuring.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { TaskError } from '@services/worker_python/tasks/types';

describe('DistanceMeasuringComponent', () => {
  let component: DistanceMeasuringComponent;
  let fixture: ComponentFixture<DistanceMeasuringComponent>;
  let service: DistanceMeasuringService;
  let mockPlotService: { plotOptionsChange: ReturnType<typeof vi.fn>; refreshProjection: ReturnType<typeof vi.fn> };
  let mockWorkerPythonService: { runTask: ReturnType<typeof vi.fn> };

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
  const getAllByTestId = (testId: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`));

  /** Selects the (only mocked) span, making the support-selection requirement satisfied. */
  const selectSpan = () => {
    service.selectedSupportUuid.set('support-1');
    fixture.detectChanges();
  };

  /** Fills the three points so the Calculate button is enabled. */
  const fillAllPoints = () => {
    selectSpan();
    service.form.controls.forEach((group) => group.setValue({ x: 1, y: 2, z: 3 }));
    fixture.detectChanges();
  };

  /** Fills only points 1 and 2, leaving point 3 empty. */
  const fillMandatoryPoints = () => {
    selectSpan();
    service.form.controls.slice(0, 2).forEach((group) => group.setValue({ x: 1, y: 2, z: 3 }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockPlotService = { plotOptionsChange: vi.fn(), refreshProjection: vi.fn().mockResolvedValue(undefined) };
    mockWorkerPythonService = {
      runTask: vi.fn().mockResolvedValue({
        result: { distance_1_2: 0, distance_2_3: null, angle_1_2_3: null },
        error: null,
        diagnostics: []
      })
    };

    await TestBed.configureTestingModule({
      imports: [DistanceMeasuringComponent],
      providers: [
        provideNoopAnimations(),
        { provide: PlotService, useValue: mockPlotService },
        { provide: WorkerPythonService, useValue: mockWorkerPythonService },
        {
          provide: PlotSpanService,
          useValue: {
            getSpanOptions: () => [{ label: '1 - 2', value: 'support-1' }],
            getSupportIndex: vi.fn().mockReturnValue(0),
            spanAmountChoice: signal('all')
          }
        },
        {
          provide: PlotOptionsService,
          useValue: {
            camera: signal<unknown>(null),
            plotOptions: signal({ view: '3d', startSupport: 0, endSupport: 1 })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DistanceMeasuringComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(DistanceMeasuringService);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the never-saved hint linked to fields via aria-describedby', () => {
    const hint = fixture.nativeElement.querySelector('#distance-measuring-hint');
    expect(hint?.textContent?.trim()).toBe("This tab's data is never saved");
    expect((getByTestId('span-select') as HTMLElement).getAttribute('aria-describedby')).toBe(
      'distance-measuring-hint'
    );
  });

  it('should render exactly three point items', () => {
    expect(getAllByTestId('point-item')).toHaveLength(3);
    expect(getAllByTestId('point-altitude')).toHaveLength(3);
  });

  it('should mark the active point with aria-selected', () => {
    service.setActivePoint(1);
    fixture.detectChanges();
    const points = getAllByTestId('point-item');
    expect(points[1].getAttribute('aria-selected')).toBe('true');
    expect(points[0].getAttribute('aria-selected')).toBe('false');
  });

  it('should keep the free-positioning toggle disabled', () => {
    const toggle = getByTestId('free-positioning-toggle');
    expect(toggle?.getAttribute('ng-reflect-disabled')).toBe('true');
  });

  it('should disable Calculate until all points are filled', () => {
    expect((getByTestId('calculate') as HTMLButtonElement).disabled).toBe(true);
    fillAllPoints();
    expect((getByTestId('calculate') as HTMLButtonElement).disabled).toBe(false);
  });

  it('should enable Calculate once only the mandatory points 1 and 2 are filled', () => {
    fillMandatoryPoints();
    expect((getByTestId('calculate') as HTMLButtonElement).disabled).toBe(false);
  });

  it('should keep Calculate disabled when no span is selected, even if all points are filled', () => {
    service.form.controls.forEach((group) => group.setValue({ x: 1, y: 2, z: 3 }));
    fixture.detectChanges();
    expect((getByTestId('calculate') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should not render results before a calculation', () => {
    expect(getByTestId('results')).toBeNull();
  });

  it('should zoom only on explicit Zoom click, using the selected span', () => {
    service.selectedSupportUuid.set('support-1');
    service.zoomToSpan();
    expect(mockPlotService.plotOptionsChange).toHaveBeenCalledWith({ startSupport: 0, endSupport: 1 });
  });

  it('should not zoom when no span is selected', () => {
    service.zoomToSpan();
    expect(mockPlotService.plotOptionsChange).not.toHaveBeenCalled();
  });

  it('should reset all points and clear results', () => {
    fillAllPoints();
    service.results.set({ distance12: 1, distance23: 2, angle123: 3 });
    fixture.detectChanges();

    service.reset();
    fixture.detectChanges();

    expect(service.form.value).toEqual([
      { x: null, y: null, z: null },
      { x: null, y: null, z: null },
      { x: null, y: null, z: null }
    ]);
    expect(service.results()).toBeNull();
    expect(getByTestId('results')).toBeNull();
  });

  it('should display results after a successful calculation', async () => {
    fillAllPoints();
    mockWorkerPythonService.runTask.mockResolvedValue({
      result: { distance_1_2: 1, distance_2_3: 2, angle_1_2_3: 3 },
      error: null,
      diagnostics: []
    });

    await service.calculate();

    expect(mockWorkerPythonService.runTask).toHaveBeenCalled();
    expect(service.isCalculating()).toBe(false);
    expect(service.results()).toEqual({ distance12: 1, distance23: 2, angle123: 3 });

    fixture.detectChanges();
    expect(getByTestId('results')).toBeTruthy();
  });

  it('should display "-" for distance 2-3 and angle 1-2-3 when point 3 is not filled in', async () => {
    fillMandatoryPoints();
    mockWorkerPythonService.runTask.mockResolvedValue({
      result: { distance_1_2: 0, distance_2_3: null, angle_1_2_3: null },
      error: null,
      diagnostics: []
    });

    await service.calculate();

    fixture.detectChanges();
    expect(service.results()).toEqual({ distance12: 0, distance23: null, angle123: null });
    expect(getByTestId('result-distance-23')?.textContent?.trim()).toBe('-');
    expect(getByTestId('result-angle-123')?.textContent?.trim()).toBe('-');
  });

  it('should not update results when the task returns an error', async () => {
    fillAllPoints();
    mockWorkerPythonService.runTask.mockResolvedValue({
      result: null,
      error: TaskError.CALCULATION_ERROR,
      diagnostics: []
    });

    await service.calculate();

    expect(service.results()).toBeNull();
    expect(service.isCalculating()).toBe(false);
  });
});
