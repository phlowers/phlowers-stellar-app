import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CalculusSettingComponent } from './calculus-setting.component';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('CalculusSetting component', () => {
  let component: CalculusSettingComponent;
  let fixture: ComponentFixture<CalculusSettingComponent>;
  let componentRef: ComponentRef<CalculusSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'common.papoto-label': 'PAPOTO',
              'common.pep-label': 'PEP',
              'field-measuring.calculus-setting.tangent-aiming-radio-label': 'Tangent aiming (Support)',
              'field-measuring.calculus-setting.tangent-aiming-exterior-radio-label': 'Tangent aiming (Exterior)',
              'field-measuring.calculus-setting.tangent-aiming-interior-radio-label': 'Tangent aiming (Interior)'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        CalculusSettingComponent
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(CalculusSettingComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('measureData', createTestMeasureData());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have PAPOTO selected by default', () => {
    expect(component.selectedCalculusType()).toBe('PAPOTO');
  });

  it('should render five radio buttons with correct labels', () => {
    const labels = fixture.debugElement.queryAll(By.css('.cac-set-select label'));
    expect(labels[0].nativeElement.textContent.trim()).toBe('PAPOTO');
    expect(labels[1].nativeElement.textContent.trim()).toBe('Tangent aiming (Support)');
    expect(labels[2].nativeElement.textContent.trim()).toBe('Tangent aiming (Exterior)');
    expect(labels[3].nativeElement.textContent.trim()).toBe('Tangent aiming (Interior)');
    expect(labels[4].nativeElement.textContent.trim()).toBe('PEP');
  });

  it('should display the tangent aiming exterior component when selected and persist the method', () => {
    component.onCalculusTypeChange('TANGENT_AIMING_EXTERIOR');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-tangent-aiming-exterior'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-papoto'))).toBeFalsy();
    expect(component.measureData().calculationMethod).toBe('tangente-aiming-exterior');
  });

  it('should display the tangent aiming interior component when selected and persist the method', () => {
    component.onCalculusTypeChange('TANGENT_AIMING_INTERIOR');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-tangent-aiming-interior'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-papoto'))).toBeFalsy();
    expect(component.measureData().calculationMethod).toBe('tangente-aiming-interior');
  });

  it('should keep the exterior selection when the measure is edited', () => {
    expect(component.selectedCalculusType()).toBe('PAPOTO');
    component.onCalculusTypeChange('TANGENT_AIMING_EXTERIOR');
    component.measureData.update((d) => ({ ...d, name: 'edited' }));
    expect(component.selectedCalculusType()).toBe('TANGENT_AIMING_EXTERIOR');
  });

  it('should display papoto component by default', () => {
    const papotoComponent = fixture.debugElement.query(By.css('app-papoto'));
    const tangentAimingComponent = fixture.debugElement.query(By.css('app-tangent-aiming-support'));
    const pepComponent = fixture.debugElement.query(By.css('app-pep'));

    expect(papotoComponent).toBeTruthy();
    expect(tangentAimingComponent).toBeFalsy();
    expect(pepComponent).toBeFalsy();
  });

  it('should display tangent aiming component when selected', () => {
    component.selectedCalculusType.set('TANGENT_AIMING_SUPPORT');
    componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    const papotoComponent = fixture.debugElement.query(By.css('app-papoto'));
    const tangentAimingComponent = fixture.debugElement.query(By.css('app-tangent-aiming-support'));
    const pepComponent = fixture.debugElement.query(By.css('app-pep'));

    expect(papotoComponent).toBeFalsy();
    expect(tangentAimingComponent).toBeTruthy();
    expect(pepComponent).toBeFalsy();
  });

  it('should display pep component when selected', () => {
    component.selectedCalculusType.set('PEP');
    componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    const papotoComponent = fixture.debugElement.query(By.css('app-papoto'));
    const tangentAimingComponent = fixture.debugElement.query(By.css('app-tangent-aiming-support'));
    const pepComponent = fixture.debugElement.query(By.css('app-pep'));

    expect(papotoComponent).toBeFalsy();
    expect(tangentAimingComponent).toBeFalsy();
    expect(pepComponent).toBeTruthy();
  });

  it('should switch components when radio button selection changes', async () => {
    // Start with PAPOTO
    expect(component.selectedCalculusType()).toBe('PAPOTO');
    expect(fixture.debugElement.query(By.css('app-papoto'))).toBeTruthy();

    // Change to TANGENT_AIMING_SUPPORT
    component.selectedCalculusType.set('TANGENT_AIMING_SUPPORT');
    componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.debugElement.query(By.css('app-tangent-aiming-support'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-papoto'))).toBeFalsy();

    // Change to PEP
    component.selectedCalculusType.set('PEP');
    componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.debugElement.query(By.css('app-pep'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-tangent-aiming-support'))).toBeFalsy();
  });

  describe('method persistence', () => {
    it('should persist the tangent aiming method and apply its defaults on selection', () => {
      component.onCalculusTypeChange('TANGENT_AIMING_SUPPORT');
      const data = component.measureData();
      expect(data.calculationMethod).toBe('tangente-aiming');
      expect(data.cableParameter).toBe(20);
      expect(data.tangentSpanLength).toBe(0);
      expect(component.selectedCalculusType()).toBe('TANGENT_AIMING_SUPPORT');
    });

    it('should not touch PAPOTO fields when selecting tangent aiming', () => {
      const before = component.measureData();
      component.onCalculusTypeChange('TANGENT_AIMING_SUPPORT');
      expect(component.measureData().leftSupport).toBe(before.leftSupport);
      expect(component.measureData().outputs.papoto).toBe(before.outputs.papoto);
    });

    it('should persist the exterior method and apply its defaults without touching the other modes', () => {
      const before = component.measureData();
      component.onCalculusTypeChange('TANGENT_AIMING_EXTERIOR');
      const data = component.measureData();
      expect(data.calculationMethod).toBe('tangente-aiming-exterior');
      expect(data.exteriorParameter).toBe(20);
      expect(data.exteriorSpanLength).toBe(0);
      expect(data.exteriorCalculationType).toBe('parametre');
      expect(data.cableParameter).toBe(before.cableParameter);
      expect(data.leftSupport).toBe(before.leftSupport);
      expect(component.selectedCalculusType()).toBe('TANGENT_AIMING_EXTERIOR');
    });

    it('should persist the interior method and apply its defaults without touching the other modes', () => {
      const before = component.measureData();
      component.onCalculusTypeChange('TANGENT_AIMING_INTERIOR');
      const data = component.measureData();
      expect(data.calculationMethod).toBe('tangente-aiming-interior');
      expect(data.interiorParameter).toBe(20);
      expect(data.interiorSpanLength).toBe(0);
      expect(data.interiorHAccDistance).toBe(0);
      expect(data.interiorVerticalAccAngleLeft).toBe(0);
      expect(data.interiorVerticalAccAngleRight).toBe(0);
      expect(data.exteriorParameter).toBe(before.exteriorParameter);
      expect(data.cableParameter).toBe(before.cableParameter);
      expect(component.selectedCalculusType()).toBe('TANGENT_AIMING_INTERIOR');
    });

    it('should keep the values of the interior mode when switching away and back', () => {
      component.onCalculusTypeChange('TANGENT_AIMING_INTERIOR');
      component.measureData.update((d) => ({ ...d, interiorHAccDistance: 7 }));
      component.onCalculusTypeChange('TANGENT_AIMING_EXTERIOR');
      component.onCalculusTypeChange('TANGENT_AIMING_INTERIOR');
      expect(component.measureData().interiorHAccDistance).toBe(7);
    });

    it('should keep the values of the exterior mode when switching away and back', () => {
      component.onCalculusTypeChange('TANGENT_AIMING_EXTERIOR');
      component.measureData.update((d) => ({ ...d, exteriorHAccDistance: 7 }));
      component.onCalculusTypeChange('TANGENT_AIMING_SUPPORT');
      component.onCalculusTypeChange('TANGENT_AIMING_EXTERIOR');
      expect(component.measureData().exteriorHAccDistance).toBe(7);
    });

    it('should switch back to PAPOTO', () => {
      component.onCalculusTypeChange('TANGENT_AIMING_SUPPORT');
      component.onCalculusTypeChange('PAPOTO');
      expect(component.measureData().calculationMethod).toBe('papoto');
    });

    describe('15°C result of the previous method', () => {
      const parameter15C = { parameter15CMinusUncertainty: 1, parameter15C: 2, parameter15CPlusUncertainty: 3 };
      const withParameter15C = (updateMode15C: 'auto' | 'manual') => {
        const base = createTestMeasureData({ updateMode15C });
        return { ...base, outputs: { ...base.outputs, parameter15C } };
      };

      it.each(['PAPOTO', 'TANGENT_AIMING_SUPPORT', 'TANGENT_AIMING_EXTERIOR', 'TANGENT_AIMING_INTERIOR'])(
        'should clear it in auto mode when selecting %s',
        (type) => {
          componentRef.setInput('measureData', withParameter15C('auto'));
          fixture.detectChanges();
          component.onCalculusTypeChange(type);
          expect(component.measureData().outputs.parameter15C).toBeNull();
        }
      );

      it('should preserve it in manual mode', () => {
        componentRef.setInput('measureData', withParameter15C('manual'));
        fixture.detectChanges();
        component.onCalculusTypeChange('TANGENT_AIMING_EXTERIOR');
        expect(component.measureData().outputs.parameter15C).toEqual(parameter15C);
      });
    });

    it('should not persist PEP', () => {
      component.onCalculusTypeChange('PEP');
      expect(component.measureData().calculationMethod).toBe('papoto');
    });

    it('should restore the selection from a saved measure', () => {
      componentRef.setInput('measureData', createTestMeasureData({ calculationMethod: 'tangente-aiming' }));
      fixture.detectChanges();
      expect(component.selectedCalculusType()).toBe('TANGENT_AIMING_SUPPORT');
    });

    it('should restore the interior selection from a saved measure', () => {
      componentRef.setInput('measureData', createTestMeasureData({ calculationMethod: 'tangente-aiming-interior' }));
      fixture.detectChanges();
      expect(component.selectedCalculusType()).toBe('TANGENT_AIMING_INTERIOR');
    });
  });

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    it('should render papoto-radio', () => {
      expect(getByTestId('papoto-radio')).toBeTruthy();
    });

    it('should render tangent-aiming-radio', () => {
      expect(getByTestId('tangent-aiming-radio')).toBeTruthy();
    });

    it('should render tangent-aiming-exterior-radio', () => {
      expect(getByTestId('tangent-aiming-exterior-radio')).toBeTruthy();
    });

    it('should render tangent-aiming-interior-radio', () => {
      expect(getByTestId('tangent-aiming-interior-radio')).toBeTruthy();
    });

    it('should render pep-radio', () => {
      expect(getByTestId('pep-radio')).toBeTruthy();
    });
  });
});
