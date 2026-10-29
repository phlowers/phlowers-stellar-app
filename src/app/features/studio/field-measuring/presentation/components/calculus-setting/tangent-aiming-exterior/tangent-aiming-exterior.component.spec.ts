import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { vi } from 'vitest';

import { TangentAimingExteriorComponent } from './tangent-aiming-exterior.component';
import * as helpers from './tangent-aiming-exterior.helpers';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task } from '@services/worker_python/tasks/types';

const validMeasure = (overrides?: Partial<FieldMeasure>): FieldMeasure =>
  helpers.applyTangentAimingExteriorDefaults(
    createTestMeasureData({ calculationMethod: 'tangente-aiming-exterior', span: [0, 1], ...overrides }),
    '0'
  );

describe('TangentAimingExterior component', () => {
  let component: TangentAimingExteriorComponent;
  let fixture: ComponentFixture<TangentAimingExteriorComponent>;
  let componentRef: ComponentRef<TangentAimingExteriorComponent>;
  const litData = signal<unknown>(null);
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
  const fillCommonFields = () => {
    component.form.controls.leftSupport.setValue('0');
    setInput('span-length-input', '100');
    setInput('h-acc-distance-input', '10');
    setInput('vertical-acc-angle-left-input', '5');
    setInput('vertical-acc-angle-right-input', '6');
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    litData.set(null);
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: { 'common.meter': 'm', 'common.grade-unit': 'gr', 'common.yes': 'Yes', 'common.no': 'No' } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        TangentAimingExteriorComponent
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
        { provide: PlotService, useValue: { litData } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TangentAimingExteriorComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput(
      'measureData',
      createTestMeasureData({ calculationMethod: 'tangente-aiming-exterior', span: [0, 1] })
    );
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose every support of the section, truncated to 5 characters', () => {
    expect(component.supportOptions()).toEqual([
      { label: 'ABCDE', value: '0' },
      { label: 'S2', value: '1' }
    ]);
  });

  it('should display the left support of the measure', () => {
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    expect(component.form.controls.leftSupport.value).toBe('0');
  });

  it('should render the common fields, the parameter field and hide the tangent angle by default', () => {
    [
      'help-btn',
      'left-support-select',
      'span-length-input',
      'h-acc-distance-input',
      'vertical-acc-angle-left-input',
      'vertical-acc-angle-right-input',
      'calculation-type-selector',
      'parameter-input'
    ].forEach((id) => expect(getByTestId(id)).toBeTruthy());
    expect(getByTestId('tangent-angle-input')).toBeNull();
  });

  it('should show the tangent angle and hide the parameter when the type is tangente', () => {
    component.updateCalculationType('tangente');
    fixture.detectChanges();
    expect(getByTestId('tangent-angle-input')).toBeTruthy();
    expect(getByTestId('parameter-input')).toBeNull();
  });

  it('should expose parameter and tangent calculation type options', () => {
    expect(component.calculationTypeOptions().map((o) => o.value)).toEqual(['parametre', 'tangente']);
  });

  it('should disable the calculate button until the form is valid, then enable it', () => {
    const button = () => getByTestId('calculate-tangent-aiming-exterior-btn') as HTMLButtonElement;
    expect(button().disabled).toBe(true);
    fillCommonFields();
    setInput('parameter-input', '1000');
    expect(button().disabled).toBe(false);
  });

  it('should only require the displayed type field', () => {
    fillCommonFields();
    component.updateCalculationType('tangente');
    fixture.detectChanges();
    expect(component.isFormValid()).toBe(false);
    setInput('tangent-angle-input', '10');
    expect(component.isFormValid()).toBe(true);
  });

  it('should show an error message once an invalid field is touched', () => {
    setInput('h-acc-distance-input', '-1');
    expect(fixture.nativeElement.querySelector('#taeHAccDistance-error')).toBeTruthy();
  });

  it('should reveal the validation errors on calculate', () => {
    component.calculate();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#taeSpanLength-error')).toBeTruthy();
  });

  it('should show "-" when the calculated span length is unavailable', () => {
    expect(fixture.nativeElement.querySelector('#taeSpanLength-calculated').textContent).toContain('-');
  });

  it('should show the calculated span length of the selected span', () => {
    litData.set({ output_parameters: { span_length: [123.456, 50] } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#taeSpanLength-calculated').textContent).toContain('123.46');
  });

  it('should not render the results frame without result', () => {
    expect(getByTestId('tangent-aiming-exterior-parameter')).toBeNull();
  });

  it('should calculate and render the results with the respected criterion', async () => {
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    await component.calculate();
    fixture.detectChanges();
    expect(component.measureData().outputs.tangentAimingExterior).toEqual({
      parameter: 1000,
      uncertainty: 1.5,
      criterion: 1,
      checkValidity: true
    });
    expect(getByTestId('tangent-aiming-exterior-parameter')?.textContent?.trim()).toBe('1000 m');
    expect(getByTestId('tangent-aiming-exterior-uncertainty')?.textContent?.trim()).toBe('1.5 m');
    expect(getByTestId('tangent-aiming-exterior-criterion')?.textContent).toContain('Yes');
    expect(getByTestId('tangent-aiming-exterior-criterion-ok')).toBeTruthy();
  });

  it('should render the not respected icon when the criterion fails', async () => {
    vi.spyOn(helpers, 'calculateTangentAimingExteriorMock').mockResolvedValueOnce({
      result: { parameter: 10, uncertainty: 2, criterion: 5, checkValidity: false },
      error: null
    });
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    await component.calculate();
    fixture.detectChanges();
    expect(getByTestId('tangent-aiming-exterior-criterion')?.textContent).toContain('No');
    expect(getByTestId('tangent-aiming-exterior-criterion-ko')).toBeTruthy();
  });

  it('should clear the result when an input changes', async () => {
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    await component.calculate();
    setInput('h-acc-distance-input', '12');
    expect(component.measureData().outputs.tangentAimingExterior).toBeNull();
    expect(component.measureData().exteriorHAccDistance).toBe(12);
  });

  it('should clear the result when the calculation type changes', async () => {
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    await component.calculate();
    component.updateCalculationType('tangente');
    expect(component.measureData().exteriorCalculationType).toBe('tangente');
    expect(component.measureData().outputs.tangentAimingExterior).toBeNull();
  });

  describe('tangente calculation type', () => {
    const taskResult = { parameter: 2000.2, uncertainty: 13.3, criterion: 1, checkValidity: true };

    beforeEach(() => {
      componentRef.setInput(
        'measureData',
        validMeasure({ exteriorCalculationType: 'tangente', exteriorTangentAngle: 101.4, exteriorHAccDistance: 10 })
      );
      fixture.detectChanges();
    });

    it('should run the tangent aiming task with a negative distance and store its result', async () => {
      workerPythonService.runTask.mockResolvedValueOnce({ result: taskResult, error: null, diagnostics: [] });
      const mockSpy = vi.spyOn(helpers, 'calculateTangentAimingExteriorMock');
      await component.calculate();
      fixture.detectChanges();
      expect(workerPythonService.runTask).toHaveBeenCalledWith(
        Task.calculateTangentAiming,
        expect.objectContaining({ angleToCableTangent: 101.4, inputHeight: 0, distance: -10 })
      );
      expect(mockSpy).not.toHaveBeenCalled();
      expect(component.measureData().outputs.tangentAimingExterior).toEqual(taskResult);
      expect(getByTestId('tangent-aiming-exterior-parameter')?.textContent?.trim()).toBe('2000 m');
    });

    it('should log and notify when the task fails', async () => {
      workerPythonService.runTask.mockResolvedValueOnce({ result: null, error: 'boom', diagnostics: [] });
      await component.calculate();
      expect(logger.error).toHaveBeenCalled();
      expect(notification.error).toHaveBeenCalled();
      expect(component.hasError()).toBe(true);
      expect(component.measureData().outputs.tangentAimingExterior).toBeNull();
    });
  });

  it('should not run the task in parametre mode', async () => {
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    await component.calculate();
    expect(workerPythonService.runTask).not.toHaveBeenCalled();
  });

  it('should not calculate when the form is invalid', async () => {
    const spy = vi.spyOn(helpers, 'calculateTangentAimingExteriorMock');
    await component.calculate();
    expect(spy).not.toHaveBeenCalled();
    expect(component.measureData().outputs.tangentAimingExterior).toBeNull();
  });

  it('should log and notify when the calculation fails', async () => {
    vi.spyOn(helpers, 'calculateTangentAimingExteriorMock').mockResolvedValueOnce({ result: null, error: 'boom' });
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    await component.calculate();
    fixture.detectChanges();
    expect(logger.error).toHaveBeenCalled();
    expect(notification.error).toHaveBeenCalled();
    expect(component.hasError()).toBe(true);
    expect(getByTestId('calculation-error')).toBeTruthy();
    expect(component.isCalculating()).toBe(false);
  });

  describe('15°C result derived from the exterior result', () => {
    const parameter15C = { parameter15CMinusUncertainty: 1, parameter15C: 2, parameter15CPlusUncertainty: 3 };
    const withParameter15C = (updateMode15C: 'auto' | 'manual') => {
      const measure = validMeasure({ updateMode15C });
      return {
        ...measure,
        outputs: { ...measure.outputs, parameter15C }
      };
    };

    it('should clear it in auto mode when an input changes', () => {
      componentRef.setInput('measureData', withParameter15C('auto'));
      fixture.detectChanges();
      setInput('h-acc-distance-input', '12');
      expect(component.measureData().outputs.parameter15C).toBeNull();
    });

    it('should clear it in auto mode when the calculation type changes', () => {
      componentRef.setInput('measureData', withParameter15C('auto'));
      fixture.detectChanges();
      component.updateCalculationType('tangente');
      expect(component.measureData().outputs.parameter15C).toBeNull();
    });

    it('should preserve it in manual mode', () => {
      componentRef.setInput('measureData', withParameter15C('manual'));
      fixture.detectChanges();
      setInput('h-acc-distance-input', '12');
      component.updateCalculationType('tangente');
      expect(component.measureData().outputs.parameter15C).toEqual(parameter15C);
    });
  });

  it('should only offer the two supports of the selected span', () => {
    componentRef.setInput('measureData', validMeasure({ span: [1, 2] }));
    fixture.detectChanges();
    expect(component.supportOptions().map((option) => option.value)).toEqual(['1', '2']);
  });

  it('should fall back to the departure support and invalidate the results when the span changes', async () => {
    componentRef.setInput('measureData', validMeasure({ updateMode15C: 'auto' }));
    fixture.detectChanges();
    await component.calculate();
    component.measureData.update((d) => ({
      ...d,
      outputs: {
        ...d.outputs,
        parameter15C: { parameter15CMinusUncertainty: 1, parameter15C: 2, parameter15CPlusUncertainty: 3 }
      }
    }));
    componentRef.setInput('measureData', { ...component.measureData(), span: [1, 2] });
    fixture.detectChanges();
    expect(component.measureData().exteriorLeftSupport).toBe('1');
    expect(component.form.controls.leftSupport.value).toBe('1');
    expect(component.measureData().outputs.tangentAimingExterior).toBeNull();
    expect(component.measureData().outputs.parameter15C).toBeNull();
  });

  it('should restore the left support of a span when it is selected again, else use its departure support', () => {
    const changeSpan = (span: number[]) => {
      componentRef.setInput('measureData', { ...component.measureData(), span });
      fixture.detectChanges();
    };
    componentRef.setInput('measureData', validMeasure({ span: [3, 4], exteriorLeftSupport: '4' }));
    fixture.detectChanges();
    changeSpan([4, 5]);
    expect(component.measureData().exteriorLeftSupport).toBe('4');
    changeSpan([2, 3]);
    expect(component.measureData().exteriorLeftSupport).toBe('2');
    changeSpan([3, 4]);
    expect(component.measureData().exteriorLeftSupport).toBe('4');
    expect(component.form.controls.leftSupport.value).toBe('4');
    changeSpan([4, 5]);
    expect(component.measureData().exteriorLeftSupport).toBe('4');
  });

  it('should keep the left support and the result when it still belongs to the span', async () => {
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    await component.calculate();
    expect(component.measureData().exteriorLeftSupport).toBe('0');
    expect(component.measureData().outputs.tangentAimingExterior).not.toBeNull();
  });

  it('should not alter the support fields nor its result', () => {
    const support = { parameter: 5, uncertainty: 1, criterion: 1, checkValidity: true };
    componentRef.setInput(
      'measureData',
      validMeasure({
        cableHAccDistance: 7,
        outputs: { ...createTestMeasureData().outputs, tangentAimingSupport: support }
      })
    );
    fixture.detectChanges();
    setInput('h-acc-distance-input', '12');
    expect(component.measureData().cableHAccDistance).toBe(7);
    expect(component.measureData().outputs.tangentAimingSupport).toBe(support);
  });
});
