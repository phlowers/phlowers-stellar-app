import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { By } from '@angular/platform-browser';

import { PapotoComponent } from './papoto.component';
import { INITIAL_MEASURE_DATA, leftSupportOption } from '../../../mock-data';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import {
  Task,
  TaskError
} from '@src/app/core/services/worker_python/tasks/types';

describe('Papoto component', () => {
  let component: PapotoComponent;
  let fixture: ComponentFixture<PapotoComponent>;
  let componentRef: ComponentRef<PapotoComponent>;
  let workerPythonServiceMock: jest.Mocked<WorkerPythonService>;

  beforeEach(async () => {
    workerPythonServiceMock = {
      runTask: jest.fn()
    } as unknown as jest.Mocked<WorkerPythonService>;

    await TestBed.configureTestingModule({
      imports: [PapotoComponent],
      providers: [
        { provide: WorkerPythonService, useValue: workerPythonServiceMock }
      ]
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
    expect(data.HL).toBeNull();
    expect(data.H1).toBeNull();
    expect(data.H2).toBeNull();
    expect(data.H3).toBeNull();
    expect(data.HR).toBeNull();
    expect(data.VL).toBeNull();
    expect(data.V1).toBeNull();
    expect(data.V2).toBeNull();
    expect(data.V3).toBeNull();
    expect(data.VR).toBeNull();
  });

  it('should render left support select field', () => {
    const selectElement = fixture.debugElement.query(By.css('p-select'));
    expect(selectElement).toBeTruthy();
  });

  it('should update measureData when form values change', () => {
    component.updateField('spanLength', 100.5);
    component.updateField('HL', 50.25);
    component.updateField('VL', 30.75);

    const data = component.measureData();
    expect(data.spanLength).toBe(100.5);
    expect(data.HL).toBe(50.25);
    expect(data.VL).toBe(30.75);
  });

  it('should open help dialog when openHelp is called', () => {
    expect(component.papotoHelpDialog()).toBe(false);

    component.openHelp();

    expect(component.papotoHelpDialog()).toBe(true);
  });

  it('should calculate PAPOTO and show results', async () => {
    const mockResult = {
      parameter: 1.5,
      parameter_1_2: 2.0,
      parameter_2_3: 2.5,
      parameter_1_3: 3.0,
      check_validity: true
    };

    workerPythonServiceMock.runTask.mockResolvedValue({
      result: mockResult,
      error: null
    });

    // Set all required fields
    component.updateField('leftSupport', '12');
    component.updateField('spanLength', 100);
    component.updateField('measuredElevationDifference', 5);
    component.updateField('HL', 10);
    component.updateField('H1', 20);
    component.updateField('H2', 30);
    component.updateField('H3', 40);
    component.updateField('HR', 50);
    component.updateField('VL', 15);
    component.updateField('V1', 25);
    component.updateField('V2', 35);
    component.updateField('V3', 45);
    component.updateField('VR', 55);

    expect(component.papotoResult()).toBe(null);
    expect(component.papotoError()).toBe(false);

    await component.calculatePapoto();

    expect(workerPythonServiceMock.runTask).toHaveBeenCalledWith(
      Task.calculatePapoto,
      {
        spanLength: 100,
        measuredElevationDifference: 5,
        HL: 10,
        H1: 20,
        H2: 30,
        H3: 40,
        HR: 50,
        VL: 15,
        V1: 25,
        V2: 35,
        V3: 45,
        VR: 55
      }
    );
    expect(component.papotoResult()).toEqual(mockResult);
    expect(component.papotoError()).toBe(false);
  });

  it('should handle calculation error', async () => {
    workerPythonServiceMock.runTask.mockResolvedValue({
      result: null as unknown as {
        parameter: number;
        parameter_1_2: number;
        parameter_2_3: number;
        parameter_1_3: number;
        check_validity: boolean;
      },
      error: TaskError.CALCULATION_ERROR
    });

    // Set all required fields
    component.updateField('leftSupport', '12');
    component.updateField('spanLength', 100);
    component.updateField('measuredElevationDifference', 5);
    component.updateField('HL', 10);
    component.updateField('H1', 20);
    component.updateField('H2', 30);
    component.updateField('H3', 40);
    component.updateField('HR', 50);
    component.updateField('VL', 15);
    component.updateField('V1', 25);
    component.updateField('V2', 35);
    component.updateField('V3', 45);
    component.updateField('VR', 55);

    expect(component.papotoError()).toBe(false);

    await component.calculatePapoto();

    expect(component.papotoError()).toBe(true);
    expect(component.papotoResult()).toBe(null);
  });

  it('should validate form correctly with isFormValid', () => {
    expect(component.isFormValid()).toBe(false);

    // Set all required fields
    component.updateField('leftSupport', '12');
    component.updateField('spanLength', 100);
    component.updateField('measuredElevationDifference', 5);
    component.updateField('HL', 10);
    component.updateField('H1', 20);
    component.updateField('H2', 30);
    component.updateField('H3', 40);
    component.updateField('HR', 50);
    component.updateField('VL', 15);
    component.updateField('V1', 25);
    component.updateField('V2', 35);
    component.updateField('V3', 45);
    component.updateField('VR', 55);

    expect(component.isFormValid()).toBe(true);
  });
});
