import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { By } from '@angular/platform-browser';

import { PapotoComponent } from './papoto.component';
import { INITIAL_MEASURE_DATA, leftSupportOption } from '../../../mock-data';

describe('Papoto component', () => {
  let component: PapotoComponent;
  let fixture: ComponentFixture<PapotoComponent>;
  let componentRef: ComponentRef<PapotoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PapotoComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PapotoComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('leftSupportOption', leftSupportOption);
    componentRef.setInput('measureData', { ...INITIAL_MEASURE_DATA });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize all form fields from measureData', () => {
    const data = component.measureData();
    expect(data.leftSupport).toBe('');
    expect(data.spanLength).toBeNull();
    expect(data.measuredElevationDifference).toBeNull();
    expect(data.HG).toBeNull();
    expect(data.H1).toBeNull();
    expect(data.H2).toBeNull();
    expect(data.H3).toBeNull();
    expect(data.HD).toBeNull();
    expect(data.VG).toBeNull();
    expect(data.V1).toBeNull();
    expect(data.V2).toBeNull();
    expect(data.V3).toBeNull();
    expect(data.VD).toBeNull();
  });

  it('should render left support select field', () => {
    const selectElement = fixture.debugElement.query(By.css('p-select'));
    expect(selectElement).toBeTruthy();
  });

  it('should update measureData when form values change', () => {
    component.updateField('spanLength', 100.5);
    component.updateField('HG', 50.25);
    component.updateField('VG', 30.75);

    const data = component.measureData();
    expect(data.spanLength).toBe(100.5);
    expect(data.HG).toBe(50.25);
    expect(data.VG).toBe(30.75);
  });

  it('should open help dialog when openHelp is called', () => {
    expect(component.papotoHelpDialog()).toBe(false);

    component.openHelp();

    expect(component.papotoHelpDialog()).toBe(true);
  });

  it('should calculate PAPOTO and show results', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Set all required fields
    component.updateField('leftSupport', '12');
    component.updateField('spanLength', 100);
    component.updateField('measuredElevationDifference', 5);
    component.updateField('HG', 10);
    component.updateField('H1', 20);
    component.updateField('H2', 30);
    component.updateField('H3', 40);
    component.updateField('HD', 50);
    component.updateField('VG', 15);
    component.updateField('V1', 25);
    component.updateField('V2', 35);
    component.updateField('V3', 45);
    component.updateField('VD', 55);

    expect(component.papotoResults()).toBe(false);

    component.calculatePapoto();

    expect(consoleSpy).toHaveBeenCalledWith('PAPOTO Calculation Values:', {
      leftSupport: '12',
      spanLength: 100,
      measuredElevationDifference: 5,
      HG: 10,
      H1: 20,
      H2: 30,
      H3: 40,
      HD: 50,
      VG: 15,
      V1: 25,
      V2: 35,
      V3: 45,
      VD: 55
    });
    expect(component.papotoResults()).toBe(true);

    consoleSpy.mockRestore();
  });

  it('should validate form correctly with isFormValid', () => {
    expect(component.isFormValid()).toBe(false);

    // Set all required fields
    component.updateField('leftSupport', '12');
    component.updateField('spanLength', 100);
    component.updateField('measuredElevationDifference', 5);
    component.updateField('HG', 10);
    component.updateField('H1', 20);
    component.updateField('H2', 30);
    component.updateField('H3', 40);
    component.updateField('HD', 50);
    component.updateField('VG', 15);
    component.updateField('V1', 25);
    component.updateField('V2', 35);
    component.updateField('V3', 45);
    component.updateField('VD', 55);

    expect(component.isFormValid()).toBe(true);
  });
});
