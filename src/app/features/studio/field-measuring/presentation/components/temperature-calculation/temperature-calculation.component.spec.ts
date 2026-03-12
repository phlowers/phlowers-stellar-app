import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';

import { TemperatureCalculationComponent } from './temperature-calculation.component';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import {
  WIND_DIRECTION_OPTIONS,
  SKY_COVER_OPTIONS,
  TRANSIT_BOUNDS
} from '@features/studio/field-measuring/presentation/constants';

describe('TemperatureCalculationComponent', () => {
  let component: TemperatureCalculationComponent;
  let fixture: ComponentFixture<TemperatureCalculationComponent>;
  let componentRef: ComponentRef<TemperatureCalculationComponent>;
  let workerPythonServiceMock: jest.Mocked<WorkerPythonService>;

  beforeEach(async () => {
    workerPythonServiceMock = {
      runTask: jest.fn()
    } as unknown as jest.Mocked<WorkerPythonService>;

    await TestBed.configureTestingModule({
      imports: [TemperatureCalculationComponent],
      providers: [{ provide: WorkerPythonService, useValue: workerPythonServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(TemperatureCalculationComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('windDirectionOptions', WIND_DIRECTION_OPTIONS);
    componentRef.setInput('skyCoverOptions', SKY_COVER_OPTIONS);
    componentRef.setInput('measureData', createTestMeasureData());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form fields from measureData', () => {
    const data = component.measureData();
    expect(data.cableName).toBe('ASTER570');
    expect(data.transit).toBeNull();
    expect(data.windIncidenceMode).toBe('auto');
  });

  it('should update measureData when form values change', () => {
    component.updateField('ambientTemperature', 25);
    component.updateField('windSpeed', 10);
    component.updateField('longitude', 2.3522);

    const data = component.measureData();
    expect(data.ambientTemperature).toBe(25);
    expect(data.windSpeed).toBe(10);
    expect(data.longitude).toBe(2.3522);
  });

  describe('isTransitOutOfBounds', () => {
    it('should return false when transit is null', () => {
      component.updateField('transit', null);
      expect(component.isTransitOutOfBounds()).toBe(false);
    });

    it('should return false when transit is at minimum boundary', () => {
      component.updateField('transit', TRANSIT_BOUNDS.min);
      expect(component.isTransitOutOfBounds()).toBe(false);
    });

    it('should return false when transit is at maximum boundary', () => {
      component.updateField('transit', TRANSIT_BOUNDS.max);
      expect(component.isTransitOutOfBounds()).toBe(false);
    });

    it('should return false when transit is within range', () => {
      component.updateField('transit', 2000);
      expect(component.isTransitOutOfBounds()).toBe(false);
    });

    it('should return true when transit is below minimum', () => {
      component.updateField('transit', TRANSIT_BOUNDS.min - 1);
      expect(component.isTransitOutOfBounds()).toBe(true);
    });

    it('should return true when transit is above maximum', () => {
      component.updateField('transit', TRANSIT_BOUNDS.max + 1);
      expect(component.isTransitOutOfBounds()).toBe(true);
    });
  });

  describe('isFormValid', () => {
    beforeEach(() => {
      component.updateField('cableName', 'ASTER570');
      component.updateField('skyCover', 'N5');
      component.updateField('transit', 1000);
    });

    it('should return true when all required fields are set and transit is in range', () => {
      expect(component.isFormValid()).toBe(true);
    });

    it('should return false when transit is null', () => {
      component.updateField('transit', null);
      expect(component.isFormValid()).toBe(false);
    });

    it('should return false when transit is below minimum', () => {
      component.updateField('transit', TRANSIT_BOUNDS.min - 1);
      expect(component.isFormValid()).toBe(false);
    });

    it('should return false when transit is above maximum', () => {
      component.updateField('transit', TRANSIT_BOUNDS.max + 1);
      expect(component.isFormValid()).toBe(false);
    });

    it('should return false when cableName is null', () => {
      component.updateField('cableName', null);
      expect(component.isFormValid()).toBe(false);
    });

    it('should return false when skyCover is null', () => {
      component.updateField('skyCover', null);
      expect(component.isFormValid()).toBe(false);
    });
  });

  it('should calculate temperature and show results', async () => {
    const mockResult = {
      cableSolarFlux: 123,
      cableTemperature: 123,
      cableTemperatureUncertainty: 5
    };

    workerPythonServiceMock.runTask.mockResolvedValue({
      result: mockResult,
      error: null
    });

    // Set all required fields
    component.updateField('cableName', 'ASTER570');
    component.updateField('ambientTemperature', 20);
    component.updateField('longitude', 2.3522);
    component.updateField('latitude', 48.8566);
    component.updateField('transit', 1);
    component.updateField('azimuth', 90);
    component.updateField('windSpeed', 5);
    component.updateField('windDirection', 'North');
    component.updateField('skyCover', 'N5');

    expect(component.measureData().outputs.cableTemperature).toBe(null);
    expect(component.temperatureCalculationError()).toBe(false);

    await component.calculateTemperature();

    expect(component.temperatureCalculationError()).toBe(false);
  });
});
