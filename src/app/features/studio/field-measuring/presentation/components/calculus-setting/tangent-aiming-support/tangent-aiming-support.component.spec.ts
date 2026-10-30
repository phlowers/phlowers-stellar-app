import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { vi } from 'vitest';

import { TangentAimingSupportComponent } from './tangent-aiming-support.component';
import * as helpers from './tangent-aiming-support.helpers';
import * as commonHelpers from '../tangent-aiming-common/tangent-aiming-common.helpers';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';

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
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: { 'common.meter': 'm', 'common.grade-unit': 'gr' } },
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

  it('should render the parameter field and hide the tangent angle by default', () => {
    ['left-support-select', 'span-length-input', 'h-acc-distance-input', 'vertical-acc-angle-input'].forEach((id) =>
      expect(getByTestId(id)).toBeTruthy()
    );
    expect(getByTestId('parameter-input')).toBeTruthy();
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

  it('should write the typed value to measureData', () => {
    setInput('h-acc-distance-input', '12.5');
    expect(component.measureData().cableHAccDistance).toBe(12.5);
  });

  it.each([
    ['parameter-input', '19', 'cableParameter'],
    ['parameter-input', '5001', 'cableParameter'],
    ['parameter-input', '30.5', 'cableParameter'],
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

  it('should accept a negative angle with two decimals', () => {
    setInput('vertical-acc-angle-input', '-12.34');
    expect((getByTestId('vertical-acc-angle-input') as HTMLInputElement).getAttribute('aria-invalid')).toBeNull();
    expect(component.isFormValid()).toBe(true);
  });

  it('should flag an empty required field', () => {
    setInput('span-length-input', '');
    expect(component.isFormValid()).toBe(false);
  });

  it('should ignore the hidden field in the validity', () => {
    component.form.controls.cableTangentAngle.setValue(9999);
    expect(component.isFormValid()).toBe(true);
  });

  it('should disable the calculate button while the form is invalid', () => {
    setInput('parameter-input', '1');
    expect((getByTestId('calculate-tangent-aiming-support-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should hide the results before a calculation', () => {
    expect(getByTestId('tangent-aiming-support-parameter')).toBeNull();
    expect((getByTestId('calculate-tangent-aiming-support-btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('should show the results after calculating and keep the form editable', async () => {
    await component.calculate();
    fixture.detectChanges();
    expect(getByTestId('tangent-aiming-support-parameter')?.textContent?.trim()).toBe('1000 m');
    expect(getByTestId('tangent-aiming-support-uncertainty')?.textContent?.trim()).toBe('2 m');
    expect(getByTestId('tangent-aiming-support-criterion')?.textContent).toContain('1 %');
    expect(getByTestId('tangent-aiming-support-criterion-ok')).toBeTruthy();
    expect(getByTestId('parameter-input')).toBeTruthy();
  });

  it('should show the not respected icon when the criterion fails', async () => {
    vi.spyOn(commonHelpers, 'calculateTangentAimingMock').mockResolvedValueOnce({
      result: { parameter: 10, uncertainty: 2, criterion: 5, checkValidity: false },
      error: null
    });
    await component.calculate();
    fixture.detectChanges();
    expect(getByTestId('tangent-aiming-support-criterion-ko')).toBeTruthy();
  });

  it('should clear a stale result when an input changes', async () => {
    await component.calculate();
    setInput('h-acc-distance-input', '3');
    fixture.detectChanges();
    expect(component.measureData().outputs.tangentAimingSupport).toBeNull();
    expect(getByTestId('tangent-aiming-support-parameter')).toBeNull();
  });

  it('should clear a stale result when the calculation type changes', async () => {
    await component.calculate();
    component.updateCalculationType('tangente');
    expect(component.measureData().outputs.tangentAimingSupport).toBeNull();
  });

  it('should not calculate when the form is invalid', async () => {
    const spy = vi.spyOn(commonHelpers, 'calculateTangentAimingMock');
    setInput('parameter-input', '1');
    await component.calculate();
    expect(spy).not.toHaveBeenCalled();
    expect(component.measureData().outputs.tangentAimingSupport).toBeNull();
  });

  it('should log and notify when the calculation fails', async () => {
    vi.spyOn(commonHelpers, 'calculateTangentAimingMock').mockResolvedValueOnce({ result: null, error: 'boom' });
    await component.calculate();
    fixture.detectChanges();
    expect(logger.error).toHaveBeenCalled();
    expect(notification.error).toHaveBeenCalledWith('field-measuring.tangent-aiming-support.calculation-failed');
    expect(component.hasError()).toBe(true);
    expect(getByTestId('calculation-error')).toBeTruthy();
    expect(component.isCalculating()).toBe(false);
  });

  it('should return no span length when the span is unknown', () => {
    expect(component.calculatedSpanLength()).toBeNull();
  });

  it('should only enable the calculate button when an input changed since the last calculation', async () => {
    const button = () => getByTestId('calculate-tangent-aiming-support-btn') as HTMLButtonElement;
    componentRef.setInput('measureData', validMeasure());
    fixture.detectChanges();
    expect(button().disabled).toBe(false);
    await component.calculate();
    fixture.detectChanges();
    expect(button().disabled).toBe(true);
    setInput('h-acc-distance-input', '12');
    expect(component.measureData().cableHAccDistance).toBe(12);
    expect(button().disabled).toBe(false);
  });
});
