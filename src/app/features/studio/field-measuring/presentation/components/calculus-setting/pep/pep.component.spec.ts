import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PepComponent } from './pep.component';
import { PEP_MOCK_RESULT } from './pep.constantes';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';

import { TranslocoTestingModule } from '@jsverse/transloco';

describe('Pep component', () => {
  let fixture: ComponentFixture<PepComponent>;
  let componentRef: ComponentRef<PepComponent>;
  let component: PepComponent;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const setMeasure = (overrides: Partial<FieldMeasure> = {}) => {
    componentRef.setInput(
      'measureData',
      createTestMeasureData({ calculationMethod: 'pep', pepLeftSupport: '1', ...overrides })
    );
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        PepComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: PlotSpanService,
          useValue: {
            section: signal({
              supports: [{ number: 'S1' }, { number: 'SUPPORT-LONG-NUMBER' }, { number: 'S3' }]
            })
          }
        },
        {
          provide: PlotService,
          useValue: {
            litData: signal({ output_parameters: { span_length: [100, 150, 200], elevation: [5.5, 10.75, -3.25] } })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PepComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    setMeasure();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should keep the help and import buttons disabled', () => {
    expect((getByTestId('pep-help-btn') as HTMLButtonElement).disabled).toBe(true);
    expect((getByTestId('pep-import-station-data-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should render one x and one y input per sight', () => {
    for (const index of [1, 2, 3]) {
      expect(getByTestId(`pep-x-sight-${index}-input`)).toBeTruthy();
      expect(getByTestId(`pep-y-sight-${index}-input`)).toBeTruthy();
    }
  });

  it('should show the usage and mandatory messages', () => {
    expect(getByTestId('pep-usage-msg')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#mandatory-pep')).toBeTruthy();
  });

  it('should list every support of the section with a number truncated to 5 characters (RG.PEP.SUP.1)', () => {
    expect(component.leftSupportOptions()).toEqual([
      { label: 'S1', value: '0' },
      { label: 'SUPPO', value: '1' },
      { label: 'S3', value: '2' }
    ]);
  });

  it('should show the span length and elevation difference of the span starting at the left support (RG.PEP.LON-CAL.1, RG.PEP.DEN-CAL.1)', () => {
    expect(component.calculatedSpanLength()).toBe(150);
    expect(component.calculatedElevation()).toBe(10.75);
    expect(getByTestId('pep-length-input')?.closest('.pep__form')?.textContent).toContain('150');
  });

  it('should follow the left support and invalidate the previous result when it changes (RG.PEP.SUP.1)', () => {
    component.calculate();
    expect(component.measureData().outputs.pep).toEqual(PEP_MOCK_RESULT);

    component.updateField('pepLeftSupport', '2');
    fixture.detectChanges();
    expect(component.measureData().pepLeftSupport).toBe('2');
    expect(component.measureData().outputs.pep).toBeNull();
    expect(component.calculatedSpanLength()).toBe(200);
    expect(component.calculatedElevation()).toBe(-3.25);
  });

  it('should disable the calculate button without left support (RG.PEP.CAL-BNT.1)', () => {
    setMeasure({ pepLeftSupport: null });
    expect((getByTestId('pep-calculate-btn') as HTMLButtonElement).disabled).toBe(true);
    component.calculate();
    expect(component.measureData().outputs.pep).toBeNull();
  });

  it('should hide the results of a stored result when the form is invalid', () => {
    setMeasure({ xSight2: -1, outputs: { ...createTestMeasureData().outputs, pep: PEP_MOCK_RESULT } });
    expect(getByTestId('pep-parameter')).toBeNull();
  });

  it('should offer a filterable left support list (RG.PEP.SUP.2)', () => {
    const select = fixture.debugElement.query(By.css('[data-testid="pep-left-support-select"]'));
    expect(select.componentInstance.filter).toBe(true);
  });

  it('should show the calculated elevation, or a dash without left support, as read-only text (RG.PEP.DEN-CAL.2, LON-CAL.2)', () => {
    const calculated = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
    expect(calculated('elevationDifferenceBetweenSightGD-calculated').textContent).toContain('10.75');
    expect(calculated('lengthBetweenSightGD-calculated').querySelector('input')).toBeNull();

    setMeasure({ pepLeftSupport: null });
    expect(calculated('elevationDifferenceBetweenSightGD-calculated').textContent).toContain('-');
    expect(calculated('lengthBetweenSightGD-calculated').textContent).toContain('-');
  });

  it('should render the results as read-only text with no input (RG.PEP.PAR-RES.2)', () => {
    component.calculate();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pep__results')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.pep__results input')).toBeNull();
  });

  it('should have no calculated value without left support', () => {
    setMeasure({ pepLeftSupport: null });
    expect(component.calculatedSpanLength()).toBeNull();
    expect(component.calculatedElevation()).toBeNull();
  });

  it('should disable the calculate button while the form is invalid (RG.PEP.CAL-BNT.1)', () => {
    expect((getByTestId('pep-calculate-btn') as HTMLButtonElement).disabled).toBe(false);
    component.updateField('xSight1', 5001);
    fixture.detectChanges();
    expect((getByTestId('pep-calculate-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should hide the results until the calculation is requested (RG.PEP.RES-CAD.1)', () => {
    expect(getByTestId('pep-parameter')).toBeNull();
  });

  it('should show the results on calculate, keeping the inputs editable (RG.PEP.CAL-BNT.2, PAR/INC/P*-RES.1)', () => {
    (getByTestId('pep-calculate-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.measureData().outputs.pep).toEqual(PEP_MOCK_RESULT);
    expect(getByTestId('pep-parameter')?.textContent?.trim()).toContain('2,000');
    expect(getByTestId('pep-uncertainty')?.textContent?.trim()).toContain('5.0');
    expect(getByTestId('pep-parameter-1-2')?.textContent?.trim()).toContain('1,990');
    expect(getByTestId('pep-parameter-2-3')?.textContent?.trim()).toContain('2,010');
    expect(getByTestId('pep-parameter-1-3')?.textContent?.trim()).toContain('2,000');
    expect((getByTestId('pep-x-sight-1-input') as HTMLInputElement).disabled).toBe(false);
  });

  it('should show the criterion as met or not met with its icon (RG.PEP.CRI-RES.1/3)', () => {
    setMeasure({ outputs: { ...createTestMeasureData().outputs, pep: { ...PEP_MOCK_RESULT, checkValidity: true } } });
    expect(getByTestId('pep-criterion')?.textContent).toContain('common.yes');
    expect(getByTestId('pep-criterion')?.querySelector('.criterion-ok')).toBeTruthy();

    setMeasure({ outputs: { ...createTestMeasureData().outputs, pep: { ...PEP_MOCK_RESULT, checkValidity: false } } });
    expect(getByTestId('pep-criterion')?.textContent).toContain('common.no');
    expect(getByTestId('pep-criterion')?.querySelector('.criterion-ko')).toBeTruthy();
  });

  it('should hide the results when an input is modified or invalid', () => {
    component.calculate();
    fixture.detectChanges();
    expect(getByTestId('pep-parameter')).toBeTruthy();

    component.updateField('ySight3', 12.5);
    fixture.detectChanges();
    expect(component.measureData().ySight3).toBe(12.5);
    expect(component.measureData().calculationMethod).toBe('pep');
    expect(component.measureData().outputs.pep).toBeNull();
    expect(getByTestId('pep-parameter')).toBeNull();
  });

  it('should not calculate an invalid form', () => {
    component.updateField('ySight3', 1000.01);
    component.calculate();
    expect(component.measureData().outputs.pep).toBeNull();
  });
});
