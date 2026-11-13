import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { vi } from 'vitest';

import { TangentAimingSupportComponent } from './tangent-aiming-support.component';
import * as helpers from './tangent-aiming-support.helpers';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task } from '@services/worker_python/tasks/types';

const TASK_RESULT = { parameter: 2000.2, uncertainty: 13.3, criterion: 1, checkValidity: true };

const validMeasure = (overrides?: Partial<FieldMeasure>): FieldMeasure =>
  helpers.applyTangentAimingSupportDefaults(
    createTestMeasureData({ calculationMethod: 'tangente-aiming', span: [0, 1], ...overrides }),
    '0'
  );

describe('TangentAimingSupport component', () => {
  let component: TangentAimingSupportComponent;
  let fixture: ComponentFixture<TangentAimingSupportComponent>;
  let componentRef: ComponentRef<TangentAimingSupportComponent>;
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn() };
  const notification = { error: vi.fn() };
  const workerPythonService = { runTask: vi.fn() };

  const getByTestId = (id: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  const setInput = (id: string, value: string) => {
    const input = getByTestId(id) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    workerPythonService.runTask.mockResolvedValue({ result: TASK_RESULT, error: null, diagnostics: [] });
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: { 'common.meter': 'm', 'common.grade-unit': 'gr', 'common.yes': 'Yes', 'common.no': 'No' } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        TangentAimingSupportComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LoggerService, useValue: logger },
        { provide: NotificationService, useValue: notification },
        { provide: WorkerPythonService, useValue: workerPythonService },
        {
          provide: PlotSpanService,
          useValue: { section: signal({ supports: [{ number: 'ABCDEFG' }, { number: 'S2' }] }) }
        },
        { provide: PlotService, useValue: { litData: signal(null) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TangentAimingSupportComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose only the two supports of the span, truncated to 5 characters', () => {
    expect(component.supportOptions()).toEqual([
      { label: 'ABCDE', value: '0' },
      { label: 'S2', value: '1' }
    ]);
  });

  it('should expose no support when no span is selected', () => {
    componentRef.setInput('measureData', validMeasure({ span: null }));
    fixture.detectChanges();
    expect(component.supportOptions()).toEqual([]);
  });

  it('should select the departure support of the new span when the current one is outside it', () => {
    componentRef.setInput('measureData', validMeasure({ span: [1, 2] }));
    fixture.detectChanges();
    expect(component.measureData().tangentLeftSupport).toBe('1');
    expect(component.measureData().outputs.tangentAimingSupport).toBeNull();
  });

  it('should invalidate the result and allow a new calculation when the span changes but the support is shared', async () => {
    componentRef.setInput('measureData', validMeasure({ tangentLeftSupport: '1' }));
    fixture.detectChanges();
    await component.calculate();
    expect(component.measureData().outputs.tangentAimingSupport).not.toBeNull();
    componentRef.setInput('measureData', { ...component.measureData(), span: [1, 2] });
    fixture.detectChanges();
    expect(component.measureData().tangentLeftSupport).toBe('1');
    expect(component.measureData().outputs.tangentAimingSupport).toBeNull();
    expect(component.canCalculate()).toBe(true);
  });

  it('should keep the selected left support while it belongs to the span', () => {
    componentRef.setInput('measureData', validMeasure({ span: [0, 1], tangentLeftSupport: '1' }));
    fixture.detectChanges();
    expect(component.measureData().tangentLeftSupport).toBe('1');
  });

  it('should render the tangent angle field and hide the parameter by default', () => {
    ['left-support-select', 'span-length-input', 'h-acc-distance-input', 'vertical-acc-angle-input'].forEach((id) =>
      expect(getByTestId(id)).toBeTruthy()
    );
    expect(component.measureData().calculationType).toBe('tangente');
    expect(getByTestId('tangent-angle-input')).toBeTruthy();
    expect(getByTestId('parameter-input')).toBeNull();
  });

  it('should show the parameter and hide the tangent angle when the type is parametre', () => {
    component.updateCalculationType('parametre');
    fixture.detectChanges();
    expect(getByTestId('parameter-input')).toBeTruthy();
    expect(getByTestId('tangent-angle-input')).toBeNull();
  });

  it('should expose both the parameter and tangent calculation type options as enabled', () => {
    expect(component.calculationTypeOptions().map(({ value }) => value)).toEqual(['parametre', 'tangente']);
  });

  it('should write the typed value to measureData', () => {
    setInput('h-acc-distance-input', '12.5');
    expect(component.measureData().cableHAccDistance).toBe(12.5);
  });

  it.each([
    ['tangent-angle-input', '201', 'cableTangentAngle'],
    ['tangent-angle-input', '-201', 'cableTangentAngle'],
    ['tangent-angle-input', '1.2345', 'cableTangentAngle'],
    ['span-length-input', '-1', 'tangentSpanLength'],
    ['span-length-input', '1.234', 'tangentSpanLength'],
    ['h-acc-distance-input', '1001', 'cableHAccDistance'],
    ['vertical-acc-angle-input', '201', 'cableVerticalAccAngle'],
    ['vertical-acc-angle-input', '-201', 'cableVerticalAccAngle']
  ])('should flag %s = %s as invalid with an accessible error', (testId, value) => {
    setInput(testId, value);
    const input = getByTestId(testId) as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector(`#${input.getAttribute('aria-errormessage')}`)).toBeTruthy();
    expect(component.isFormValid()).toBe(false);
  });

  it('should flag the left support select as invalid when it has an error', () => {
    expect(getByTestId('left-support-select')?.classList).not.toContain('p-invalid');
    vi.spyOn(component, 'getError').mockReturnValue('Required');
    fixture.componentRef.setInput('measureData', { ...component.measureData() });
    fixture.detectChanges();
    expect(getByTestId('left-support-select')?.classList).toContain('p-invalid');
  });

  it('should accept a negative angle with three decimals', () => {
    setInput('vertical-acc-angle-input', '-12.345');
    expect((getByTestId('vertical-acc-angle-input') as HTMLInputElement).getAttribute('aria-invalid')).toBeNull();
    expect(component.isFormValid()).toBe(true);
  });

  it('should flag an empty required field', () => {
    setInput('span-length-input', '');
    expect(component.isFormValid()).toBe(false);
  });

  it('should ignore the hidden field in the validity', () => {
    component.form.controls.cableParameter.setValue(9999);
    expect(component.isFormValid()).toBe(true);
  });

  it('should disable the calculate button while the form is invalid', () => {
    setInput('tangent-angle-input', '201');
    expect((getByTestId('calculate-tangent-aiming-support-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should hide the results before a calculation', () => {
    expect(getByTestId('tangent-aiming-support-parameter')).toBeNull();
    expect((getByTestId('calculate-tangent-aiming-support-btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('should show the results after calculating and keep the form editable', async () => {
    await component.calculate();
    fixture.detectChanges();
    expect(getByTestId('tangent-aiming-support-parameter')?.textContent?.trim()).toBe('2000 m');
    expect(getByTestId('tangent-aiming-support-uncertainty')?.textContent?.trim()).toBe('13 m');
    expect(getByTestId('tangent-aiming-support-criterion')?.textContent).toContain('Yes');
    expect(getByTestId('tangent-aiming-support-criterion-ok')).toBeTruthy();
    expect(getByTestId('tangent-angle-input')).toBeTruthy();
  });

  it('should show the not respected icon when the criterion fails', async () => {
    workerPythonService.runTask.mockResolvedValueOnce({
      result: { parameter: 2000, uncertainty: 150, criterion: 7.5, checkValidity: false },
      error: null,
      diagnostics: []
    });
    await component.calculate();
    fixture.detectChanges();
    expect(getByTestId('tangent-aiming-support-criterion')?.textContent).toContain('No');
    expect(getByTestId('tangent-aiming-support-criterion-ko')).toBeTruthy();
  });

  it('should clear a stale result when an input changes', async () => {
    await component.calculate();
    setInput('h-acc-distance-input', '3');
    fixture.detectChanges();
    expect(component.measureData().outputs.tangentAimingSupport).toBeNull();
    expect(getByTestId('tangent-aiming-support-parameter')).toBeNull();
  });

  it('should not allow a calculation on the parametre type, which the engine cannot calculate', async () => {
    expect(component.canCalculate()).toBe(true);
    component.updateCalculationType('parametre');
    fixture.detectChanges();
    expect(component.canCalculate()).toBe(false);
    await component.calculate();
    expect(workerPythonService.runTask).not.toHaveBeenCalled();
    component.updateCalculationType('tangente');
    fixture.detectChanges();
    expect(component.canCalculate()).toBe(true);
  });

  it('should clear a stale result when the calculation type changes', async () => {
    await component.calculate();
    component.updateCalculationType('parametre');
    expect(component.measureData().outputs.tangentAimingSupport).toBeNull();
  });

  it('should not calculate when the form is invalid', async () => {
    setInput('tangent-angle-input', '201');
    await component.calculate();
    expect(workerPythonService.runTask).not.toHaveBeenCalled();
    expect(component.measureData().outputs.tangentAimingSupport).toBeNull();
  });

  it('should log and notify when the calculation fails', async () => {
    workerPythonService.runTask.mockResolvedValueOnce({ result: null, error: 'boom', diagnostics: [] });
    await component.calculate();
    fixture.detectChanges();
    expect(logger.error).toHaveBeenCalled();
    expect(notification.error).toHaveBeenCalledWith('field-measuring.tangent-aiming-support.calculation-failed');
    expect(component.hasError()).toBe(true);
    expect(getByTestId('calculation-error')).toBeTruthy();
    expect(component.isCalculating()).toBe(false);
  });

  it('should discard a result when an input changes while the calculation is pending', async () => {
    let resolveTask!: (value: { result: typeof TASK_RESULT; error: null; diagnostics: [] }) => void;
    workerPythonService.runTask.mockReturnValueOnce(
      new Promise<{ result: typeof TASK_RESULT; error: null; diagnostics: [] }>((resolve) => {
        resolveTask = resolve;
      })
    );

    const calculation = component.calculate();
    setInput('h-acc-distance-input', '3');
    resolveTask({ result: TASK_RESULT, error: null, diagnostics: [] });
    await calculation;

    expect(component.measureData().outputs.tangentAimingSupport).toBeNull();
    expect(component.canCalculate()).toBe(true);
  });

  it('should discard a result when the span changes while the calculation is pending', async () => {
    let resolveTask!: (value: { result: typeof TASK_RESULT; error: null; diagnostics: [] }) => void;
    workerPythonService.runTask.mockReturnValueOnce(
      new Promise<{ result: typeof TASK_RESULT; error: null; diagnostics: [] }>((resolve) => {
        resolveTask = resolve;
      })
    );

    const calculation = component.calculate();
    componentRef.setInput('measureData', { ...component.measureData(), span: [1, 2] });
    fixture.detectChanges();
    resolveTask({ result: TASK_RESULT, error: null, diagnostics: [] });
    await calculation;

    expect(component.measureData().outputs.tangentAimingSupport).toBeNull();
    expect(component.canCalculate()).toBe(true);
  });

  it('should still log and notify when a calculation fails after its context changes', async () => {
    let resolveTask!: (value: { result: null; error: string; diagnostics: [] }) => void;
    workerPythonService.runTask.mockReturnValueOnce(
      new Promise<{ result: null; error: string; diagnostics: [] }>((resolve) => {
        resolveTask = resolve;
      })
    );

    const calculation = component.calculate();
    setInput('h-acc-distance-input', '3');
    resolveTask({ result: null, error: 'boom', diagnostics: [] });
    await calculation;

    expect(logger.error).toHaveBeenCalled();
    expect(notification.error).toHaveBeenCalledWith('field-measuring.tangent-aiming-support.calculation-failed');
    expect(component.hasError()).toBe(true);
    expect(component.measureData().outputs.tangentAimingSupport).toBeNull();
    expect(component.isCalculating()).toBe(false);
  });

  it('should return no span length when the span is unknown', () => {
    expect(component.calculatedSpanLength()).toBeNull();
  });

  it('should run the tangent aiming task with the support inputs and store its result', async () => {
    componentRef.setInput(
      'measureData',
      validMeasure({
        tangentSpanLength: 400,
        cableHAccDistance: 10,
        cableVerticalAccAngle: 98.41,
        cableTangentAngle: 100
      })
    );
    fixture.detectChanges();
    await component.calculate();
    fixture.detectChanges();
    expect(workerPythonService.runTask).toHaveBeenCalledWith(Task.calculateTangentAiming, {
      spanLength: 400,
      angleToCableTangent: 100,
      angleToLeftSupport: 0,
      angleToRightSupport: 98.41,
      inputHeight: 10,
      distance: 0
    });
    expect(component.measureData().outputs.tangentAimingSupport).toEqual(TASK_RESULT);
    expect(getByTestId('tangent-aiming-support-parameter')?.textContent?.trim()).toBe('2000 m');
  });

  it('should keep the result empty when the task returns no result', async () => {
    workerPythonService.runTask.mockResolvedValueOnce({ result: null, error: null, diagnostics: [] });
    await component.calculate();
    expect(logger.error).toHaveBeenCalled();
    expect(notification.error).toHaveBeenCalled();
    expect(component.hasError()).toBe(true);
    expect(component.measureData().outputs.tangentAimingSupport).toBeNull();
  });

  it('should keep the calculate button enabled before and after a calculation on a valid form', async () => {
    const button = () => getByTestId('calculate-tangent-aiming-support-btn') as HTMLButtonElement;
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    expect(button().disabled).toBe(false);
    await component.calculate();
    fixture.detectChanges();
    expect(button().disabled).toBe(false);
    setInput('h-acc-distance-input', '12');
    expect(component.measureData().cableHAccDistance).toBe(12);
    expect(button().disabled).toBe(false);
  });
});
