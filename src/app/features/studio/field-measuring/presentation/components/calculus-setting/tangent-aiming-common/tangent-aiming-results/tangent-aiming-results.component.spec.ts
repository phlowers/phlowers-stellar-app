import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { TangentAimingResultsComponent } from './tangent-aiming-results.component';

describe('TangentAimingResults component', () => {
  let fixture: ComponentFixture<TangentAimingResultsComponent>;
  const result = { parameter: 1000, uncertainty: 1.5, criterion: 1, checkValidity: true };

  const getByTestId = (id: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: { 'common.meter': 'm', 'common.yes': 'Yes', 'common.no': 'No' } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        TangentAimingResultsComponent
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(TangentAimingResultsComponent);
    fixture.componentRef.setInput('testIdPrefix', 'test');
    fixture.detectChanges();
  });

  it('should render nothing without result nor error', () => {
    expect(getByTestId('test-parameter')).toBeNull();
    expect(getByTestId('calculation-error')).toBeNull();
  });

  it('should render the calculation error', () => {
    fixture.componentRef.setInput('hasError', true);
    fixture.detectChanges();
    expect(getByTestId('calculation-error')).toBeTruthy();
  });

  it('should flag the output as busy while calculating', () => {
    fixture.componentRef.setInput('isCalculating', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('output').getAttribute('aria-busy')).toBe('true');
  });

  it('should render the validity format by default', () => {
    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();
    expect(getByTestId('test-parameter')?.textContent?.trim()).toBe('1000 m');
    expect(getByTestId('test-uncertainty')?.textContent?.trim()).toBe('1.5 m');
    expect(getByTestId('test-criterion')?.textContent).toContain('Yes');
    expect(getByTestId('test-criterion-ok')).toBeTruthy();
  });

  it('should render the percent format', () => {
    fixture.componentRef.setInput('result', { ...result, criterion: 5, checkValidity: false });
    fixture.componentRef.setInput('format', 'percent');
    fixture.detectChanges();
    expect(getByTestId('test-uncertainty')?.textContent?.trim()).toBe('2 m');
    expect(getByTestId('test-criterion')?.textContent).toContain('5 %');
    expect(getByTestId('test-criterion-ko')).toBeTruthy();
  });
});
