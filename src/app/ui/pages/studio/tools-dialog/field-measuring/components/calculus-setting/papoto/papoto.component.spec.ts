import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { By } from '@angular/platform-browser';

import { PapotoComponent } from './papoto.component';

describe('Papoto component', () => {
  let component: PapotoComponent;
  let fixture: ComponentFixture<PapotoComponent>;
  let componentRef: ComponentRef<PapotoComponent>;

  const mockLeftSupportOptions = [
    { label: '12', value: '12' },
    { label: '13', value: '13' },
    { label: '14', value: '14' },
    { label: '15', value: '15' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PapotoComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PapotoComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('leftSupportOption', mockLeftSupportOptions);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize all form fields with null values', () => {
    expect(component.leftSupport).toBeNull();
    expect(component.spanLength).toBeNull();
    expect(component.measuredElevationDifference).toBeNull();
    expect(component.HG).toBeNull();
    expect(component.H1).toBeNull();
    expect(component.H2).toBeNull();
    expect(component.H3).toBeNull();
    expect(component.HD).toBeNull();
    expect(component.VG).toBeNull();
    expect(component.V1).toBeNull();
    expect(component.V2).toBeNull();
    expect(component.V3).toBeNull();
    expect(component.VD).toBeNull();
  });

  it('should render left support select field', () => {
    const selectElement = fixture.debugElement.query(By.css('p-select'));
    expect(selectElement).toBeTruthy();
  });

  it('should render all input fields', () => {
    const inputElements = fixture.debugElement.queryAll(By.css('input[type="number"]'));
    expect(inputElements.length).toBe(12); // 2 with units + 10 measurements
  });

  it('should render all labels with correct for attributes', () => {
    const labels = fixture.debugElement.queryAll(By.css('label'));
    expect(labels.length).toBe(13); // 1 for select + 12 for inputs

    expect(labels[0].nativeElement.getAttribute('for')).toBe('leftSupport');
    expect(labels[1].nativeElement.getAttribute('for')).toBe('spanLength');
    expect(labels[2].nativeElement.getAttribute('for')).toBe('measuredElevationDifference');
  });

  it('should have correct ids on input fields', () => {
    const spanLengthInput = fixture.debugElement.query(By.css('#spanLength'));
    const measuredElevationDifferenceInput = fixture.debugElement.query(By.css('#measuredElevationDifference'));
    const hgInput = fixture.debugElement.query(By.css('#HG'));

    expect(spanLengthInput).toBeTruthy();
    expect(measuredElevationDifferenceInput).toBeTruthy();
    expect(hgInput).toBeTruthy();
  });

  it('should render unit suffixes for span length and elevation difference', () => {
    const unitElements = fixture.debugElement.queryAll(By.css('p-inputgroupaddon'));
    expect(unitElements.length).toBe(2);
    expect(unitElements[0].nativeElement.textContent.trim()).toBe('m');
    expect(unitElements[1].nativeElement.textContent.trim()).toBe('m');
  });

  it('should update component properties when form values change', () => {
    component.spanLength = 100.5;
    component.HG = 50.25;
    component.VG = 30.75;

    expect(component.spanLength).toBe(100.5);
    expect(component.HG).toBe(50.25);
    expect(component.VG).toBe(30.75);
  });
});
