import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PepComponent } from './pep.component';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { PlotSpanService } from '@services/plot/plot-span.service';

import { TranslocoTestingModule } from '@jsverse/transloco';

describe('Pep component', () => {
  let fixture: ComponentFixture<PepComponent>;
  let componentRef: ComponentRef<PepComponent>;
  let component: PepComponent;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

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
        { provide: PlotSpanService, useValue: { section: signal(null) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PepComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('measureData', createTestMeasureData({ calculationMethod: 'pep' }));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should keep the help, import and calculate buttons disabled', () => {
    expect((getByTestId('pep-help-btn') as HTMLButtonElement).disabled).toBe(true);
    expect((getByTestId('pep-import-station-data-btn') as HTMLButtonElement).disabled).toBe(true);
    expect((getByTestId('pep-calculate-btn') as HTMLButtonElement).disabled).toBe(true);
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

  it('should show the six results as placeholders', () => {
    for (const id of ['parameter', 'uncertainty', 'parameter-1-2', 'parameter-2-3', 'parameter-1-3', 'criterion']) {
      expect(getByTestId(`pep-${id}`)?.textContent?.trim()).toBe('-');
    }
  });

  it('should write a sight coordinate into the measure model', () => {
    component.updateField('xSight2', 12.5);
    expect(component.measureData().xSight2).toBe(12.5);
    expect(component.measureData().calculationMethod).toBe('pep');
  });
});
