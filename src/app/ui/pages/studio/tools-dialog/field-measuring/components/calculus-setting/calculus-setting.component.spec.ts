import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { CalculusSettingComponent } from './calculus-setting.component';

describe('CalculusSetting component', () => {
  let component: CalculusSettingComponent;
  let fixture: ComponentFixture<CalculusSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalculusSettingComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CalculusSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have PAPOTO selected by default', () => {
    expect(component.selectedCalculusType).toBe('PAPOTO');
  });

  it('should render three radio buttons with correct labels', () => {
    const labels = fixture.debugElement.queryAll(By.css('label'));
    expect(labels.length).toBe(3);
    expect(labels[0].nativeElement.textContent.trim()).toBe('PAPOTO');
    expect(labels[1].nativeElement.textContent.trim()).toBe('Tangent bearings');
    expect(labels[2].nativeElement.textContent.trim()).toBe('PEP');
  });

  it('should display papoto component by default', () => {
    const papotoComponent = fixture.debugElement.query(By.css('app-papoto'));
    const tangentBearingsComponent = fixture.debugElement.query(By.css('app-tangent-bearings'));
    const pepComponent = fixture.debugElement.query(By.css('app-pep'));

    expect(papotoComponent).toBeTruthy();
    expect(tangentBearingsComponent).toBeFalsy();
    expect(pepComponent).toBeFalsy();
  });

  it('should display tangent bearings component when selected', () => {
    component.selectedCalculusType = 'TANGENT_BEARINGS';
    fixture.detectChanges();

    const papotoComponent = fixture.debugElement.query(By.css('app-papoto'));
    const tangentBearingsComponent = fixture.debugElement.query(By.css('app-tangent-bearings'));
    const pepComponent = fixture.debugElement.query(By.css('app-pep'));

    expect(papotoComponent).toBeFalsy();
    expect(tangentBearingsComponent).toBeTruthy();
    expect(pepComponent).toBeFalsy();
  });

  it('should display pep component when selected', () => {
    component.selectedCalculusType = 'PEP';
    fixture.detectChanges();

    const papotoComponent = fixture.debugElement.query(By.css('app-papoto'));
    const tangentBearingsComponent = fixture.debugElement.query(By.css('app-tangent-bearings'));
    const pepComponent = fixture.debugElement.query(By.css('app-pep'));

    expect(papotoComponent).toBeFalsy();
    expect(tangentBearingsComponent).toBeFalsy();
    expect(pepComponent).toBeTruthy();
  });

  it('should switch components when radio button selection changes', () => {
    // Start with PAPOTO
    expect(component.selectedCalculusType).toBe('PAPOTO');
    expect(fixture.debugElement.query(By.css('app-papoto'))).toBeTruthy();

    // Change to TANGENT_BEARINGS
    component.selectedCalculusType = 'TANGENT_BEARINGS';
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('app-tangent-bearings'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-papoto'))).toBeFalsy();

    // Change to PEP
    component.selectedCalculusType = 'PEP';
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('app-pep'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-tangent-bearings'))).toBeFalsy();
  });
});
