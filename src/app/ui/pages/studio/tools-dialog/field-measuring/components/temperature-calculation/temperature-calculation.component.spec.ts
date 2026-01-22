import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';

import { TemperatureCalculationComponent } from './temperature-calculation.component';
import { createTestMeasureData } from '@ui/pages/studio/tools-dialog/field-measuring/helpers';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import {
  WIND_DIRECTION_OPTIONS,
  SKY_COVER_OPTIONS
} from '@ui/pages/studio/tools-dialog/field-measuring/constants';

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
      providers: [
        { provide: WorkerPythonService, useValue: workerPythonServiceMock }
      ]
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
