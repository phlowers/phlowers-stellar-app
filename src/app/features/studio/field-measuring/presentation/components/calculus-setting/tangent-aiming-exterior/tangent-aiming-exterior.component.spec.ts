import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { TangentAimingExteriorComponent } from './tangent-aiming-exterior.component';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';

describe('TangentAimingExterior component', () => {
  let component: TangentAimingExteriorComponent;
  let fixture: ComponentFixture<TangentAimingExteriorComponent>;
  let componentRef: ComponentRef<TangentAimingExteriorComponent>;
  const litData = signal<unknown>(null);

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
    litData.set(null);
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: { 'common.meter': 'm', 'common.grade-unit': 'gr' } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        TangentAimingExteriorComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
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
    componentRef.setInput('measureData', createTestMeasureData({ span: [0, 1] }));
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

  it('should default the left support to the first support of the span', () => {
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

  it('should render the results with the respected criterion', () => {
    component.result.set({ parameter: 1000, uncertainty: 2, criterion: 1, checkValidity: true });
    fixture.detectChanges();
    expect(getByTestId('tangent-aiming-exterior-parameter')?.textContent).toContain('1000');
    expect(getByTestId('tangent-aiming-exterior-uncertainty')?.textContent).toContain('2');
    expect(getByTestId('tangent-aiming-exterior-criterion')?.textContent).toContain('1 %');
    expect(getByTestId('tangent-aiming-exterior-criterion-ok')).toBeTruthy();
  });

  it('should render the not respected icon when the criterion fails', () => {
    component.result.set({ parameter: 10, uncertainty: 2, criterion: 5, checkValidity: false });
    fixture.detectChanges();
    expect(getByTestId('tangent-aiming-exterior-criterion-ko')).toBeTruthy();
  });

  it('should clear the result when an input changes', () => {
    component.result.set({ parameter: 10, uncertainty: 2, criterion: 5, checkValidity: false });
    setInput('h-acc-distance-input', '12');
    expect(component.result()).toBeNull();
  });

  it('should clear the result when the calculation type changes', () => {
    component.result.set({ parameter: 10, uncertainty: 2, criterion: 5, checkValidity: false });
    component.updateCalculationType('tangente');
    expect(component.result()).toBeNull();
  });
});
