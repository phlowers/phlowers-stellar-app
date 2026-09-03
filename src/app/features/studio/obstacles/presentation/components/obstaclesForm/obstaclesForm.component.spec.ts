import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { signal } from '@angular/core';
import { ObstaclesFormComponent } from './obstaclesForm.component';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { PlotService } from '@services/plot/plot.service';
import { StorageService } from '@services/storage/storage.service';
import { NotificationService } from '@services/notification/notification.service';
import { BehaviorSubject } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslocoTestingModule } from '@jsverse/transloco';

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
  // Consumed by the ConformityComponent rendered inside the conformity dialog.
  formValue = signal<{ uuid: string | null; type: string | null }>({ uuid: null, type: 'House' });

  returnToSpan = vi.fn();
  syncSpanSelectionWithoutZoom = vi.fn();
  resetFormForNewObstacle = vi.fn();
  addPosition = vi.fn();
  deletePoint = vi.fn();
  deleteObstacle = vi.fn();
  saveObstacle = vi.fn();
  calculateAndSave = vi.fn();
  canCalculateAndSave = vi.fn(() => true);
  saveConformityData = vi.fn().mockResolvedValue(undefined);

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
  let mockStorageService: { db: unknown };
  let mockNotificationService: { warningList: ReturnType<typeof vi.fn> };
  /** Configurable count returned by the conformity-distance lookup in openConformityModal. */
  let distanceCount: number;

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

    distanceCount = 0;
    mockStorageService = {
      db: {
        catObstacleDistances: {
          where: () => ({
            equals: () => ({
              count: () => Promise.resolve(distanceCount),
              toArray: () => Promise.resolve([]),
              filter: () => ({ toArray: () => Promise.resolve([]) })
            })
          })
        },
        catObstacleConfigurations: {
          where: () => ({ equals: () => ({ first: () => Promise.resolve(null) }) })
        },
        catObstacleWindZones: { toArray: () => Promise.resolve([]) },
        catObstacleConformityConfig: { get: () => Promise.resolve(null) },
        catObstacleRuleDefinitions: {
          get: () => Promise.resolve(null),
          where: () => ({ anyOf: () => ({ toArray: () => Promise.resolve([]) }) })
        }
      }
    };
    mockNotificationService = { warningList: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [
        ObstaclesFormComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'studio.shared.altitude-type-absolute': 'Absolute',
              'studio.shared.altitude-type-relative': 'Relative',
              'studio.shared.altitude-type-relative-cable': 'Relative to cable',
              'studio.shared.span-axis-option': 'Span axis',
              'studio.obstacles-form.obstacle-must-be-saved-warning': 'obstacle must be saved',
              'studio.obstacles-form.obstacle-type-not-eligible-warning':
                "obstacle type '{{typeLabel}}' is not eligible for conformity control",
              'studio.obstacles-form.tension-level-required-warning': 'study must have an electric tension level',
              'studio.obstacles-form.single-condition-warning-summary':
                'You cannot open conformity control because this condition is not met:',
              'studio.obstacles-form.multiple-conditions-warning-summary':
                'You cannot open conformity control because these conditions are not met:',
              'shared.studio.zoom': 'Zoom',
              'studio.obstacles-form.create-new-obstacle-btn': 'Create new obstacle',
              'studio.shared.span-label': 'Span',
              'studio.obstacles-form.obstacle-type-label': 'Obstacle type',
              'studio.obstacles-form.obstacle-name-label': 'Obstacle name',
              'studio.shared.reference-support-label': 'Reference support',
              'studio.obstacles-form.obstacle-altitude-type-label': 'Obstacle altitude type',
              'studio.shared.lateral-distance-type-label': 'Lateral distance type',
              'studio.obstacles-form.free-positioning-label': 'Free positioning',
              'studio.obstacles-form.add-point-btn': 'Add point',
              'studio.obstacles-form.select-point-label': 'Select point',
              'studio.obstacles-form.point-label': 'Point',
              'studio.obstacles-form.delete-point-aria-label': 'delete point',
              'studio.obstacles-form.point-alt-label': 'Point alt.',
              'common.meter': 'm',
              'studio.obstacles-form.ref-support-dist-label': 'Ref. support dist.',
              'studio.obstacles-form.line-axis-dist-label': 'Line axis dist.',
              'studio.obstacles-form.delete-obstacle-aria-label': 'delete obstacle',
              'studio.obstacles-form.calculate-and-save-btn': 'Calculate and save',
              'studio.shared.oblique': 'Oblique',
              'studio.shared.vertical': 'Vertical',
              'studio.shared.horizontal': 'Horizontal',
              'studio.obstacles-form.conformity-dialog-title': 'Conformity verifications',
              'studio.shared.conformity-label': 'Conformity',
              'common.min-value-compact': 'Min:',
              'common.max-value-compact': 'Max:',
              'common.max-two-decimals-error': 'Max 2 decimals'
            }
          },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en'
          },
          preloadLangs: true
        })
      ],
      providers: [
        provideNoopAnimations(),
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: PlotOptionsService, useValue: mockPlotOptionsService },
        { provide: ObstacleFormService, useValue: mockObstacleFormService },
        { provide: PlotService, useValue: mockPlotService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: NotificationService, useValue: mockNotificationService },
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

    it('should render the open-conformity-modal (Conformity) button as enabled', () => {
      const button = getByTestId('open-conformity-modal') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.disabled).toBe(false);
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
          imports: [
            ObstaclesFormComponent,
            TranslocoTestingModule.forRoot({
              langs: {
                en: {
                  'studio.shared.altitude-type-absolute': 'Absolute',
                  'studio.shared.altitude-type-relative': 'Relative',
                  'studio.shared.altitude-type-relative-cable': 'Relative to cable',
                  'studio.shared.span-axis-option': 'Span axis',
                  'studio.obstacles-form.obstacle-must-be-saved-warning': 'obstacle must be saved',
                  'studio.obstacles-form.obstacle-type-not-eligible-warning':
                    "obstacle type '{{typeLabel}}' is not eligible for conformity control",
                  'studio.obstacles-form.tension-level-required-warning': 'study must have an electric tension level',
                  'studio.obstacles-form.single-condition-warning-summary':
                    'You cannot open conformity control because this condition is not met:',
                  'studio.obstacles-form.multiple-conditions-warning-summary':
                    'You cannot open conformity control because these conditions are not met:',
                  'shared.studio.zoom': 'Zoom',
                  'studio.obstacles-form.create-new-obstacle-btn': 'Create new obstacle',
                  'studio.shared.span-label': 'Span',
                  'studio.obstacles-form.obstacle-type-label': 'Obstacle type',
                  'studio.obstacles-form.obstacle-name-label': 'Obstacle name',
                  'studio.shared.reference-support-label': 'Reference support',
                  'studio.obstacles-form.obstacle-altitude-type-label': 'Obstacle altitude type',
                  'studio.shared.lateral-distance-type-label': 'Lateral distance type',
                  'studio.obstacles-form.free-positioning-label': 'Free positioning',
                  'studio.obstacles-form.add-point-btn': 'Add point',
                  'studio.obstacles-form.select-point-label': 'Select point',
                  'studio.obstacles-form.point-label': 'Point',
                  'studio.obstacles-form.delete-point-aria-label': 'delete point',
                  'studio.obstacles-form.point-alt-label': 'Point alt.',
                  'common.meter': 'm',
                  'studio.obstacles-form.ref-support-dist-label': 'Ref. support dist.',
                  'studio.obstacles-form.line-axis-dist-label': 'Line axis dist.',
                  'studio.obstacles-form.delete-obstacle-aria-label': 'delete obstacle',
                  'studio.obstacles-form.calculate-and-save-btn': 'Calculate and save',
                  'studio.shared.oblique': 'Oblique',
                  'studio.shared.vertical': 'Vertical',
                  'studio.shared.horizontal': 'Horizontal',
                  'studio.obstacles-form.conformity-dialog-title': 'Conformity verifications',
                  'studio.shared.conformity-label': 'Conformity'
                }
              },
              translocoConfig: {
                availableLangs: ['en'],
                defaultLang: 'en'
              },
              preloadLangs: true
            })
          ],
          providers: [
            provideNoopAnimations(),
            { provide: PlotSpanService, useValue: mockSpanService },
            { provide: PlotOptionsService, useValue: mockPlotOptionsService },
            { provide: ObstacleFormService, useValue: mockObstacleFormService },
            { provide: PlotService, useValue: mockPlotService },
            { provide: StorageService, useValue: mockStorageService },
            { provide: NotificationService, useValue: mockNotificationService },
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

    it('should leave the control untouched when input is cleared (NaN)', () => {
      const input = getByTestId('point-ref-distance') as HTMLInputElement;
      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      positionGroup.get('x')?.setValue(5.5);
      input.value = '';

      component.onPositionInput({ target: input } as unknown as Event, 'x');

      expect(positionGroup.get('x')?.value).toBe(5.5);
    });

    it('should revert a cleared/invalid field to the persisted value on blur', () => {
      const input = getByTestId('point-ref-distance') as HTMLInputElement;
      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      positionGroup.get('x')?.setValue(5.5);
      input.value = '';

      component.onPositionBlur({ target: input } as unknown as Event, 'x');

      expect(input.value).toBe('5.5');
    });

    it('should not alter a valid field value on blur', () => {
      const input = getByTestId('point-ref-distance') as HTMLInputElement;
      input.value = '7.2';

      component.onPositionBlur({ target: input } as unknown as Event, 'x');

      expect(input.value).toBe('7.2');
    });

    it('should revert to an empty string on blur when the control has no persisted value', () => {
      const input = getByTestId('point-ref-distance') as HTMLInputElement;
      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      positionGroup.get('x')?.setValue(null);
      input.value = '';

      component.onPositionBlur({ target: input } as unknown as Event, 'x');

      expect(input.value).toBe('');
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
      expect(toggle.getAttribute('data-p-disabled')).toBe('true');
    });

    it('should be enabled when a support is selected', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');

      const localFixture = TestBed.createComponent(ObstaclesFormComponent);
      localFixture.detectChanges();

      const toggle = localFixture.nativeElement.querySelector('p-toggleswitch');
      expect(toggle.getAttribute('data-p-disabled')).toBe('false');
    });

    it('should reflect isFreePositioningMode value', async () => {
      const toggle = fixture.nativeElement.querySelector('p-toggleswitch');
      expect(toggle.getAttribute('data-p-checked')).toBe('false');

      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      mockPlotOptionsService.isFreePositioningMode.set(true);

      const localFixture = TestBed.createComponent(ObstaclesFormComponent);
      localFixture.detectChanges();
      await Promise.resolve();
      localFixture.detectChanges();

      const localToggle = localFixture.nativeElement.querySelector('p-toggleswitch');
      expect(localToggle.getAttribute('data-p-checked')).toBe('true');
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

    it('should leave the position unchanged when input value is not numeric', () => {
      const input = getByTestId('point-altitude') as HTMLInputElement;
      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      positionGroup.get('z')?.setValue(12.5);

      input.value = 'not-a-number';
      component.onPositionInput({ target: input } as unknown as Event, 'z');

      expect(positionGroup.get('z')?.value).toBe(12.5);
    });

    it('should leave the position unchanged when input is cleared to an empty string', () => {
      const input = getByTestId('point-altitude') as HTMLInputElement;
      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      positionGroup.get('z')?.setValue(12.5);

      input.value = '';
      component.onPositionInput({ target: input } as unknown as Event, 'z');

      expect(positionGroup.get('z')?.value).toBe(12.5);
    });

    it('should not reset the altitude position to 0 when a lone "-" is typed mid-edit', () => {
      const input = getByTestId('point-altitude') as HTMLInputElement;
      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      positionGroup.get('z')?.setValue(12.5);

      input.value = '-';
      component.onPositionInput({ target: input } as unknown as Event, 'z');

      expect(positionGroup.get('z')?.value).toBe(12.5);
    });

    it('should not reset the ref distance position to 0 when a lone "-" is typed mid-edit', () => {
      const input = getByTestId('point-ref-distance') as HTMLInputElement;
      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      positionGroup.get('x')?.setValue(5.3);

      input.value = '-';
      component.onPositionInput({ target: input } as unknown as Event, 'x');

      expect(positionGroup.get('x')?.value).toBe(5.3);
    });

    it('should not reset the axis distance position to 0 when a lone "-" is typed mid-edit', () => {
      const input = getByTestId('point-axis-distance') as HTMLInputElement;
      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      positionGroup.get('y')?.setValue(7.8);

      input.value = '-';
      component.onPositionInput({ target: input } as unknown as Event, 'y');

      expect(positionGroup.get('y')?.value).toBe(7.8);
    });

    it('should accept a full negative value typed progressively after a lone "-"', () => {
      const input = getByTestId('point-altitude') as HTMLInputElement;
      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      positionGroup.get('z')?.setValue(12.5);

      input.value = '-';
      component.onPositionInput({ target: input } as unknown as Event, 'z');
      expect(positionGroup.get('z')?.value).toBe(12.5);

      input.value = '-5';
      component.onPositionInput({ target: input } as unknown as Event, 'z');

      expect(positionGroup.get('z')?.value).toBe(-5);
    });

    it('should accept a full negative value replacing a selected altitude value', () => {
      const input = getByTestId('point-altitude') as HTMLInputElement;
      input.value = '-5.5';

      component.onPositionInput({ target: input } as unknown as Event, 'z');

      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      expect(positionGroup.get('z')?.value).toBe(-5.5);
    });

    it('should accept a full negative value replacing a selected ref distance value', () => {
      const input = getByTestId('point-ref-distance') as HTMLInputElement;
      input.value = '-5.3';

      component.onPositionInput({ target: input } as unknown as Event, 'x');

      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      expect(positionGroup.get('x')?.value).toBe(-5.3);
    });

    it('should accept a full negative value replacing a selected axis distance value', () => {
      const input = getByTestId('point-axis-distance') as HTMLInputElement;
      input.value = '-7.8';

      component.onPositionInput({ target: input } as unknown as Event, 'y');

      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      expect(positionGroup.get('y')?.value).toBe(-7.8);
    });
  });

  describe('point field validation errors', () => {
    const setErrors = (key: 'x' | 'y' | 'z', errors: Record<string, boolean> | null) => {
      const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
      positionGroup.get(key)?.setErrors(errors);
      fixture.detectChanges();
    };

    it('should show no error message when the field is valid', () => {
      setErrors('z', null);
      expect(getByTestId('point-altitude-error')?.textContent?.trim()).toBe('');
    });

    it('should show the min error message alone for the altitude field', () => {
      setErrors('z', { min: true });
      expect(getByTestId('point-altitude-error')?.textContent).toContain('-100');
      expect(getByTestId('point-altitude-error')?.textContent).not.toContain('9000');
    });

    it('should show the max error message alone for the ref distance field', () => {
      setErrors('x', { max: true });
      expect(getByTestId('point-ref-distance-error')?.textContent).toContain('5000');
      expect(getByTestId('point-ref-distance-error')?.textContent).not.toContain('-50');
    });

    it('should show the decimals error message alone for the axis distance field', () => {
      setErrors('y', { maxTwoDecimals: true });
      expect(getByTestId('point-axis-distance-error')?.textContent).toContain('decimal');
    });

    it('should only show one message at a time when multiple errors are present (min takes priority)', () => {
      setErrors('z', { min: true, max: true, maxTwoDecimals: true });
      const text = getByTestId('point-altitude-error')?.textContent ?? '';
      expect(text).toContain('-100');
      expect(text).not.toContain('9000');
      expect(text.toLowerCase()).not.toContain('decimal');
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

  describe('conformity modal (Conformity button)', () => {
    /** Sets up the form/section so every openConformityModal precondition is satisfied. */
    const satisfyAllConditions = () => {
      mockObstacleFormService.form.controls.uuid.setValue('obstacle-1');
      mockObstacleFormService.form.controls.type.setValue('House');
      distanceCount = 1;
      mockSpanService.section.mockReturnValue({ voltage_idr: '400 kV' });
    };

    it('should warn and keep the modal closed when the obstacle is not saved', async () => {
      mockObstacleFormService.form.controls.uuid.setValue(null);
      mockSpanService.section.mockReturnValue({ voltage_idr: '400 kV' });

      await component.openConformityModal();

      expect(mockNotificationService.warningList).toHaveBeenCalled();
      const warnings = mockNotificationService.warningList.mock.calls[0][0] as string[];
      expect(warnings.some((w) => w.includes('obstacle must be saved'))).toBe(true);
      expect(component.isConformityModalOpen()).toBe(false);
    });

    it('should warn when the obstacle type is not eligible for conformity control', async () => {
      mockObstacleFormService.form.controls.uuid.setValue('obstacle-1');
      mockObstacleFormService.form.controls.type.setValue('House');
      distanceCount = 0;
      mockSpanService.section.mockReturnValue({ voltage_idr: '400 kV' });

      await component.openConformityModal();

      const warnings = mockNotificationService.warningList.mock.calls[0][0] as string[];
      expect(warnings.some((w) => w.includes('not eligible for conformity control'))).toBe(true);
      expect(component.isConformityModalOpen()).toBe(false);
    });

    it('should warn when the study has no electric tension level', async () => {
      mockObstacleFormService.form.controls.uuid.setValue('obstacle-1');
      mockObstacleFormService.form.controls.type.setValue('House');
      distanceCount = 1;
      mockSpanService.section.mockReturnValue({ voltage_idr: null });

      await component.openConformityModal();

      const warnings = mockNotificationService.warningList.mock.calls[0][0] as string[];
      expect(warnings.some((w) => w.includes('electric tension'))).toBe(true);
      expect(component.isConformityModalOpen()).toBe(false);
    });

    it('should open the modal when every condition is met', async () => {
      satisfyAllConditions();

      await component.openConformityModal();

      expect(mockNotificationService.warningList).not.toHaveBeenCalled();
      expect(component.isConformityModalOpen()).toBe(true);
    });

    it('should call openConformityModal when the Conformity button is clicked', () => {
      const spy = vi.spyOn(component, 'openConformityModal').mockResolvedValue();

      (getByTestId('open-conformity-modal') as HTMLButtonElement).click();

      expect(spy).toHaveBeenCalled();
    });

    it('should render the conformity dialog with the embedded conformity component when open', async () => {
      satisfyAllConditions();
      await component.openConformityModal();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      // The dialog uses appendTo="body", so its content is portalled onto the document body.
      expect(document.body.querySelector('app-conformity')).toBeTruthy();
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

    it('should call syncSpanSelectionWithoutZoom when supportUuid changes to a non-null value', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      fixture.detectChanges();

      expect(mockObstacleFormService.syncSpanSelectionWithoutZoom).toHaveBeenCalled();
    });

    it('should not call syncSpanSelectionWithoutZoom when supportUuid is cleared', () => {
      mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
      fixture.detectChanges();
      mockObstacleFormService.syncSpanSelectionWithoutZoom.mockClear();

      mockObstacleFormService.form.controls.supportUuid.setValue(null);
      fixture.detectChanges();

      expect(mockObstacleFormService.syncSpanSelectionWithoutZoom).not.toHaveBeenCalled();
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
