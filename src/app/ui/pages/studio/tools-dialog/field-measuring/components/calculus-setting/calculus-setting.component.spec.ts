import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { By } from '@angular/platform-browser';

import { CalculusSettingComponent } from './calculus-setting.component';
import { INITIAL_MEASURE_DATA } from '../../mock-data';

describe('CalculusSetting component', () => {
  let component: CalculusSettingComponent;
  let fixture: ComponentFixture<CalculusSettingComponent>;
  let componentRef: ComponentRef<CalculusSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalculusSettingComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CalculusSettingComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('measureData', { ...INITIAL_MEASURE_DATA });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have PAPOTO selected by default', () => {
    expect(component.selectedCalculusType).toBe('PAPOTO');
  });

  it('should render three radio buttons with correct labels', () => {
    const labels = fixture.debugElement.queryAll(
      By.css('.cac-set-select label')
    );
    expect(labels[0].nativeElement.textContent.trim()).toBe('PAPOTO');
    expect(labels[1].nativeElement.textContent.trim()).toBe('Tangent aiming');
    expect(labels[2].nativeElement.textContent.trim()).toBe('PEP');
  });

  it('should display papoto component by default', () => {
    const papotoComponent = fixture.debugElement.query(By.css('app-papoto'));
    const tangentAimingComponent = fixture.debugElement.query(
      By.css('app-tangent-aiming')
    );
    const pepComponent = fixture.debugElement.query(By.css('app-pep'));

    expect(papotoComponent).toBeTruthy();
    expect(tangentAimingComponent).toBeFalsy();
    expect(pepComponent).toBeFalsy();
  });

  it('should display tangent aiming component when selected', () => {
    component.selectedCalculusType = 'TANGENT_AIMING';
    fixture.detectChanges();

    const papotoComponent = fixture.debugElement.query(By.css('app-papoto'));
    const tangentAimingComponent = fixture.debugElement.query(
      By.css('app-tangent-aiming')
    );
    const pepComponent = fixture.debugElement.query(By.css('app-pep'));

    expect(papotoComponent).toBeFalsy();
    expect(tangentAimingComponent).toBeTruthy();
    expect(pepComponent).toBeFalsy();
  });

  it('should display pep component when selected', () => {
    component.selectedCalculusType = 'PEP';
    fixture.detectChanges();

    const papotoComponent = fixture.debugElement.query(By.css('app-papoto'));
    const tangentAimingComponent = fixture.debugElement.query(
      By.css('app-tangent-aiming')
    );
    const pepComponent = fixture.debugElement.query(By.css('app-pep'));

    expect(papotoComponent).toBeFalsy();
    expect(tangentAimingComponent).toBeFalsy();
    expect(pepComponent).toBeTruthy();
  });

  it('should switch components when radio button selection changes', () => {
    // Start with PAPOTO
    expect(component.selectedCalculusType).toBe('PAPOTO');
    expect(fixture.debugElement.query(By.css('app-papoto'))).toBeTruthy();

    // Change to TANGENT_AIMING
    component.selectedCalculusType = 'TANGENT_AIMING';
    fixture.detectChanges();
    expect(
      fixture.debugElement.query(By.css('app-tangent-aiming'))
    ).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-papoto'))).toBeFalsy();

    // Change to PEP
    component.selectedCalculusType = 'PEP';
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('app-pep'))).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('app-tangent-aiming'))
    ).toBeFalsy();
  });
});
