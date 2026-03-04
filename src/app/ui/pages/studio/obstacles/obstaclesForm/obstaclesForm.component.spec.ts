import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { signal } from '@angular/core';
import { ObstaclesFormComponent } from './obstaclesForm.component';
import { PlotService } from '../../services/plot.service';
import { ObstaclesService } from '../obstacles.service';
import { ObstacleFormService } from './obstaclesForm.service';
import { ObstacleTypesService } from '@services/obstacle-types/obstacle.services';
import { BehaviorSubject } from 'rxjs';

jest.mock('lodash', () => ({
  debounce: (fn: (...args: unknown[]) => void) => fn
}));

class MockObstacleFormService {
  form: FormGroup;
  positions: FormArray<
    FormGroup<{ x: FormControl<number | null>; y: FormControl<number | null>; z: FormControl<number | null> }>
  >;
  supportsOptions = signal([{ label: 1, value: 1 }]);
  results = signal({
    oblique: null as number | null,
    verticale: null as number | null,
    horizontale: null as number | null
  });

  returnToSpan = jest.fn();
  resetFormForNewObstacle = jest.fn();
  addPosition = jest.fn();
  deletePoint = jest.fn();
  deleteObstacle = jest.fn();
  saveObstacle = jest.fn();
  calculateAndSave = jest.fn();
  canCalculateAndSave = jest.fn(() => true);

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
  let mockPlotService: { getSpanOptions: jest.Mock; isFreePositioningMode: ReturnType<typeof signal> };
  let mockObstacleFormService: MockObstacleFormService;
  let obstaclesService: ObstaclesService;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const getAllByTestId = (testId: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`));

  beforeEach(async () => {
    mockPlotService = {
      getSpanOptions: jest.fn().mockReturnValue([{ label: '1 - 2', value: 'support-1' }]),
      isFreePositioningMode: signal(false)
    };
    mockObstacleFormService = new MockObstacleFormService();
    obstaclesService = new ObstaclesService();

    await TestBed.configureTestingModule({
      imports: [ObstaclesFormComponent],
      providers: [
        { provide: PlotService, useValue: mockPlotService },
        { provide: ObstaclesService, useValue: obstaclesService },
        { provide: ObstacleFormService, useValue: mockObstacleFormService },
        {
          provide: ObstacleTypesService,
          useValue: {
            ready: new BehaviorSubject<boolean>(true),
            getObstacleTypes: jest.fn().mockResolvedValue([
              { obstacle_type: 'ordinary_ground', obstacle_type_name: 'Terrain ordinaire', details: '' },
              { obstacle_type: 'vegetation', obstacle_type_name: 'Végétation', details: '' }
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
    jest.clearAllMocks();
  });

  describe('form initialization', () => {
    it('should render the obstacles form', () => {
      expect(getByTestId('obstacles-form')).toBeTruthy();
    });

    it('should reset form based on initial null support uuid', () => {
      expect(mockObstacleFormService.resetFormForNewObstacle).toHaveBeenCalledWith(null);
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

      mockPlotService.isFreePositioningMode.set(true);
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
      const spy = jest.spyOn(obstaclesService, 'setCurrentPointIndex');
      (getByTestId('select-point') as HTMLButtonElement).click();

      expect(spy).toHaveBeenCalledWith(0);
    });

    it('should set current obstacle point on input focus', () => {
      const spy = jest.spyOn(obstaclesService, 'setCurrentPointIndex');
      const input = getByTestId('point-altitude') as HTMLInputElement;

      input.dispatchEvent(new Event('focus'));
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledWith(0);
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
      mockObstacleFormService.canCalculateAndSave = jest.fn(() => false);
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

      mockPlotService.isFreePositioningMode.set(true);

      mockObstacleFormService.form.controls.supportUuid.setValue(null);
      fixture.detectChanges();

      expect(mockPlotService.isFreePositioningMode()).toBe(false);
    });
  });

  describe('results display', () => {
    it('should show N/A for all results when values are null', () => {
      expect(getByTestId('result-oblique')?.textContent).toContain('N/A');
      expect(getByTestId('result-vertical')?.textContent).toContain('N/A');
      expect(getByTestId('result-horizontal')?.textContent).toContain('N/A');
    });

    it('should display oblique result when set', () => {
      mockObstacleFormService.results.set({ oblique: 42.5, verticale: null, horizontale: null });
      fixture.detectChanges();

      expect(getByTestId('result-oblique')?.textContent).toContain('42.5');
      expect(getByTestId('result-vertical')?.textContent).toContain('N/A');
      expect(getByTestId('result-horizontal')?.textContent).toContain('N/A');
    });

    it('should display vertical result when set', () => {
      mockObstacleFormService.results.set({ oblique: null, verticale: 18.3, horizontale: null });
      fixture.detectChanges();

      expect(getByTestId('result-vertical')?.textContent).toContain('18.3');
    });

    it('should display horizontal result when set', () => {
      mockObstacleFormService.results.set({ oblique: null, verticale: null, horizontale: 9.7 });
      fixture.detectChanges();

      expect(getByTestId('result-horizontal')?.textContent).toContain('9.7');
    });

    it('should display all results when all values are set', () => {
      mockObstacleFormService.results.set({ oblique: 1, verticale: 2, horizontale: 3 });
      fixture.detectChanges();

      expect(getByTestId('result-oblique')?.textContent).toContain('1');
      expect(getByTestId('result-vertical')?.textContent).toContain('2');
      expect(getByTestId('result-horizontal')?.textContent).toContain('3');
    });
  });
});
