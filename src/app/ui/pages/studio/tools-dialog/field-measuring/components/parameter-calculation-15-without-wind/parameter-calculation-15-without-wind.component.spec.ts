import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';

import { ParameterCalculation15WithoutWindComponent } from './parameter-calculation-15-without-wind.component';
import { INITIAL_MEASURE_DATA } from '@src/app/ui/pages/studio/tools-dialog/field-measuring/mock-data';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { MessageService } from 'primeng/api';
import { SectionService } from '@src/app/core/services/sections/section.service';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { InitialConditionService } from '@src/app/core/services/initial-conditions/initial-condition.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CablesService } from '@src/app/core/services/cables/cables.service';
import { StorageService } from '@src/app/core/services/storage/storage.service';
import { BehaviorSubject } from 'rxjs';

interface SignalFn<T> {
  (): T;
  set: (v: T) => void;
}

// Helper to create a signal-like mock that is both callable and has a .set method
function createSignalMock<T>(initialValue: T): SignalFn<T> {
  let value = initialValue;
  const fn = (() => value) as SignalFn<T>;
  fn.set = (v: T) => {
    value = v;
  };
  return fn;
}

describe('ParameterCalculation15WithoutWindComponent', () => {
  let component: ParameterCalculation15WithoutWindComponent;
  let fixture: ComponentFixture<ParameterCalculation15WithoutWindComponent>;
  let componentRef: ComponentRef<ParameterCalculation15WithoutWindComponent>;
  let workerPythonServiceMock: jest.Mocked<WorkerPythonService>;

  beforeEach(async () => {
    workerPythonServiceMock = {
      runTask: jest.fn()
    } as unknown as jest.Mocked<WorkerPythonService>;

    const mockMessageService = {
      add: jest.fn()
    } as unknown as MessageService;

    const mockSectionService = {
      currentSection: createSignalMock(null)
    } as unknown as SectionService;

    const mockStudiesService = {
      currentStudy: jest.fn().mockReturnValue(null),
      getStudy: jest.fn()
    } as unknown as StudiesService;

    const mockInitialConditionService = {
      addInitialCondition: jest.fn(),
      setInitialCondition: jest.fn()
    } as unknown as InitialConditionService;

    const mockCablesService = {
      getCables: jest.fn().mockResolvedValue([]),
      importFromFile: jest.fn().mockResolvedValue(undefined),
      ready: new BehaviorSubject<boolean>(true)
    } as unknown as CablesService;

    const mockStorageService = {
      ready$: new BehaviorSubject<boolean>(true),
      db: {
        cables: {
          toArray: jest.fn().mockResolvedValue([])
        }
      }
    } as unknown as StorageService;

    await TestBed.configureTestingModule({
      imports: [ParameterCalculation15WithoutWindComponent],
      providers: [
        provideHttpClientTesting(),
        { provide: WorkerPythonService, useValue: workerPythonServiceMock },
        { provide: MessageService, useValue: mockMessageService },
        { provide: SectionService, useValue: mockSectionService },
        { provide: StudiesService, useValue: mockStudiesService },
        {
          provide: InitialConditionService,
          useValue: mockInitialConditionService
        },
        { provide: CablesService, useValue: mockCablesService },
        { provide: StorageService, useValue: mockStorageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(
      ParameterCalculation15WithoutWindComponent
    );
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('measureData', { ...INITIAL_MEASURE_DATA });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form fields from measureData', () => {
    const data = component.measureData();
    expect(data.updateMode15C).toBe('auto');
    expect(data.parameterPapoto).toBe(1700);
    expect(data.parameterUncertaintyPapoto).toBe(12);
  });

  it('should update measureData when form values change', () => {
    component.updateField('parameterPapoto', 1800);
    component.updateField('parameterUncertaintyPapoto', 15);
    component.updateField('cableTemperature15C', 50);

    const data = component.measureData();
    expect(data.parameterPapoto).toBe(1800);
    expect(data.parameterUncertaintyPapoto).toBe(15);
    expect(data.cableTemperature15C).toBe(50);
  });

  it('should toggle update mode', () => {
    expect(component.measureData().updateMode15C).toBe('auto');

    component.updateField('updateMode15C', 'manual');
    expect(component.measureData().updateMode15C).toBe('manual');

    component.updateField('updateMode15C', 'auto');
    expect(component.measureData().updateMode15C).toBe('auto');
  });

  it('should calculate parameter 15C and show results', async () => {
    // Set all required fields for manual mode
    component.updateField('updateMode15C', 'manual');
    component.updateField('parameterPapoto', 1700);
    component.updateField('parameterUncertaintyPapoto', 12);
    component.updateField('cableTemperature15C', 45);
    component.updateField('cableTemperatureUncertainty15C', 3);

    expect(component.parameter15CResult()).toBe(null);
    expect(component.parameter15CError()).toBe(false);

    await component.calculateParameter15C();

    expect(component.parameter15CResult()).toBeTruthy();
    expect(component.parameter15CResult()?.parameter15C).toBe(1900);
    expect(component.parameter15CResult()?.parameter15CMinusUncertainty).toBe(
      1885
    );
    expect(component.parameter15CResult()?.parameter15CPlusUncertainty).toBe(
      1915
    );
  });

  it('should validate form correctly for manual mode', () => {
    component.updateField('updateMode15C', 'manual');
    component.updateField('parameterPapoto', null);
    component.updateField('parameterUncertaintyPapoto', null);
    component.updateField('cableTemperature15C', null);
    component.updateField('cableTemperatureUncertainty15C', null);

    expect(component.isFormValid()).toBe(false);

    component.updateField('parameterPapoto', 1700);
    component.updateField('parameterUncertaintyPapoto', 12);
    component.updateField('cableTemperature15C', 45);
    component.updateField('cableTemperatureUncertainty15C', 3);

    expect(component.isFormValid()).toBe(true);
  });
});
