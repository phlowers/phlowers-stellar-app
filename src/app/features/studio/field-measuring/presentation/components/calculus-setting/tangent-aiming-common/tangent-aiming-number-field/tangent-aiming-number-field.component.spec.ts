import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { TangentAimingNumberFieldComponent } from './tangent-aiming-number-field.component';
import { createNumberControl } from '../tangent-aiming-common.helpers';
import { TANGENT_AIMING_FIELD_RULES } from '../tangent-aiming-common.constantes';

describe('TangentAimingNumberField component', () => {
  let fixture: ComponentFixture<TangentAimingNumberFieldComponent>;
  const control = createNumberControl(TANGENT_AIMING_FIELD_RULES.parameter);
  const view = {
    id: 'testParameter',
    labelKey: 'common.parameter-label',
    unitKey: 'common.meter',
    testId: 'parameter-input',
    step: 1,
    area: 'parameter'
  };

  const getInput = (): HTMLInputElement => fixture.nativeElement.querySelector('[data-testid="parameter-input"]');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: { 'common.parameter-label': 'Parameter', 'common.meter': 'm' } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        TangentAimingNumberFieldComponent
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(TangentAimingNumberFieldComponent);
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('view', view);
    fixture.componentRef.setInput('rule', TANGENT_AIMING_FIELD_RULES.parameter);
    fixture.componentRef.setInput('mandatoryId', 'mandatory-test');
    fixture.detectChanges();
  });

  it('should render a labelled input bound to the rule and placed in its grid area', () => {
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
    expect(label.htmlFor).toBe('testParameter');
    expect(label.textContent).toContain('Parameter');
    expect(getInput().getAttribute('min')).toBe('20');
    expect(getInput().getAttribute('max')).toBe('5000');
    expect(getInput().getAttribute('aria-describedby')).toBe('mandatory-test');
    expect(fixture.nativeElement.classList).toContain('parameter');
  });

  it('should add the extra description to aria-describedby', () => {
    fixture.componentRef.setInput('describedBy', 'extra-desc');
    fixture.detectChanges();
    expect(getInput().getAttribute('aria-describedby')).toBe('mandatory-test extra-desc');
  });

  it('should write the typed value to the control', () => {
    getInput().value = '42';
    getInput().dispatchEvent(new Event('input'));
    expect(control.value).toBe(42);
  });

  it('should render the error and flag the input as invalid', () => {
    expect(getInput().getAttribute('aria-invalid')).toBeNull();
    expect(getInput().classList).not.toContain('p-invalid');
    fixture.componentRef.setInput('error', 'Required');
    fixture.detectChanges();
    expect(getInput().getAttribute('aria-invalid')).toBe('true');
    expect(getInput().classList).toContain('p-invalid');
    expect(getInput().getAttribute('aria-errormessage')).toBe('testParameter-error');
    expect(fixture.nativeElement.querySelector('#testParameter-error')?.textContent).toContain('Required');
  });
});
