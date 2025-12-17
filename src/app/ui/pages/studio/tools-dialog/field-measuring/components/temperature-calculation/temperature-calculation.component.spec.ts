import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';

import { TemperatureCalculationComponent } from './temperature-calculation.component';
import { INITIAL_MEASURE_DATA } from '@src/app/ui/pages/studio/tools-dialog/field-measuring/mock-data';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import {
  CABLE_OPTIONS,
  WIND_DIRECTION_OPTIONS,
  SKY_COVER_OPTIONS
} from '@src/app/ui/pages/studio/tools-dialog/field-measuring/constants';

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
    componentRef.setInput('cableOptions', CABLE_OPTIONS);
    componentRef.setInput('windDirectionOptions', WIND_DIRECTION_OPTIONS);
    componentRef.setInput('skyCoverOptions', SKY_COVER_OPTIONS);
    componentRef.setInput('measureData', { ...INITIAL_MEASURE_DATA });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form fields from measureData', () => {
    const data = component.measureData();
    expect(data.cableName).toBe('ASTER570');
    expect(data.transit).toBe('A');
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
    // Set all required fields
    component.updateField('cableName', 'ASTER570');
    component.updateField('ambientTemperature', 20);
    component.updateField('longitude', 2.3522);
    component.updateField('latitude', 48.8566);
    component.updateField('transit', 'A');
    component.updateField('azimuth', 90);
    component.updateField('windSpeed', 5);
    component.updateField('windDirection', 'North');
    component.updateField('skyCover', 'N5');

    expect(component.temperatureResult()).toBe(null);
    expect(component.temperatureError()).toBe(false);

    await component.calculateTemperature();

    expect(component.temperatureResult()).toBeTruthy();
    expect(component.temperatureResult()?.cableSolarFlux).toBe(123);
    expect(component.temperatureResult()?.cableTemperature).toBe(123);
  });

  it('should toggle solar flux mode', () => {
    expect(component.solarFluxMode).toBe('skyCover');

    component.updateSolarFluxMode('fieldSurvey');
    expect(component.solarFluxMode).toBe('fieldSurvey');

    component.updateSolarFluxMode('skyCover');
    expect(component.solarFluxMode).toBe('skyCover');
  });
});
