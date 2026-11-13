import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { TangentAimingResultsComponent } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-results/tangent-aiming-results.component';

describe('TangentAimingResults component', () => {
  let fixture: ComponentFixture<TangentAimingResultsComponent>;
  const result = { parameter: 1000, uncertainty: 1.5, criterion: 1, checkValidity: true };

  const getByTestId = (id: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'common.meter': 'm',
              'common.yes': 'Yes',
              'common.no': 'No',
              'common.criterion-one-percent-label': '1% criterion',
              'field-measuring.tangent-aiming-exterior.calculation-failed': 'Failed (exterior)'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        TangentAimingResultsComponent
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(TangentAimingResultsComponent);
    fixture.componentRef.setInput('testIdPrefix', 'test');
    fixture.componentRef.setInput('errorKey', 'field-measuring.tangent-aiming-exterior.calculation-failed');
    fixture.detectChanges();
  });

  it('should render nothing without result nor error', () => {
    expect(getByTestId('test-parameter')).toBeNull();
    expect(getByTestId('calculation-error')).toBeNull();
  });

  it('should render the calculation error of the given mode', () => {
    fixture.componentRef.setInput('hasError', true);
    fixture.detectChanges();
    expect(getByTestId('calculation-error')?.textContent?.trim()).toBe('Failed (exterior)');
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
    expect(getByTestId('test-criterion')?.textContent).toContain('No');
    expect(getByTestId('test-criterion-ko')).toBeTruthy();
  });

  it.each([
    ['percent', true, 'Yes', 'ok', 'ko'],
    ['percent', false, 'No', 'ko', 'ok'],
    ['validity', true, 'Yes', 'ok', 'ko'],
    ['validity', false, 'No', 'ko', 'ok']
  ] as const)(
    'should render the criterion in %s format when validity is %s',
    (format, checkValidity, text, icon, hiddenIcon) => {
      fixture.componentRef.setInput('format', format);
      fixture.componentRef.setInput('result', { ...result, criterion: 7.5, checkValidity });
      fixture.detectChanges();

      expect(getByTestId('test-criterion-label')?.tagName).toBe('DT');
      expect(getByTestId('test-criterion-label')?.textContent?.trim()).toBe('1% criterion');
      expect(getByTestId('test-criterion')?.textContent).toContain(text);
      expect(getByTestId('test-criterion')?.textContent).not.toContain('%');
      expect(getByTestId(`test-criterion-${icon}`)?.classList).toContain(`criterion-${icon}`);
      expect(getByTestId(`test-criterion-${hiddenIcon}`)).toBeNull();
    }
  );
});
