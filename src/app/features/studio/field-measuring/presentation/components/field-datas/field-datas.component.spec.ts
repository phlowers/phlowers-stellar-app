import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { FieldDatasComponent } from './field-datas.component';
import { createTestMeasureData } from '../../helpers';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { SkyCover } from '@shared/domain';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('FieldDatasComponent', () => {
  let component: FieldDatasComponent;
  let fixture: ComponentFixture<FieldDatasComponent>;
  let componentRef: ComponentRef<FieldDatasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),FieldDatasComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FieldDatasComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('isNameAlreadyTaken', false);
    componentRef.setInput('measureData', { ...createTestMeasureData() });
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
      const fieldChangeSpy = vi.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('date', new Date('2024-01-01'));

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'date',
        value: new Date('2024-01-01')
      });
    });

    it('should handle time field changes', () => {
      const fieldChangeSpy = vi.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('time', '14:30');

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'time',
        value: '14:30'
      });
    });

    it('should handle season field changes', () => {
      const fieldChangeSpy = vi.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('season', 'winter');

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'season',
        value: 'winter'
      });
    });

    it('should handle ambientTemperature field changes', () => {
      const fieldChangeSpy = vi.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('ambientTemperature', 25.5);

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'ambientTemperature',
        value: 25.5
      });
    });

    it('should handle windSpeed field changes', () => {
      const fieldChangeSpy = vi.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('windSpeed', 10.5);

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'windSpeed',
        value: 10.5
      });
    });

    it('should handle windSpeedUnit field changes', () => {
      const fieldChangeSpy = vi.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('windSpeedUnit', 'ms');

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'windSpeedUnit',
        value: 'ms'
      });
    });

    it('should handle windDirection field changes', () => {
      const fieldChangeSpy = vi.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('windDirection', 'South');

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'windDirection',
        value: 'South'
      });
    });

    it('should handle skyCover field changes', () => {
      const fieldChangeSpy = vi.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('skyCover', '4 (partly cloudy)');

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'skyCover',
        value: '4 (partly cloudy)'
      });
    });

    it('should handle null values', () => {
      const fieldChangeSpy = vi.fn();
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
      const data: FieldMeasure = {
        ...createTestMeasureData(),
        time: new Date('2024-01-01T12:00:00'),
        season: 'summer',
        ambientTemperature: 25,
        windSpeed: 10,
        windDirection: 'North',
        skyCover: SkyCover.N0
      };

      componentRef.setInput('measureData', data);
      fixture.detectChanges();

      expect(component.measureData()).toEqual(data);
    });

    it('should update when measureData input changes', () => {
      const updatedData = {
        ...createTestMeasureData(),
        ambientTemperature: 30,
        windSpeed: 20
      };

      componentRef.setInput('measureData', updatedData);
      fixture.detectChanges();

      expect(component.measureData().ambientTemperature).toBe(30);
      expect(component.measureData().windSpeed).toBe(20);
    });
  });

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    it('should render measure-name-input', () => {
      const el = getByTestId('measure-name-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render date-picker', () => {
      const el = getByTestId('date-picker');
      expect(el).toBeTruthy();
    });

    it('should render time-mode-selector', () => {
      const el = getByTestId('time-mode-selector');
      expect(el).toBeTruthy();
    });

    it('should render time-picker', () => {
      const el = getByTestId('time-picker');
      expect(el).toBeTruthy();
    });

    it('should render ambient-temperature-input', () => {
      const el = getByTestId('ambient-temperature-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render wind-speed-unit-selector', () => {
      const el = getByTestId('wind-speed-unit-selector');
      expect(el).toBeTruthy();
    });

    it('should render wind-speed-input', () => {
      const el = getByTestId('wind-speed-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render wind-direction-select', () => {
      const el = getByTestId('wind-direction-select');
      expect(el).toBeTruthy();
    });

    it('should render sky-cover-select', () => {
      const el = getByTestId('sky-cover-select');
      expect(el).toBeTruthy();
    });
  });
});
