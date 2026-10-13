import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { TangentAimingSupportComponent } from './tangent-aiming-support.component';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';

describe('TangentAimingSupport component', () => {
  let component: TangentAimingSupportComponent;
  let fixture: ComponentFixture<TangentAimingSupportComponent>;
  let componentRef: ComponentRef<TangentAimingSupportComponent>;

  const getByTestId = (id: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        TangentAimingSupportComponent
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TangentAimingSupportComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('measureData', createTestMeasureData());
    componentRef.setInput('leftSupportOption', [{ label: '1', value: '1' }]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render all form fields', () => {
    [
      'left-support-select',
      'span-length-input',
      'h-acc-distance-input',
      'vertical-acc-angle-input',
      'calculation-type-selector',
      'tangent-angle-input'
    ].forEach((id) => expect(getByTestId(id)).toBeTruthy());
  });

  it('should expose parameter and tangent calculation type options', () => {
    expect(component.calculationTypeOptions().map((o) => o.value)).toEqual(['parametre', 'tangente']);
  });

  it('should update measureData through updateField', () => {
    component.updateField('cableHAccDistance', 12);
    component.updateField('calculationType', 'tangente');
    expect(component.measureData().cableHAccDistance).toBe(12);
    expect(component.measureData().calculationType).toBe('tangente');
  });

  it('should update measureData when typing in an input', () => {
    const input = getByTestId('tangent-angle-input') as HTMLInputElement;
    input.value = '5';
    input.dispatchEvent(new Event('input'));
    expect(component.measureData().cableTangentAngle).toBe(5);
  });

  it('should keep the calculate button disabled and results empty', () => {
    expect((getByTestId('calculate-tangent-aiming-support-btn') as HTMLButtonElement).disabled).toBe(true);
    expect(getByTestId('tangent-aiming-support-parameter')?.textContent?.trim()).toBe('- m');
    expect(getByTestId('tangent-aiming-support-uncertainty')?.textContent?.trim()).toBe('- m');
  });
});
