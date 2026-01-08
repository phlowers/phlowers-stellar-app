import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

import { PapotoComponent } from './papoto.component';
import { createTestMeasureData } from './../../../helpers';
import { leftSupportOption } from '../../../mock-data';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import {
  Task,
  TaskError
} from '@src/app/core/services/worker_python/tasks/types';
import { PlotService } from '@ui/pages/studio/services/plot.service';

describe('Papoto component', () => {
  let component: PapotoComponent;
  let fixture: ComponentFixture<PapotoComponent>;
  let componentRef: ComponentRef<PapotoComponent>;
  let workerPythonServiceMock: jest.Mocked<WorkerPythonService>;
  let plotServiceMock: jest.Mocked<PlotService>;

  beforeEach(async () => {
    workerPythonServiceMock = {
      runTask: jest.fn()
    } as unknown as jest.Mocked<WorkerPythonService>;

    plotServiceMock = {
      litData: signal({
        span_length: [100, 150, 200],
        elevation: [5.5, 10.75, -3.25]
      })
    } as unknown as jest.Mocked<PlotService>;

    await TestBed.configureTestingModule({
      imports: [PapotoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WorkerPythonService, useValue: workerPythonServiceMock },
        { provide: PlotService, useValue: plotServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PapotoComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('leftSupportOption', leftSupportOption);
    componentRef.setInput('selectedSpan', []);
    componentRef.setInput('measureData', createTestMeasureData());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize all form fields from measureData', () => {
    const data = component.measureData();
    expect(data.leftSupport).toBeNull();
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

  describe('Dynamic Left Support Options', () => {
    it('should return empty array when selectedSpan is empty', () => {
      componentRef.setInput('selectedSpan', []);
      fixture.detectChanges();

      expect(component.retrievedLeftSupportOptions()).toEqual([]);
    });

    it('should return empty array when selectedSpan has only one element', () => {
      componentRef.setInput('selectedSpan', [0]);
      fixture.detectChanges();

      expect(component.retrievedLeftSupportOptions()).toEqual([]);
    });

    it('should return correct support options when selectedSpan has two elements', () => {
      componentRef.setInput('selectedSpan', [12, 13]);
      fixture.detectChanges();

      expect(component.retrievedLeftSupportOptions()).toEqual([
        { label: '13', value: '13' },
        { label: '14', value: '14' }
      ]);
    });

    it('should update support options when selectedSpan changes', () => {
      componentRef.setInput('selectedSpan', [5, 6]);
      fixture.detectChanges();

      expect(component.retrievedLeftSupportOptions()).toEqual([
        { label: '6', value: '6' },
        { label: '7', value: '7' }
      ]);

      componentRef.setInput('selectedSpan', [10, 11]);
      fixture.detectChanges();

      expect(component.retrievedLeftSupportOptions()).toEqual([
        { label: '11', value: '11' },
        { label: '12', value: '12' }
      ]);
    });
  });

  describe('Calculated Span Length', () => {
    it('should return null when selectedSpan is empty', () => {
      componentRef.setInput('selectedSpan', []);
      fixture.detectChanges();

      expect(component.calculatedSpanLength()).toBeNull();
    });

    it('should return null when selectedSpan has only one element', () => {
      componentRef.setInput('selectedSpan', [0]);
      fixture.detectChanges();

      expect(component.calculatedSpanLength()).toBeNull();
    });

    it('should return null when litData is not available', () => {
      plotServiceMock.litData.set(null);
      componentRef.setInput('selectedSpan', [0, 1]);
      fixture.detectChanges();

      expect(component.calculatedSpanLength()).toBeNull();
    });

    it('should return null when span_length field is not available in litData', () => {
      plotServiceMock.litData.set({ elevation: [5.5, 10.75] } as any);
      componentRef.setInput('selectedSpan', [0, 1]);
      fixture.detectChanges();

      expect(component.calculatedSpanLength()).toBeNull();
    });

    it('should return correct span length from litData for given span', () => {
      componentRef.setInput('selectedSpan', [0, 1]);
      fixture.detectChanges();

      expect(component.calculatedSpanLength()).toBe(100);
    });

    it('should return span length rounded to 2 decimal places', () => {
      plotServiceMock.litData.set({
        span_length: [123.456789, 150, 200],
        elevation: [5.5, 10.75, -3.25]
      } as any);
      componentRef.setInput('selectedSpan', [0, 1]);
      fixture.detectChanges();

      expect(component.calculatedSpanLength()).toBe(123.46);
    });

    it('should update when selectedSpan changes to different index', () => {
      componentRef.setInput('selectedSpan', [0, 1]);
      fixture.detectChanges();
      expect(component.calculatedSpanLength()).toBe(100);

      componentRef.setInput('selectedSpan', [1, 2]);
      fixture.detectChanges();
      expect(component.calculatedSpanLength()).toBe(150);
    });
  });

  describe('Calculated Elevation', () => {
    it('should return null when selectedSpan is empty', () => {
      componentRef.setInput('selectedSpan', []);
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBeNull();
    });

    it('should return null when selectedSpan has only one element', () => {
      componentRef.setInput('selectedSpan', [1]);
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBeNull();
    });

    it('should return null when litData is not available', () => {
      plotServiceMock.litData.set(null);
      componentRef.setInput('selectedSpan', [0, 1]);
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBeNull();
    });

    it('should return null when elevation field is not available in litData', () => {
      plotServiceMock.litData.set({ span_length: [100, 150] } as any);
      componentRef.setInput('selectedSpan', [0, 1]);
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBeNull();
    });

    it('should return correct elevation from litData for given span', () => {
      componentRef.setInput('selectedSpan', [0, 1]);
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBe(5.5);
    });

    it('should return elevation rounded to 2 decimal places', () => {
      componentRef.setInput('selectedSpan', [1, 2]);
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBe(10.75);
    });

    it('should handle negative elevation values correctly', () => {
      componentRef.setInput('selectedSpan', [2, 3]);
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBe(-3.25);
    });

    it('should update when selectedSpan changes to different index', () => {
      componentRef.setInput('selectedSpan', [0, 1]);
      fixture.detectChanges();
      expect(component.calculatedElevation()).toBe(5.5);

      componentRef.setInput('selectedSpan', [1, 2]);
      fixture.detectChanges();
      expect(component.calculatedElevation()).toBe(10.75);
    });
  });
});
