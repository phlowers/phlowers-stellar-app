import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { signal } from '@angular/core';
import { ObstaclesFormComponent } from './obstaclesForm.component';
import { PlotService } from '../../services/plot.service';
import { ObstaclesService } from '../obstacles.service';
import { ObstacleFormService } from './obstaclesForm.service';

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
        { provide: ObstacleFormService, useValue: mockObstacleFormService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ObstaclesFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes and resets form based on support uuid', () => {
    expect(mockObstacleFormService.resetFormForNewObstacle).toHaveBeenCalledWith(null);

    mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
    fixture.detectChanges();

    expect(mockObstacleFormService.resetFormForNewObstacle).toHaveBeenCalledWith('support-1');
  });

  it('toggles return to span button based on support selection', () => {
    const button = getByTestId('return-to-span') as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
    fixture.detectChanges();

    expect(button.disabled).toBe(false);
  });

  it('calls reset for new obstacle from button', () => {
    const button = getByTestId('create-new-obstacle') as HTMLButtonElement;
    button.click();

    expect(mockObstacleFormService.resetFormForNewObstacle).toHaveBeenCalledWith(null);
  });

  it('calls returnToSpan from button', () => {
    const button = getByTestId('return-to-span') as HTMLButtonElement;
    mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
    fixture.detectChanges();

    button.click();

    expect(mockObstacleFormService.returnToSpan).toHaveBeenCalled();
  });

  it('enables add point button when support and name are set', () => {
    const addButton = getByTestId('add-point') as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);

    mockObstacleFormService.form.controls.supportUuid.setValue('support-1');
    mockObstacleFormService.form.controls.name.setValue('Obstacle');
    fixture.detectChanges();

    expect(addButton.disabled).toBe(false);

    addButton.click();
    expect(mockObstacleFormService.addPosition).toHaveBeenCalled();
  });

  it('updates positions on input', () => {
    const input = getByTestId('point-altitude') as HTMLInputElement;
    input.value = '12.5';

    component.onPositionInput({ target: input } as unknown as Event, 'z');

    const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
    expect(positionGroup.get('z')?.value).toBe(12.5);
  });

  it('defaults position input to 0 when value is not numeric', () => {
    const input = getByTestId('point-altitude') as HTMLInputElement;
    input.value = 'not-a-number';

    component.onPositionInput({ target: input } as unknown as Event, 'z');

    const positionGroup = mockObstacleFormService.positions.at(0) as FormGroup;
    expect(positionGroup.get('z')?.value).toBe(0);
  });

  it('sets current obstacle point on select click', () => {
    const spy = jest.spyOn(obstaclesService, 'setCurrentPointIndex');
    const button = getByTestId('select-point') as HTMLButtonElement;

    button.click();

    expect(spy).toHaveBeenCalledWith(0);
  });

  it('deletes point using delete button', () => {
    const deleteButton = getByTestId('delete-point') as HTMLButtonElement;

    deleteButton.click();

    expect(mockObstacleFormService.deletePoint).toHaveBeenCalledWith(0);
  });

  it('toggles delete obstacle button based on uuid', () => {
    const deleteButton = getByTestId('delete-obstacle') as HTMLButtonElement;
    expect(deleteButton.disabled).toBe(true);

    mockObstacleFormService.form.controls.uuid.setValue('obstacle-1');
    fixture.detectChanges();

    expect(deleteButton.disabled).toBe(false);

    deleteButton.click();
    expect(mockObstacleFormService.deleteObstacle).toHaveBeenCalled();
  });

  it('calls calculate and save when enabled', () => {
    const button = getByTestId('calculate-save') as HTMLButtonElement;

    button.click();

    expect(mockObstacleFormService.calculateAndSave).toHaveBeenCalled();
  });

  it('disables calculate and save when not allowed', () => {
    mockObstacleFormService.canCalculateAndSave = jest.fn(() => false);
    fixture.detectChanges();

    const button = getByTestId('calculate-save') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('renders results values', () => {
    expect(getByTestId('result-oblique')?.textContent).toContain('N/A');

    mockObstacleFormService.results.set({ oblique: 1, verticale: 2, horizontale: 3 });
    fixture.detectChanges();

    expect(getByTestId('result-oblique')?.textContent).toContain('1');
    expect(getByTestId('result-vertical')?.textContent).toContain('2');
    expect(getByTestId('result-horizontal')?.textContent).toContain('3');
  });
});
