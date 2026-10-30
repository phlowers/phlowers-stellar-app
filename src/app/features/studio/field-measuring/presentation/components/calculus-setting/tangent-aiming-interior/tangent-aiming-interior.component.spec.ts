import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { vi } from 'vitest';

import { TangentAimingInteriorComponent } from './tangent-aiming-interior.component';
import * as helpers from './tangent-aiming-interior.helpers';
import * as commonHelpers from '../tangent-aiming-common/tangent-aiming-common.helpers';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';

const validMeasure = (overrides?: Partial<FieldMeasure>): FieldMeasure =>
  helpers.applyTangentAimingInteriorDefaults(
    createTestMeasureData({ calculationMethod: 'tangente-aiming-interior', span: [0, 1], ...overrides }),
    '0'
  );

describe('TangentAimingInterior component', () => {
  let component: TangentAimingInteriorComponent;
  let fixture: ComponentFixture<TangentAimingInteriorComponent>;
  let componentRef: ComponentRef<TangentAimingInteriorComponent>;
  const litData = signal<unknown>(null);
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn() };
  const notification = { error: vi.fn() };

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
        TangentAimingInteriorComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LoggerService, useValue: logger },
        { provide: NotificationService, useValue: notification },
        {
          provide: PlotSpanService,
          useValue: { section: signal({ supports: [{ number: 'ABCDEFG' }, { number: 'S2' }] }) }
        },
        { provide: PlotService, useValue: { litData } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TangentAimingInteriorComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput(
      'measureData',
      createTestMeasureData({ calculationMethod: 'tangente-aiming-interior', span: [0, 1] })
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

  it('should only require the displayed type field', () => {
    fillCommonFields();
    component.updateCalculationType('tangente');
    fixture.detectChanges();
    expect(component.isFormValid()).toBe(false);
    setInput('tangent-angle-input', '10');
    expect(component.isFormValid()).toBe(true);
  });

  it('should disable the calculate button until the form is valid, then enable it', () => {
    const button = () => getByTestId('calculate-tangent-aiming-interior-btn') as HTMLButtonElement;
    expect(button().disabled).toBe(true);
    fillCommonFields();
    setInput('parameter-input', '1000');
    expect(button().disabled).toBe(false);
  });

  it('should show an error message once an invalid field is touched', () => {
    setInput('h-acc-distance-input', '-1');
    expect(fixture.nativeElement.querySelector('#taiHAccDistance-error')).toBeTruthy();
  });

  it('should reveal the validation errors on calculate', () => {
    component.calculate();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#taiSpanLength-error')).toBeTruthy();
  });

  it('should flag the left support select as invalid when it has an error', () => {
    expect(getByTestId('left-support-select')?.classList).not.toContain('p-invalid');
    vi.spyOn(component, 'getError').mockReturnValue('Required');
    fixture.componentRef.setInput('measureData', { ...component.measureData() });
    fixture.detectChanges();
    expect(getByTestId('left-support-select')?.classList).toContain('p-invalid');
  });

  it('should show "-" when the calculated span length is unavailable', () => {
    expect(fixture.nativeElement.querySelector('#taiSpanLength-calculated').textContent).toContain('-');
  });

  it('should show the calculated span length of the selected span', () => {
    litData.set({ output_parameters: { span_length: [123.456, 50] } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#taiSpanLength-calculated').textContent).toContain('123.46');
  });

  it('should not render the results frame without result', () => {
    expect(getByTestId('tangent-aiming-interior-parameter')).toBeNull();
  });

  it('should calculate and render the results with the respected criterion', async () => {
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    await component.calculate();
    fixture.detectChanges();
    expect(component.measureData().outputs.tangentAimingInterior).toEqual({
      parameter: 1000,
      uncertainty: 1.5,
      criterion: 1,
      checkValidity: true
    });
    expect(getByTestId('tangent-aiming-interior-parameter')?.textContent?.trim()).toBe('1000 m');
    expect(getByTestId('tangent-aiming-interior-uncertainty')?.textContent?.trim()).toBe('1.5 m');
    expect(getByTestId('tangent-aiming-interior-criterion')?.textContent).toContain('Yes');
    expect(getByTestId('tangent-aiming-interior-criterion-ok')).toBeTruthy();
  });

  it('should render the not respected icon when the criterion fails', async () => {
    vi.spyOn(commonHelpers, 'calculateTangentAimingMock').mockResolvedValueOnce({
      result: { parameter: 10, uncertainty: 2, criterion: 5, checkValidity: false },
      error: null
    });
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    await component.calculate();
    fixture.detectChanges();
    expect(getByTestId('tangent-aiming-interior-criterion')?.textContent).toContain('No');
    expect(getByTestId('tangent-aiming-interior-criterion-ko')).toBeTruthy();
  });

  it('should clear the result when an input changes', async () => {
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    await component.calculate();
    setInput('h-acc-distance-input', '12');
    expect(component.measureData().outputs.tangentAimingInterior).toBeNull();
    expect(component.measureData().interiorHAccDistance).toBe(12);
  });

  it('should clear the result when the calculation type changes', async () => {
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    await component.calculate();
    component.updateCalculationType('tangente');
    expect(component.measureData().interiorCalculationType).toBe('tangente');
    expect(component.measureData().outputs.tangentAimingInterior).toBeNull();
  });

  it('should not calculate when the form is invalid', async () => {
    const spy = vi.spyOn(commonHelpers, 'calculateTangentAimingMock');
    await component.calculate();
    expect(spy).not.toHaveBeenCalled();
    expect(component.measureData().outputs.tangentAimingInterior).toBeNull();
  });

  it('should log and notify when the calculation fails', async () => {
    vi.spyOn(commonHelpers, 'calculateTangentAimingMock').mockResolvedValueOnce({ result: null, error: 'boom' });
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    await component.calculate();
    fixture.detectChanges();
    expect(logger.error).toHaveBeenCalled();
    expect(notification.error).toHaveBeenCalledWith('field-measuring.tangent-aiming-interior.calculation-failed');
    expect(component.hasError()).toBe(true);
    expect(getByTestId('calculation-error')).toBeTruthy();
    expect(component.isCalculating()).toBe(false);
  });

  describe('15°C result derived from the interior result', () => {
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

  it('should invalidate the result and allow a new calculation when the span changes but the support is shared', async () => {
    componentRef.setInput('measureData', validMeasure({ interiorLeftSupport: '1' }));
    fixture.detectChanges();
    await component.calculate();
    expect(component.measureData().outputs.tangentAimingInterior).not.toBeNull();
    componentRef.setInput('measureData', { ...component.measureData(), span: [1, 2] });
    fixture.detectChanges();
    expect(component.measureData().interiorLeftSupport).toBe('1');
    expect(component.measureData().outputs.tangentAimingInterior).toBeNull();
    expect(component.canCalculate()).toBe(true);
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
    expect(component.measureData().interiorLeftSupport).toBe('1');
    expect(component.form.controls.leftSupport.value).toBe('1');
    expect(component.measureData().outputs.tangentAimingInterior).toBeNull();
    expect(component.measureData().outputs.parameter15C).toBeNull();
  });

  it('should restore the left support of a span when it is selected again, else use its departure support', () => {
    const changeSpan = (span: number[]) => {
      componentRef.setInput('measureData', { ...component.measureData(), span });
      fixture.detectChanges();
    };
    componentRef.setInput('measureData', validMeasure({ span: [3, 4], interiorLeftSupport: '4' }));
    fixture.detectChanges();
    changeSpan([4, 5]);
    expect(component.measureData().interiorLeftSupport).toBe('4');
    changeSpan([2, 3]);
    expect(component.measureData().interiorLeftSupport).toBe('2');
    changeSpan([3, 4]);
    expect(component.measureData().interiorLeftSupport).toBe('4');
    expect(component.form.controls.leftSupport.value).toBe('4');
    changeSpan([4, 5]);
    expect(component.measureData().interiorLeftSupport).toBe('4');
  });

  it('should keep the left support and the result when it still belongs to the span', async () => {
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    await component.calculate();
    expect(component.measureData().interiorLeftSupport).toBe('0');
    expect(component.measureData().outputs.tangentAimingInterior).not.toBeNull();
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

  it('should only enable the calculate button when an input changed since the last calculation', async () => {
    const button = () => getByTestId('calculate-tangent-aiming-interior-btn') as HTMLButtonElement;
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    expect(button().disabled).toBe(false);
    await component.calculate();
    fixture.detectChanges();
    expect(button().disabled).toBe(true);
    setInput('h-acc-distance-input', '12');
    expect(component.measureData().interiorHAccDistance).toBe(12);
    expect(button().disabled).toBe(false);
  });
});
