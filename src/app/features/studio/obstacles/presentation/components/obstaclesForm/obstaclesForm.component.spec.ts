import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { signal } from '@angular/core';
import { ObstaclesFormComponent } from './obstaclesForm.component';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { PlotService } from '@services/plot/plot.service';
import { BehaviorSubject } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

vi.mock('lodash', () => ({
  debounce: (fn: (...args: unknown[]) => void) => fn
}));

class MockObstacleFormService {
  form: FormGroup;
  positions: FormArray<
    FormGroup<{ x: FormControl<number | null>; y: FormControl<number | null>; z: FormControl<number | null> }>
  >;
  supportsOptions = signal([{ label: '1', value: 'LEFT' as const }]);
  results = signal({
    oblique: null as number | null,
    vertical: null as number | null,
    horizontal: null as number | null
  });
  isCalculatingObstacle = signal(false);
  calculationError = signal<string | null>(null);

  returnToSpan = vi.fn();
  resetFormForNewObstacle = vi.fn();
  addPosition = vi.fn();
  deletePoint = vi.fn();
  deleteObstacle = vi.fn();
  saveObstacle = vi.fn();
  calculateAndSave = vi.fn();
  canCalculateAndSave = vi.fn(() => true);

  constructor() {
    const fb = new FormBuilder();
    this.positions = fb.array([
      fb.group({
        x: new FormControl<number | null>(0),
        y: new FormControl<number | null>(0),
        z: new FormControl<number | null>(0)
      })
    ]);
    this.form = fb.group({
      uuid: new FormControl<string | null>(null),
      name: new FormControl<string | null>(null),
      type: new FormControl<string | null>('House'),
      supportUuid: new FormControl<string | null>(null),
      referenceSupport: new FormControl<number | null>(null),
      altitudeType: new FormControl<string | null>('absolute'),
      lateralDistanceType: new FormControl<string | null>('SPAN_AXIS'),
      positions: this.positions
    });
  }
}

describe('ObstaclesFormComponent', () => {
  let component: ObstaclesFormComponent;
  let fixture: ComponentFixture<ObstaclesFormComponent>;
  let mockSpanService: { getSpanOptions: ReturnType<typeof vi.fn>; section: ReturnType<typeof vi.fn> };
  let mockPlotOptionsService: { isFreePositioningMode: ReturnType<typeof signal> };
  let mockObstacleFormService: MockObstacleFormService;
  let mockPlotService: { loading: ReturnType<typeof signal<boolean>> };
  let obstaclesService: {
    activePointIndex: ReturnType<typeof signal<number | null>>;
    setCurrentPointIndex: vi.Mock;
    resetCurrentPointIndex: vi.Mock;
  };

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const getAllByTestId = (testId: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`));

  beforeEach(async () => {
    mockSpanService = {
      getSpanOptions: vi.fn().mockReturnValue([{ label: '1 - 2', value: 'support-1' }]),
      section: vi.fn().mockReturnValue(null)
    };
    mockPlotOptionsService = {
      isFreePositioningMode: signal(false)
    };
    mockPlotService = {
      loading: signal(false)
    };
    mockObstacleFormService = new MockObstacleFormService();
    const indexSignal = signal<number | null>(null);
    obstaclesService = {
      activePointIndex: indexSignal,
      setCurrentPointIndex: vi.fn((i: number) => indexSignal.set(i)),
      resetCurrentPointIndex: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ObstaclesFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: PlotOptionsService, useValue: mockPlotOptionsService },
        { provide: ObstacleFormService, useValue: mockObstacleFormService },
        { provide: PlotService, useValue: mockPlotService },
        {
          provide: ObstaclesService,
          useValue: {
            ...obstaclesService,
            ready: new BehaviorSubject<boolean>(true),
            getObstacleTypes: vi.fn().mockResolvedValue([
              { obstacle_type: 'ordinary_ground', obstacle_type_name: 'Ordinary ground', details: '' },
              { obstacle_type: 'vegetation', obstacle_type_name: 'Vegetation', details: '' }
            ])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ObstaclesFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isCalculating computed', () => {
    it('should be false when obstacle and plot calculations are both idle', () => {
      expect(component.isCalculating()).toBe(false);
    });

    it('should be true when obstacle calculation is running', () => {
      mockObstacleFormService.isCalculatingObstacle.set(true);
      expect(component.isCalculating()).toBe(true);
    });

    it('should be true when plot loading is active', () => {
      (mockPlotService.loading as ReturnType<typeof signal>).set(true);
      expect(component.isCalculating()).toBe(true);
    });

    it('should go back to false only after both sources return to idle', () => {
      mockObstacleFormService.isCalculatingObstacle.set(true);
      (mockPlotService.loading as ReturnType<typeof signal>).set(true);
      expect(component.isCalculating()).toBe(true);

      mockObstacleFormService.isCalculatingObstacle.set(false);
      expect(component.isCalculating()).toBe(true);

      (mockPlotService.loading as ReturnType<typeof signal>).set(false);
      expect(component.isCalculating()).toBe(false);
    });
  });

  describe('HTML rendering - form structure', () => {
    it('should render the obstacles form', () => {
      const form = getByTestId('obstacles-form');
      expect(form).toBeTruthy();
      expect(form?.tagName).toBe('FORM');
    });

    it('should render the span select dropdown', () => {
      const spanSelect = getByTestId('span-select');
      expect(spanSelect).toBeTruthy();
    });

    it('should render the obstacle type dropdown', () => {
      const obstacleType = getByTestId('obstacle-type');
      expect(obstacleType).toBeTruthy();
    });

    it('should render the obstacle name input', () => {
      const nameInput = getByTestId('obstacle-name');
      expect(nameInput).toBeTruthy();
      expect(nameInput?.tagName).toBe('INPUT');
      expect(nameInput?.getAttribute('type')).toBe('text');
    });

    it('should render the reference support dropdown', () => {
      const refSupport = getByTestId('reference-support');
      expect(refSupport).toBeTruthy();
    });

    it('should render the altitude type dropdown', () => {
      const altType = getByTestId('altitude-type');
      expect(altType).toBeTruthy();
    });

    it('should render the lateral distance type dropdown', () => {
      const latType = getByTestId('lateral-distance-type');
      expect(latType).toBeTruthy();
    });

    it('should render the points list container', () => {
      const pointsList = getByTestId('points-list');
      expect(pointsList).toBeTruthy();
      expect(pointsList?.tagName).toBe('UL');
    });

    it('should render the results section', () => {
      const results = getByTestId('results');
      expect(results).toBeTruthy();
    });
  });

  describe('HTML rendering - buttons', () => {
    it('should render the return-to-span button', () => {
      const button = getByTestId('return-to-span');
      expect(button).toBeTruthy();
      expect(button?.tagName).toBe('BUTTON');
    });

    it('should render the create-new-obstacle button', () => {
      const button = getByTestId('create-new-obstacle');
      expect(button).toBeTruthy();
      expect(button?.tagName).toBe('BUTTON');
    });

    it('should render the add-point button', () => {
      const button = getByTestId('add-point');
      expect(button).toBeTruthy();
      expect(button?.tagName).toBe('BUTTON');
    });

    it('should render the delete-obstacle button', () => {
      const button = getByTestId('delete-obstacle');
      expect(button).toBeTruthy();
      expect(button?.tagName).toBe('BUTTON');
    });

    it('should render the save-obstacle button as disabled', () => {
      const button = getByTestId('save-obstacle') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.disabled).toBe(true);
    });

    it('should render the calculate-save button', () => {
      const button = getByTestId('calculate-save');
      expect(button).toBeTruthy();
      expect(button?.tagName).toBe('BUTTON');
    });
  });

  describe('HTML rendering - point items', () => {
    it('should render point items for each position', () => {
      const pointItems = fixture.nativeElement.querySelectorAll('[data-testid="point-item"]');
      expect(pointItems.length).toBe(1);
    });

    it('should render select-point button for each point', () => {
      const selectButtons = fixture.nativeElement.querySelectorAll('[data-testid="select-point"]');
      expect(selectButtons.length).toBe(1);
    });

    it('should render delete-point button for each point', () => {
      const deleteButtons = fixture.nativeElement.querySelectorAll('[data-testid="delete-point"]');
      expect(deleteButtons.length).toBe(1);
    });

    it('should render point-altitude input for each point', () => {
      const altInputs = fixture.nativeElement.querySelectorAll('[data-testid="point-altitude"]');
      expect(altInputs.length).toBe(1);
      expect(altInputs[0].tagName).toBe('INPUT');
      expect(altInputs[0].type).toBe('number');
    });

    it('should render point-ref-distance input for each point', () => {
      const refInputs = fixture.nativeElement.querySelectorAll('[data-testid="point-ref-distance"]');
      expect(refInputs.length).toBe(1);
      expect(refInputs[0].tagName).toBe('INPUT');
      expect(refInputs[0].type).toBe('number');
    });

    it('should render point-axis-distance input for each point', () => {
      const axisInputs = fixture.nativeElement.querySelectorAll('[data-testid="point-axis-distance"]');
      expect(axisInputs.length).toBe(1);
      expect(axisInputs[0].tagName).toBe('INPUT');
      expect(axisInputs[0].type).toBe('number');
    });

    it('should render multiple point items when multiple positions exist', () => {
      mockObstacleFormService.positions.push(
        new FormGroup({
          x: new FormControl<number | null>(5),
          y: new FormControl<number | null>(6),
          z: new FormControl<number | null>(7)
        })
      );
      fixture.detectChanges();

      const pointItems = fixture.nativeElement.querySelectorAll('[data-testid="point-item"]');
      expect(pointItems.length).toBe(2);

      const altInputs = fixture.nativeElement.querySelectorAll('[data-testid="point-altitude"]');
      expect(altInputs.length).toBe(2);

      const refInputs = fixture.nativeElement.querySelectorAll('[data-testid="point-ref-distance"]');
      expect(refInputs.length).toBe(2);

      const axisInputs = fixture.nativeElement.querySelectorAll('[data-testid="point-axis-distance"]');
      expect(axisInputs.length).toBe(2);
    });

    it('should mark the active point item with aria-selected', () => {
      obstaclesService.activePointIndex.set(0);
      fixture.detectChanges();
      const pointItems = fixture.nativeElement.querySelectorAll('[data-testid="point-item"]');
      expect(pointItems[0].getAttribute('aria-selected')).toBe('true');
    });

    it('should render empty points list when no positions exist', () => {
      mockObstacleFormService.positions.clear();
      fixture.detectChanges();

      const pointItems = fixture.nativeElement.querySelectorAll('[data-testid="point-item"]');
      expect(pointItems.length).toBe(0);
    });
  });

  describe('HTML rendering - point labels', () => {
    it('should render "Point alt." as the altitude label', () => {
      const labels = fixture.nativeElement.querySelectorAll('[data-testid="label-point-altitude"]');
      expect(labels.length).toBe(1);
      expect(labels[0].textContent.trim()).toBe('Point alt.');
    });

    it('should render "Ref. support dist." as the reference support distance label', () => {
      const labels = fixture.nativeElement.querySelectorAll('[data-testid="label-ref-distance"]');
      expect(labels.length).toBe(1);
      expect(labels[0].textContent.trim()).toBe('Ref. support dist.');
    });

    it('should render "Line axis dist." as the line axis distance label', () => {
      const labels = fixture.nativeElement.querySelectorAll('[data-testid="label-axis-distance"]');
      expect(labels.length).toBe(1);
      expect(labels[0].textContent.trim()).toBe('Line axis dist.');
    });

    it('should render one label per point for each label type when multiple positions exist', () => {
      const fb = new FormBuilder();
      mockObstacleFormService.positions.push(
        fb.group({
          x: new FormControl<number | null>(1),
          y: new FormControl<number | null>(2),
          z: new FormControl<number | null>(3)
        })
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('[data-testid="label-point-altitude"]').length).toBe(2);
      expect(fixture.nativeElement.querySelectorAll('[data-testid="label-ref-distance"]').length).toBe(2);
      expect(fixture.nativeElement.querySelectorAll('[data-testid="label-axis-distance"]').length).toBe(2);
    });
  });

  describe('HTML rendering - results display', () => {
    it('should display " - " for all results initially', () => {
      expect(getByTestId('result-oblique')?.textContent).toContain(' - ');
      expect(getByTestId('result-vertical')?.textContent).toContain(' - ');
      expect(getByTestId('result-horizontal')?.textContent).toContain(' - ');
    });

    it('should display computed results after calculation', () => {
      mockObstacleFormService.results.set({ oblique: 10.5, vertical: 5.2, horizontal: 8.7 });
      fixture.detectChanges();

      expect(getByTestId('result-oblique')?.textContent).toContain('10.5');
      expect(getByTestId('result-vertical')?.textContent).toContain('5.2');
      expect(getByTestId('result-horizontal')?.textContent).toContain('8.7');
    });

    it('should display partial results when some are null', () => {
      mockObstacleFormService.results.set({ oblique: 7.3, vertical: null, horizontal: 4.1 });
      fixture.detectChanges();

      expect(getByTestId('result-oblique')?.textContent).toContain('7.3');
      expect(getByTestId('result-vertical')?.textContent).toContain(' - ');
      expect(getByTestId('result-horizontal')?.textContent).toContain('4.1');
    });

    it('should not render calculation error message when calculationError is null', () => {
      mockObstacleFormService.calculationError.set(null);
      fixture.detectChanges();

      expect(getByTestId('calculation-error')).toBeNull();
    });

    it('should render calculation error message when calculationError is defined', () => {
      mockObstacleFormService.calculationError.set('Calculation failed: timeout');
      fixture.detectChanges();

      const errorMessage = getByTestId('calculation-error');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('Calculation failed: timeout');
    });
  });

  describe('HTML rendering - obstacle name input interaction', () => {
    it('should set aria-invalid on obstacle name when control has errors', () => {
      // Manually set errors on the control to simulate invalid state
      mockObstacleFormService.form.controls.name.setErrors({ required: true });
      mockObstacleFormService.form.controls.name.markAsTouched();
      fixture.detectChanges();

      expect(mockObstacleFormService.form.controls.name.invalid).toBe(true);
      const nameInput = getByTestId('obstacle-name') as HTMLInputElement;
      expect(nameInput.getAttribute('aria-invalid')).toBe('true');
    });

    it('should not have aria-invalid on valid obstacle name', () => {
      mockObstacleFormService.form.controls.name.setValue('Valid Name');
      mockObstacleFormService.form.controls.name.setErrors(null);
      mockObstacleFormService.form.controls.name.updateValueAndValidity();
      fixture.detectChanges();

      const nameInput = getByTestId('obstacle-name') as HTMLInputElement;
      expect(nameInput.getAttribute('aria-invalid')).toBeNull();
    });
  });

  describe('dynamic obstacle types loading', () => {
    it('should populate obstacle type options from ObstacleTypesService', async () => {
      // Wait for async subscription to complete
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.obstacleTypeOptions().length).toBe(2);
      expect(component.obstacleTypeOptions()).toEqual([
        { label: 'Ordinary ground', value: 'ordinary_ground' },
        { label: 'Vegetation', value: 'vegetation' }
      ]);
    });

    it('should not populate options when service is not ready', async () => {
      // Create a service with ready initially set to false
      const ready$ = new BehaviorSubject<boolean>(false);
      const getObstacleTypes = vi.fn();
      await TestBed.resetTestingModule()
        .configureTestingModule({
          imports: [ObstaclesFormComponent],
          providers: [
            provideNoopAnimations(),
            { provide: PlotSpanService, useValue: mockSpanService },
            { provide: PlotOptionsService, useValue: mockPlotOptionsService },
            { provide: ObstacleFormService, useValue: mockObstacleFormService },
            { provide: PlotService, useValue: mockPlotService },
            {
              provide: ObstaclesService,
              useValue: {
                ...obstaclesService,
                ready: ready$,
                getObstacleTypes
              }
            }
          ]
        })
        .compileComponents();

      const localFixture = TestBed.createComponent(ObstaclesFormComponent);
      const localComponent = localFixture.componentInstance;
      localFixture.detectChanges();
      // Check that no call is made as long as ready remains false
      expect(getObstacleTypes).not.toHaveBeenCalled();
      // Emit false again
      ready$.next(false);
      await localFixture.whenStable();
      expect(getObstacleTypes).not.toHaveBeenCalled();
      expect(localComponent.obstacleTypeOptions().length).toBe(0);
    });

    it('should handle null response from getObstacleTypes gracefully', async () => {
      const mockService = TestBed.inject(ObstaclesService) as unknown as {
        ready: BehaviorSubject<boolean>;
        getObstacleTypes: vi.Mock;
      };
      // Reset options
      component.obstacleTypeOptions.set([]);

      // Set to return null
      mockService.getObstacleTypes.mockResolvedValue(null);
      mockService.ready.next(true);
      await fixture.whenStable();

      // Should not crash, options stay empty
      expect(component.obstacleTypeOptions().length).toBe(0);
    });
  });

  describe('point input interactions', () => {
    it('should update x position via point-ref-distance input', () => {
      const input = getByTestId('point-ref-distance') as HTMLInputElement;
      input.value = '5.5';

      component.onPositionInput({ target: input } as unknown as Event, 'x');

      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      expect(positionGroup.get('x')?.value).toBe(5.5);
    });

    it('should update y position via point-axis-distance input', () => {
      const input = getByTestId('point-axis-distance') as HTMLInputElement;
      input.value = '3.14';

      component.onPositionInput({ target: input } as unknown as Event, 'y');

      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      expect(positionGroup.get('y')?.value).toBe(3.14);
    });

    it('should set focus on point when input is focused', () => {
      const fb = new FormBuilder();
      mockObstacleFormService.positions.push(
        fb.group({
          x: new FormControl<number | null>(1),
          y: new FormControl<number | null>(2),
          z: new FormControl<number | null>(3)
        })
      );
      mockObstacleFormService.form.controls.name.setValue('Obstacle');
      obstaclesService.setCurrentPointIndex(1);
      fixture.detectChanges();

      const input = getByTestId('point-ref-distance') as HTMLInputElement;

      input.dispatchEvent(new Event('focus'));
      fixture.detectChanges();

      expect(obstaclesService.activePointIndex()).toBe(0);
    });
  });

  describe('initializes and resets form based on support uuid', () => {
    it('should not call resetFormForNewObstacle on init (first effect run is skipped)', () => {
      expect(mockObstacleFormService.resetFormForNewObstacle).not.toHaveBeenCalled();
    });

    it('should not reset form on initial render when support uuid is null', () => {
      expect(mockObstacleFormService.resetFormForNewObstacle).not.toHaveBeenCalled();
    });

    it('should reset form when support uuid changes', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      fixture.detectChanges();
      expect(mockObstacleFormService.resetFormForNewObstacle).toHaveBeenCalledWith('support-1');
    });

    it('should not re-trigger reset when support uuid emits the same value', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      fixture.detectChanges();

      const callCount = mockObstacleFormService.resetFormForNewObstacle.mock.calls.length;

      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      fixture.detectChanges();

      expect(mockObstacleFormService.resetFormForNewObstacle.mock.calls.length).toBe(callCount);
    });
  });

  describe('return to span button', () => {
    it('should be disabled when no support is selected', () => {
      const button = getByTestId('return-to-span') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('should be enabled when a support is selected', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      fixture.detectChanges();

      const button = getByTestId('return-to-span') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });

    it('should call returnToSpan on click', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      fixture.detectChanges();

      (getByTestId('return-to-span') as HTMLButtonElement).click();

      expect(mockObstacleFormService.returnToSpan).toHaveBeenCalled();
    });
  });

  describe('create new obstacle button', () => {
    it('should call resetFormForNewObstacle with null on click', () => {
      (getByTestId('create-new-obstacle') as HTMLButtonElement).click();

      expect(mockObstacleFormService.resetFormForNewObstacle).toHaveBeenCalledWith(null);
    });
  });

  describe('free positioning toggle', () => {
    it('should be disabled when no support is selected', () => {
      const toggle = fixture.nativeElement.querySelector('p-toggleswitch');
      expect(toggle.getAttribute('ng-reflect-disabled')).toBe('true');
    });

    it('should be enabled when a support is selected', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      fixture.detectChanges();

      const toggle = fixture.nativeElement.querySelector('p-toggleswitch');
      expect(toggle.getAttribute('ng-reflect-disabled')).toBe('false');
    });

    it('should reflect isFreePositioningMode value', () => {
      const toggle = fixture.nativeElement.querySelector('p-toggleswitch');
      expect(toggle.getAttribute('ng-reflect-model')).toBe('false');

      mockPlotOptionsService.isFreePositioningMode.set(true);
      fixture.detectChanges();

      expect(toggle.getAttribute('ng-reflect-model')).toBe('true');
    });
  });

  describe('add point button', () => {
    it('should be disabled when support uuid is null', () => {
      const addButton = getByTestId('add-point') as HTMLButtonElement;
      expect(addButton.disabled).toBe(true);
    });

    it('should be disabled when name is empty but support is set', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      fixture.detectChanges();

      const addButton = getByTestId('add-point') as HTMLButtonElement;
      expect(addButton.disabled).toBe(true);
    });

    it('should be enabled when both support and name are set', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      mockObstacleFormService.form.controls.name.setValue('Obstacle');
      fixture.detectChanges();

      const addButton = getByTestId('add-point') as HTMLButtonElement;
      expect(addButton.disabled).toBe(false);
    });

    it('should call addPosition on click', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      mockObstacleFormService.form.controls.name.setValue('Obstacle');
      fixture.detectChanges();

      (getByTestId('add-point') as HTMLButtonElement).click();

      expect(mockObstacleFormService.addPosition).toHaveBeenCalled();
    });
  });

  describe('obstacle name input', () => {
    it('should set aria-invalid when name control is invalid', () => {
      mockObstacleFormService.form.controls.name.setErrors({ required: true });
      fixture.detectChanges();

      const input = getByTestId('obstacle-name') as HTMLInputElement;
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('should not set aria-invalid when name control is valid', () => {
      mockObstacleFormService.form.controls.name.setValue('Valid Name');
      mockObstacleFormService.form.controls.name.setErrors(null);
      fixture.detectChanges();

      const input = getByTestId('obstacle-name') as HTMLInputElement;
      expect(input.getAttribute('aria-invalid')).toBeNull();
    });
  });

  describe('points list', () => {
    it('should render one point item per position', () => {
      const points = getAllByTestId('point-item');
      expect(points).toHaveLength(1);
    });

    it('should render multiple point items when positions are added', () => {
      const fb = new FormBuilder();
      mockObstacleFormService.positions.push(
        fb.group({
          x: new FormControl<number | null>(1),
          y: new FormControl<number | null>(2),
          z: new FormControl<number | null>(3)
        })
      );
      fixture.detectChanges();

      const points = getAllByTestId('point-item');
      expect(points).toHaveLength(2);
    });

    it('should mark the active point with aria-selected', () => {
      obstaclesService.setCurrentPointIndex(0);
      fixture.detectChanges();

      const point = getByTestId('point-item') as HTMLElement;
      expect(point.getAttribute('aria-selected')).toBe('true');
    });

    it('should not mark non-active points with aria-selected', () => {
      const fb = new FormBuilder();
      mockObstacleFormService.positions.push(
        fb.group({
          x: new FormControl<number | null>(1),
          y: new FormControl<number | null>(2),
          z: new FormControl<number | null>(3)
        })
      );
      obstaclesService.setCurrentPointIndex(0);
      fixture.detectChanges();

      const points = getAllByTestId('point-item');
      expect(points[0].getAttribute('aria-selected')).toBe('true');
      expect(points[1].getAttribute('aria-selected')).toBe('false');
    });
  });

  describe('point selection', () => {
    it('should set current obstacle point on select click', () => {
      const fb = new FormBuilder();
      mockObstacleFormService.positions.push(
        fb.group({
          x: new FormControl<number | null>(1),
          y: new FormControl<number | null>(2),
          z: new FormControl<number | null>(3)
        })
      );
      obstaclesService.setCurrentPointIndex(1);
      fixture.detectChanges();

      (getByTestId('select-point') as HTMLButtonElement).click();

      expect(obstaclesService.activePointIndex()).toBe(0);
    });

    it('should set current obstacle point on input focus', () => {
      const fb = new FormBuilder();
      mockObstacleFormService.positions.push(
        fb.group({
          x: new FormControl<number | null>(1),
          y: new FormControl<number | null>(2),
          z: new FormControl<number | null>(3)
        })
      );
      mockObstacleFormService.form.controls.name.setValue('Obstacle');
      obstaclesService.setCurrentPointIndex(1);
      fixture.detectChanges();

      const input = getByTestId('point-altitude') as HTMLInputElement;

      input.dispatchEvent(new Event('focus'));
      fixture.detectChanges();

      expect(obstaclesService.activePointIndex()).toBe(0);
    });
  });

  describe('point inputs', () => {
    it('should disable point inputs when name is empty', () => {
      mockObstacleFormService.form.controls.name.setValue(null);
      fixture.detectChanges();

      const altInput = getByTestId('point-altitude') as HTMLInputElement;
      const refInput = getByTestId('point-ref-distance') as HTMLInputElement;
      const axisInput = getByTestId('point-axis-distance') as HTMLInputElement;

      expect(altInput.disabled).toBe(true);
      expect(refInput.disabled).toBe(true);
      expect(axisInput.disabled).toBe(true);
    });

    it('should enable point inputs when name is set', () => {
      mockObstacleFormService.form.controls.name.setValue('Obstacle');
      fixture.detectChanges();

      const altInput = getByTestId('point-altitude') as HTMLInputElement;
      const refInput = getByTestId('point-ref-distance') as HTMLInputElement;
      const axisInput = getByTestId('point-axis-distance') as HTMLInputElement;

      expect(altInput.disabled).toBe(false);
      expect(refInput.disabled).toBe(false);
      expect(axisInput.disabled).toBe(false);
    });

    it('should update z position on altitude input', () => {
      const input = getByTestId('point-altitude') as HTMLInputElement;
      input.value = '12.5';

      component.onPositionInput({ target: input } as unknown as Event, 'z');

      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      expect(positionGroup.get('z')?.value).toBe(12.5);
    });

    it('should update x position on ref distance input', () => {
      const input = getByTestId('point-ref-distance') as HTMLInputElement;
      input.value = '5.3';

      component.onPositionInput({ target: input } as unknown as Event, 'x');

      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      expect(positionGroup.get('x')?.value).toBe(5.3);
    });

    it('should update y position on axis distance input', () => {
      const input = getByTestId('point-axis-distance') as HTMLInputElement;
      input.value = '7.8';

      component.onPositionInput({ target: input } as unknown as Event, 'y');

      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      expect(positionGroup.get('y')?.value).toBe(7.8);
    });

    it('should default to 0 when input value is not numeric', () => {
      const input = getByTestId('point-altitude') as HTMLInputElement;
      input.value = 'not-a-number';

      component.onPositionInput({ target: input } as unknown as Event, 'z');

      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      expect(positionGroup.get('z')?.value).toBe(0);
    });
  });

  describe('delete point button', () => {
    it('should call deletePoint with the correct index', () => {
      (getByTestId('delete-point') as HTMLButtonElement).click();

      expect(mockObstacleFormService.deletePoint).toHaveBeenCalledWith(0);
    });
  });

  describe('delete obstacle button', () => {
    it('should be disabled when no uuid is set', () => {
      const deleteButton = getByTestId('delete-obstacle') as HTMLButtonElement;
      expect(deleteButton.disabled).toBe(true);
    });

    it('should be enabled when uuid is set', () => {
      mockObstacleFormService.form.controls.uuid.setValue('obstacle-1');
      fixture.detectChanges();

      const deleteButton = getByTestId('delete-obstacle') as HTMLButtonElement;
      expect(deleteButton.disabled).toBe(false);
    });

    it('should call deleteObstacle on click', () => {
      mockObstacleFormService.form.controls.uuid.setValue('obstacle-1');
      fixture.detectChanges();

      (getByTestId('delete-obstacle') as HTMLButtonElement).click();

      expect(mockObstacleFormService.deleteObstacle).toHaveBeenCalled();
    });
  });

  describe('save obstacle button (AT-CCGLA)', () => {
    it('should always be disabled', () => {
      const saveButton = getByTestId('save-obstacle') as HTMLButtonElement;
      expect(saveButton.disabled).toBe(true);
    });

    it('should call saveObstacle on click', () => {
      const saveButton = getByTestId('save-obstacle') as HTMLButtonElement;
      saveButton.disabled = false;
      saveButton.click();

      expect(mockObstacleFormService.saveObstacle).toHaveBeenCalled();
    });
  });

  describe('calculate and save button', () => {
    it('should be enabled when canCalculateAndSave returns true', () => {
      const button = getByTestId('calculate-save') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });

    it('should be disabled when canCalculateAndSave returns false', () => {
      mockObstacleFormService.canCalculateAndSave = vi.fn(() => false);
      fixture.detectChanges();

      const button = getByTestId('calculate-save') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('should call calculateAndSave on click', () => {
      (getByTestId('calculate-save') as HTMLButtonElement).click();

      expect(mockObstacleFormService.calculateAndSave).toHaveBeenCalled();
    });
  });

  describe('support uuid effect', () => {
    it('should reset isFreePositioningMode when supportUuid is cleared', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      fixture.detectChanges();

      mockPlotOptionsService.isFreePositioningMode.set(true);

      mockObstacleFormService.form.controls.supportUuid.setValue(null);
      fixture.detectChanges();

      expect(mockPlotOptionsService.isFreePositioningMode()).toBe(false);
    });

    it('should call returnToSpan when supportUuid changes to a non-null value', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      fixture.detectChanges();

      expect(mockObstacleFormService.returnToSpan).toHaveBeenCalled();
    });

    it('should not call returnToSpan when supportUuid is cleared', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      fixture.detectChanges();
      mockObstacleFormService.returnToSpan.mockClear();

      mockObstacleFormService.form.controls.supportUuid.setValue(null);
      fixture.detectChanges();

      expect(mockObstacleFormService.returnToSpan).not.toHaveBeenCalled();
    });
  });

  describe('results display', () => {
    it('should show " - " for all results when values are null', () => {
      expect(getByTestId('result-oblique')?.textContent).toContain(' - ');
      expect(getByTestId('result-vertical')?.textContent).toContain(' - ');
      expect(getByTestId('result-horizontal')?.textContent).toContain(' - ');
    });

    it('should display oblique result when set', () => {
      mockObstacleFormService.results.set({ oblique: 42.5, vertical: null, horizontal: null });
      fixture.detectChanges();

      expect(getByTestId('result-oblique')?.textContent).toContain('42.5');
      expect(getByTestId('result-vertical')?.textContent).toContain(' - ');
      expect(getByTestId('result-horizontal')?.textContent).toContain(' - ');
    });

    it('should display vertical result when set', () => {
      mockObstacleFormService.results.set({ oblique: null, vertical: 18.3, horizontal: null });
      fixture.detectChanges();

      expect(getByTestId('result-vertical')?.textContent).toContain('18.3');
    });

    it('should display horizontal result when set', () => {
      mockObstacleFormService.results.set({ oblique: null, vertical: null, horizontal: 9.7 });
      fixture.detectChanges();

      expect(getByTestId('result-horizontal')?.textContent).toContain('9.7');
    });

    it('should display all results when all values are set', () => {
      mockObstacleFormService.results.set({ oblique: 1, vertical: 2, horizontal: 3 });
      fixture.detectChanges();

      expect(getByTestId('result-oblique')?.textContent).toContain('1');
      expect(getByTestId('result-vertical')?.textContent).toContain('2');
      expect(getByTestId('result-horizontal')?.textContent).toContain('3');
    });
  });
});
