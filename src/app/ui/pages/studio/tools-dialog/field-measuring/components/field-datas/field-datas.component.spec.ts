import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { FieldDatasComponent } from './field-datas.component';
import { INITIAL_MEASURE_DATA } from '../../mock-data';
import { FieldMeasureData } from '../../types';

describe('FieldDatasComponent', () => {
  let component: FieldDatasComponent;
  let fixture: ComponentFixture<FieldDatasComponent>;
  let componentRef: ComponentRef<FieldDatasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldDatasComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FieldDatasComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('measureData', { ...INITIAL_MEASURE_DATA });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have required inputs', () => {
    expect(component.measureData).toBeDefined();
  });

  it('should initialize with correct constant values', () => {
    expect(component.timeModeOptions).toBeDefined();
    expect(component.windSpeedUnitOptions).toBeDefined();
    expect(component.windDirectionOptions).toBeDefined();
    expect(component.skyCoverOptions).toBeDefined();
  });

  describe('onFieldChange', () => {
    it('should emit fieldChange event with correct field and value', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('date', new Date('2024-01-01'));

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'date',
        value: new Date('2024-01-01')
      });
    });

    it('should handle time field changes', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('time', '14:30');

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'time',
        value: '14:30'
      });
    });

    it('should handle season field changes', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('season', 'winter');

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'season',
        value: 'winter'
      });
    });

    it('should handle ambientTemperature field changes', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('ambientTemperature', 25.5);

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'ambientTemperature',
        value: 25.5
      });
    });

    it('should handle windSpeed field changes', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('windSpeed', 10.5);

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'windSpeed',
        value: 10.5
      });
    });

    it('should handle windSpeedUnit field changes', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('windSpeedUnit', 'ms');

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'windSpeedUnit',
        value: 'ms'
      });
    });

    it('should handle windDirection field changes', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('windDirection', 'South');

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'windDirection',
        value: 'South'
      });
    });

    it('should handle skyCover field changes', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('skyCover', '4 (partly cloudy)');

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'skyCover',
        value: '4 (partly cloudy)'
      });
    });

    it('should handle null values', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('ambientTemperature', null);

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'ambientTemperature',
        value: null
      });
    });
  });

  describe('Component Rendering', () => {
    it('should display measureData values', () => {
      const data: FieldMeasureData = {
        ...INITIAL_MEASURE_DATA,
        time: '12:00',
        season: 'summer',
        ambientTemperature: 25,
        windSpeed: 10,
        windDirection: 'North',
        skyCover: '0 (clear)'
      };

      componentRef.setInput('measureData', data);
      fixture.detectChanges();

      expect(component.measureData()).toEqual(data);
    });

    it('should update when measureData input changes', () => {
      const updatedData = {
        ...INITIAL_MEASURE_DATA,
        ambientTemperature: 30,
        windSpeed: 20
      };

      componentRef.setInput('measureData', updatedData);
      fixture.detectChanges();

      expect(component.measureData().ambientTemperature).toBe(30);
      expect(component.measureData().windSpeed).toBe(20);
    });
  });
});
