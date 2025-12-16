import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HeaderComponent } from './header.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { FieldMeasureData } from '../../types';
import { SelectOption, SPAN_OPTIONS } from '../../constants';
import { INITIAL_MEASURE_DATA } from '../../mock-data';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: ''
})
class MockIconComponent {}

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  const mockMeasureData: FieldMeasureData = { ...INITIAL_MEASURE_DATA };
  const mockSpanOptions: SelectOption[] = SPAN_OPTIONS;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
      .overrideComponent(HeaderComponent, {
        remove: { imports: [IconComponent] },
        add: { imports: [MockIconComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create', () => {
      fixture.componentRef.setInput('measureData', mockMeasureData);
      fixture.componentRef.setInput('spanOptions', mockSpanOptions);
      expect(component).toBeTruthy();
    });

    it('should require measureData input', () => {
      expect(component.measureData).toBeDefined();
    });

    it('should require spanOptions input', () => {
      expect(component.spanOptions).toBeDefined();
    });
  });

  describe('Input Properties', () => {
    it('should accept measureData input', () => {
      fixture.componentRef.setInput('measureData', mockMeasureData);
      expect(component.measureData()).toEqual(mockMeasureData);
    });

    it('should accept spanOptions input', () => {
      fixture.componentRef.setInput('spanOptions', mockSpanOptions);
      expect(component.spanOptions()).toEqual(mockSpanOptions);
    });

    it('should update when measureData changes', () => {
      const updatedData = {
        ...mockMeasureData,
        line: 'New Line',
        voltage: 400
      };

      fixture.componentRef.setInput('measureData', mockMeasureData);
      expect(component.measureData().line).toBe(mockMeasureData.line);

      fixture.componentRef.setInput('measureData', updatedData);
      expect(component.measureData().line).toBe('New Line');
      expect(component.measureData().voltage).toBe(400);
    });
  });

  describe('Header Info Display', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('measureData', mockMeasureData);
      fixture.componentRef.setInput('spanOptions', mockSpanOptions);
      fixture.detectChanges();
    });

    it('should display line information', () => {
      const element = fixture.nativeElement;
      const dlElement = element.querySelector('dl');
      expect(dlElement.textContent).toContain(mockMeasureData.line);
    });

    it('should display voltage with kV unit', () => {
      const element = fixture.nativeElement;
      const sections = Array.from(
        element.querySelectorAll('.header-info')
      ) as HTMLElement[];
      const voltageSection = sections.find((el) =>
        el.textContent?.includes('Voltage')
      );
      expect(voltageSection?.textContent).toContain(mockMeasureData.voltage);
    });

    it('should display span type', () => {
      const element = fixture.nativeElement;
      const dlElement = element.querySelector('dl');
      expect(dlElement.textContent).toContain(mockMeasureData.spanType);
    });

    it('should display phase number', () => {
      const element = fixture.nativeElement;
      const dlElement = element.querySelector('dl');
      expect(dlElement.textContent).toContain(
        mockMeasureData.phaseNumber.toString()
      );
    });

    it('should display number of conductors', () => {
      const element = fixture.nativeElement;
      const dlElement = element.querySelector('dl');
      expect(dlElement.textContent).toContain(
        mockMeasureData.numberOfConductors.toString()
      );
    });

    it('should update displayed values when measureData changes', () => {
      const updatedData = {
        ...mockMeasureData,
        voltage: '400 kV',
        phaseNumber: 6
      };

      fixture.componentRef.setInput('measureData', updatedData);
      fixture.detectChanges();

      const element = fixture.nativeElement;
      const dlElement = element.querySelector('dl');
      expect(dlElement.textContent).toContain('400 kV');
      expect(dlElement.textContent).toContain('6');
    });
  });

  describe('Location Fields Display', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('measureData', mockMeasureData);
      fixture.componentRef.setInput('spanOptions', mockSpanOptions);
      fixture.detectChanges();
    });

    it('should render span select field', () => {
      const element = fixture.nativeElement;
      const spanSelect = element.querySelector('#portee');
      expect(spanSelect).toBeTruthy();
    });

    it('should render longitude input field', () => {
      const element = fixture.nativeElement;
      const longitudeInput = element.querySelector('#longitude');
      expect(longitudeInput).toBeTruthy();
      expect(longitudeInput.type).toBe('number');
    });

    it('should render latitude input field', () => {
      const element = fixture.nativeElement;
      const latitudeInput = element.querySelector('#latitude');
      expect(latitudeInput).toBeTruthy();
      expect(latitudeInput.type).toBe('number');
    });

    it('should render altitude input field', () => {
      const element = fixture.nativeElement;
      const altitudeInput = element.querySelector('#altitude');
      expect(altitudeInput).toBeTruthy();
      expect(altitudeInput.type).toBe('number');
    });

    it('should render azimuth input field', () => {
      const element = fixture.nativeElement;
      const azimuthInput = element.querySelector('#azimuth');
      expect(azimuthInput).toBeTruthy();
      expect(azimuthInput.type).toBe('number');
    });

    it('should display correct step for number inputs', () => {
      const element = fixture.nativeElement;
      const longitudeInput = element.querySelector('#longitude');
      const latitudeInput = element.querySelector('#latitude');
      const altitudeInput = element.querySelector('#altitude');

      expect(longitudeInput.step).toBe('0.00000001');
      expect(latitudeInput.step).toBe('0.00000001');
      expect(altitudeInput.step).toBe('0.00000001');
    });

    it('should display units for coordinate fields', () => {
      const element = fixture.nativeElement;
      const inputGroups = element.querySelectorAll('p-inputgroup');

      expect(inputGroups.length).toBeGreaterThan(0);
    });

    it('should show mandatory indicators', () => {
      const element = fixture.nativeElement;
      const mandatoryIndicators = element.querySelectorAll('.mandatory');

      // All 5 location fields should have mandatory indicators
      expect(mandatoryIndicators.length).toBe(5);
    });
  });

  describe('Field Change Events', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('measureData', mockMeasureData);
      fixture.componentRef.setInput('spanOptions', mockSpanOptions);
      fixture.detectChanges();
    });

    it('should emit fieldChange when onFieldChange is called', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('longitude', 45.12345678);

      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'longitude',
        value: 45.12345678
      });
    });

    it('should emit correct field and value for different fields', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('latitude', -23.45678901);
      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'latitude',
        value: -23.45678901
      });

      component.onFieldChange('altitude', 1500.5);
      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'altitude',
        value: 1500.5
      });

      component.onFieldChange('azimuth', 180);
      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'azimuth',
        value: 180
      });

      component.onFieldChange('span', '14-15');
      expect(fieldChangeSpy).toHaveBeenCalledWith({
        field: 'span',
        value: '14-15'
      });
    });

    it('should handle multiple field changes', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('longitude', 10);
      component.onFieldChange('latitude', 20);
      component.onFieldChange('altitude', 30);

      expect(fieldChangeSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Grid Layout', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('measureData', mockMeasureData);
      fixture.componentRef.setInput('spanOptions', mockSpanOptions);
      fixture.detectChanges();
    });

    it('should have header-grid container', () => {
      const element = fixture.nativeElement;
      const gridContainer = element.querySelector('.header-grid');
      expect(gridContainer).toBeTruthy();
    });

    it('should contain both header-info and form-field sections', () => {
      const element = fixture.nativeElement;
      const headerInfoSections = element.querySelectorAll('.header-info');
      const formFieldSections = element.querySelectorAll('.form-field');

      expect(headerInfoSections.length).toBe(5); // 5 read-only info fields
      expect(formFieldSections.length).toBe(5); // 5 editable form fields
    });
  });

  describe('Edge Cases', () => {
    it('should handle measure data with null values', () => {
      const dataWithNulls: FieldMeasureData = {
        ...mockMeasureData,
        longitude: 0,
        latitude: 0,
        altitude: 0,
        azimuth: 0
      };

      fixture.componentRef.setInput('measureData', dataWithNulls);
      fixture.componentRef.setInput('spanOptions', mockSpanOptions);
      fixture.detectChanges();

      expect(fixture.nativeElement).toBeTruthy();
    });

    it('should handle empty span options array', () => {
      fixture.componentRef.setInput('measureData', mockMeasureData);
      fixture.componentRef.setInput('spanOptions', []);
      fixture.detectChanges();

      const spanSelect = fixture.nativeElement.querySelector('#portee');
      expect(spanSelect).toBeTruthy();
    });

    it('should display zero values correctly', () => {
      const dataWithZeros: FieldMeasureData = {
        ...mockMeasureData,
        voltage: '0 kV',
        phaseNumber: 0,
        numberOfConductors: 0
      };

      fixture.componentRef.setInput('measureData', dataWithZeros);
      fixture.componentRef.setInput('spanOptions', mockSpanOptions);
      fixture.detectChanges();

      const element = fixture.nativeElement;
      const dlElement = element.querySelector('dl');
      expect(dlElement.textContent).toContain('0');
    });

    it('should handle negative coordinate values', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('longitude', -123.456);
      component.onFieldChange('latitude', -45.678);
      component.onFieldChange('altitude', -100);

      expect(fieldChangeSpy).toHaveBeenCalledTimes(3);
      expect(fieldChangeSpy).toHaveBeenNthCalledWith(1, {
        field: 'longitude',
        value: -123.456
      });
      expect(fieldChangeSpy).toHaveBeenNthCalledWith(2, {
        field: 'latitude',
        value: -45.678
      });
      expect(fieldChangeSpy).toHaveBeenNthCalledWith(3, {
        field: 'altitude',
        value: -100
      });
    });

    it('should handle very large coordinate values', () => {
      const fieldChangeSpy = jest.fn();
      component.fieldChange.subscribe(fieldChangeSpy);

      component.onFieldChange('longitude', 180.0);
      component.onFieldChange('latitude', 90.0);
      component.onFieldChange('altitude', 9999.99999999);
      component.onFieldChange('azimuth', 359.99);

      expect(fieldChangeSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('Label Attributes', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('measureData', mockMeasureData);
      fixture.componentRef.setInput('spanOptions', mockSpanOptions);
      fixture.detectChanges();
    });

    it('should have proper label-input associations', () => {
      const element = fixture.nativeElement;

      const spanLabel = element.querySelector('label[for="portee"]');
      const longitudeLabel = element.querySelector('label[for="longitude"]');
      const latitudeLabel = element.querySelector('label[for="latitude"]');
      const altitudeLabel = element.querySelector('label[for="altitude"]');
      const azimuthLabel = element.querySelector('label[for="azimuth"]');

      expect(spanLabel).toBeTruthy();
      expect(longitudeLabel).toBeTruthy();
      expect(latitudeLabel).toBeTruthy();
      expect(altitudeLabel).toBeTruthy();
      expect(azimuthLabel).toBeTruthy();
    });
  });

  describe('Definition List Structure', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('measureData', mockMeasureData);
      fixture.componentRef.setInput('spanOptions', mockSpanOptions);
      fixture.detectChanges();
    });

    it('should use proper dt/dd structure for header info', () => {
      const element = fixture.nativeElement;
      const dl = element.querySelector('dl');
      const dts = dl.querySelectorAll('dt');
      const dds = dl.querySelectorAll('dd');

      expect(dts.length).toBe(5);
      expect(dds.length).toBe(5);
    });

    it('should have dl element with contents class', () => {
      const element = fixture.nativeElement;
      const dl = element.querySelector('dl.contents');
      expect(dl).toBeTruthy();
    });
  });
});
