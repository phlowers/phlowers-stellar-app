import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ParameterCalculation15WithoutWindComponent } from './parameter-calculation-15-without-wind.component';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskError, TaskOutputs } from '@services/worker_python/tasks/types';
import { PythonDiagnostic } from '@services/worker_python/tasks/python-diagnostic.interfaces';
import { MessageService } from 'primeng/api';
import { SectionService } from '@services/section/section.service';
import { StudiesService } from '@services/studies/studies.service';
import { PlotService } from '@services/plot/plot.service';
import { InitialConditionService } from '@services/initial-condition/initial-condition.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CablesService } from '@shared/catalog/services/cables.service';
import { StorageService } from '@services/storage/storage.service';
import { Study } from '@shared/domain/models/study.model';
import { Section } from '@shared/domain';
import { BehaviorSubject } from 'rxjs';

import { TranslocoTestingModule } from '@jsverse/transloco';
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
  let workerPythonServiceMock: vi.Mocked<WorkerPythonService>;

  beforeEach(async () => {
    workerPythonServiceMock = {
      runTask: vi.fn().mockResolvedValue({ result: null, error: null, diagnostics: [] }),
      ready$: new BehaviorSubject<boolean>(true)
    } as unknown as vi.Mocked<WorkerPythonService>;

    const mockMessageService = {
      add: vi.fn()
    } as unknown as MessageService;

    const mockSectionService = {
      currentSection: createSignalMock(null)
    } as unknown as SectionService;

    const mockStudiesService = {
      currentStudy: vi.fn().mockReturnValue(null),
      getStudy: vi.fn()
    } as unknown as StudiesService & { currentStudy: vi.Mock };

    const mockInitialConditionService = {
      addInitialCondition: vi.fn(),
      setInitialCondition: vi.fn()
    } as unknown as InitialConditionService;

    const mockCablesService = {
      getCables: vi.fn().mockResolvedValue([]),
      importFromFile: vi.fn().mockResolvedValue(undefined),
      ready: new BehaviorSubject<boolean>(true)
    } as unknown as CablesService;

    const mockStorageService = {
      ready$: new BehaviorSubject<boolean>(true),
      db: {
        cables: {
          toArray: vi.fn().mockResolvedValue([])
        }
      }
    } as unknown as StorageService;

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),ParameterCalculation15WithoutWindComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
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

    fixture = TestBed.createComponent(ParameterCalculation15WithoutWindComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('measureData', createTestMeasureData());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form fields from measureData', () => {
    const data = component.measureData();
    expect(data.updateMode15C).toBe('auto');
    expect(data.parameterPapoto).toBeNull();
    expect(data.parameterUncertaintyPapoto).toBeNull();
  });

  it('should update measureData when form values change', () => {
    component.updateMeasureData('parameterPapoto', 1800);
    component.updateMeasureData('parameterUncertaintyPapoto', 15);
    component.updateMeasureData('cableTemperatureCalibration', 50);

    const data = component.measureData();
    expect(data.parameterPapoto).toBe(1800);
    expect(data.parameterUncertaintyPapoto).toBe(15);
    expect(data.cableTemperatureCalibration).toBe(50);
  });

  it('should toggle update mode', () => {
    expect(component.measureData().updateMode15C).toBe('auto');

    component.updateMeasureData('updateMode15C', 'manual');
    expect(component.measureData().updateMode15C).toBe('manual');

    component.updateMeasureData('updateMode15C', 'auto');
    expect(component.measureData().updateMode15C).toBe('auto');
  });

  describe('isCalculating signal', () => {
    it('should start as false', () => {
      expect(component.isCalculating()).toBe(false);
    });

    it('should be true during calculation and false after', async () => {
      let resolveTask!: (value: {
        result: TaskOutputs[Task.calculateParameter15CWithoutWind];
        error: TaskError | null;
        diagnostics: PythonDiagnostic[];
      }) => void;
      workerPythonServiceMock.runTask.mockReturnValueOnce(
        new Promise((res) => {
          resolveTask = res;
        })
      );

      component.updateMeasureData('updateMode15C', 'manual');
      component.updateManualParameterCalculation15CWithoutWind('parameterPapoto', 1700);
      component.updateManualParameterCalculation15CWithoutWind('parameterUncertaintyPapoto', 12);
      component.updateManualParameterCalculation15CWithoutWind('cableTemperatureCalibration', 45);
      component.updateManualParameterCalculation15CWithoutWind('cableTemperatureCalibrationUncertainty', 3);

      const calcPromise = component.calculateParameter15C();
      expect(component.isCalculating()).toBe(true);

      resolveTask({
        result: { parameter15CMinusUncertainty: 0, parameter15C: 0, parameter15CPlusUncertainty: 0 },
        error: null,
        diagnostics: []
      });
      await calcPromise;

      expect(component.isCalculating()).toBe(false);
    });

    it('should reset to false even when calculation throws', async () => {
      workerPythonServiceMock.runTask.mockRejectedValue(new Error('unexpected'));

      component.updateMeasureData('updateMode15C', 'manual');
      component.updateManualParameterCalculation15CWithoutWind('parameterPapoto', 1700);
      component.updateManualParameterCalculation15CWithoutWind('parameterUncertaintyPapoto', 12);
      component.updateManualParameterCalculation15CWithoutWind('cableTemperatureCalibration', 45);
      component.updateManualParameterCalculation15CWithoutWind('cableTemperatureCalibrationUncertainty', 3);

      await expect(component.calculateParameter15C()).rejects.toThrow('unexpected');
      expect(component.isCalculating()).toBe(false);
    });
  });

  it('should call workerPythonService with correct parameters when calculating parameter 15C', async () => {
    const mockResult = {
      parameter15CMinusUncertainty: 1885,
      parameter15C: 1900,
      parameter15CPlusUncertainty: 1915
    };

    workerPythonServiceMock.runTask.mockResolvedValue({
      result: mockResult,
      error: null,
      diagnostics: []
    });

    // Set all required fields for manual mode
    component.updateMeasureData('updateMode15C', 'manual');
    component.updateManualParameterCalculation15CWithoutWind('parameterPapoto', 1700);
    component.updateManualParameterCalculation15CWithoutWind('cableTemperatureCalibration', 45);
    component.updateManualParameterCalculation15CWithoutWind('cableTemperatureCalibrationUncertainty', 3);

    // Set top-level fields for the calculation to read
    component.updateMeasureData('parameterPapoto', 1700);
    component.updateMeasureData('parameterUncertaintyPapoto', 12);

    fixture.detectChanges();

    await component.calculateParameter15C();

    expect(workerPythonServiceMock.runTask).toHaveBeenCalledWith(expect.any(String), {
      parameterPapoto: 1700,
      parameterUncertaintyPapoto: null,
      cableTemperatureCalibration: 45,
      cableTemperatureCalibrationUncertainty: 3,
      span_index: 11
    });
    expect(component.parameter15CError()).toBe(false);
  });

  it('should validate form correctly for manual mode', () => {
    component.updateMeasureData('updateMode15C', 'manual');
    // After setting to manual, manualParameterCalculation15CWithoutWind is set to null
    // So isFormValid should be false
    expect(component.isFormValid()).toBe(false);

    // Now set the required fields using the correct method
    component.updateManualParameterCalculation15CWithoutWind('parameterPapoto', 1700);
    component.updateManualParameterCalculation15CWithoutWind('parameterUncertaintyPapoto', 12);
    component.updateManualParameterCalculation15CWithoutWind('cableTemperatureCalibration', 45);
    component.updateManualParameterCalculation15CWithoutWind('cableTemperatureCalibrationUncertainty', 3);

    expect(component.isFormValid()).toBe(true);
  });

  it('should validate form correctly for auto mode', () => {
    component.measureData.update((d) => ({
      ...d,
      outputs: {
        ...d.outputs,
        papoto: {
          parameter: 1.5,
          parameter_1_2: 2,
          parameter_2_3: 2.5,
          parameter_1_3: 3,
          checkValidity: true,
          uncertainty: 0
        },
        cableTemperature: {
          cableSolarFlux: 123,
          cableTemperature: 50,
          cableTemperatureUncertainty: 3
        }
      }
    }));
    component.updateMeasureData('updateMode15C', 'auto');

    expect(component.isFormValid()).toBe(true);
  });

  describe('Initial Condition Creation', () => {
    beforeEach(async () => {
      const mockResult = {
        parameter15CMinusUncertainty: 1885,
        parameter15C: 1900,
        parameter15CPlusUncertainty: 1915
      };

      workerPythonServiceMock.runTask.mockResolvedValue({
        result: mockResult,
        error: null,
        diagnostics: []
      });

      component.updateMeasureData('updateMode15C', 'manual');
      component.updateManualParameterCalculation15CWithoutWind('parameterPapoto', 1700);
      component.updateManualParameterCalculation15CWithoutWind('parameterUncertaintyPapoto', 12);
      component.updateManualParameterCalculation15CWithoutWind('cableTemperatureCalibration', 45);
      component.updateManualParameterCalculation15CWithoutWind('cableTemperatureCalibrationUncertainty', 3);

      await component.calculateParameter15C();
    });

    it('should open initial condition modal with minus uncertainty value', () => {
      expect(component.initialConditionModalOpen()).toBe(false);

      component.onCreateInitialCondition('minus');

      expect(component.initialConditionModalOpen()).toBe(true);
      expect(component.initialConditionInput().base_parameters).toBe(1885);
    });

    it('should open initial condition modal with nominal value', () => {
      expect(component.initialConditionModalOpen()).toBe(false);

      component.onCreateInitialCondition('nominal');

      expect(component.initialConditionModalOpen()).toBe(true);
      expect(component.initialConditionInput().base_parameters).toBe(1900);
    });

    it('should open initial condition modal with plus uncertainty value', () => {
      expect(component.initialConditionModalOpen()).toBe(false);

      component.onCreateInitialCondition('plus');

      expect(component.initialConditionModalOpen()).toBe(true);
      expect(component.initialConditionInput().base_parameters).toBe(1915);
    });

    it('should not open modal when parameter15CResult is null', () => {
      component.measureData.update((d) => ({
        ...d,
        outputs: { ...d.outputs, parameter15C: null }
      }));

      component.onCreateInitialCondition('minus');

      expect(component.initialConditionModalOpen()).toBe(false);
    });
  });

  describe('Add Initial Condition', () => {
    let mockMessageService: vi.Mocked<MessageService>;
    let mockStudiesService: vi.Mocked<StudiesService> & {
      currentStudy: vi.Mock;
    };
    let mockInitialConditionService: vi.Mocked<InitialConditionService>;
    let plotService: PlotService;

    beforeEach(() => {
      mockMessageService = TestBed.inject(MessageService) as vi.Mocked<MessageService>;
      mockStudiesService = TestBed.inject(StudiesService) as vi.Mocked<StudiesService> & { currentStudy: vi.Mock };
      mockInitialConditionService = TestBed.inject(InitialConditionService) as vi.Mocked<InitialConditionService>;
      plotService = TestBed.inject(PlotService);
    });

    it('should add initial condition without generating state', async () => {
      const mockStudy = { uuid: 'study-123', name: 'Test Study' };
      const mockSection = { uuid: 'section-123', name: 'Test Section' };
      const mockInitialCondition = {
        uuid: '',
        name: 'Test IC',
        base_parameters: 2000,
        base_temperature: 15,
        cable_pretension: 0,
        min_temperature: 0,
        max_wind_pressure: 0,
        max_frost_width: 0
      };

      plotService.study.set(mockStudy as Partial<Study> as Study);
      mockStudiesService.getStudy.mockResolvedValue(mockStudy as Partial<Study> as Study);
      mockInitialConditionService.addInitialCondition.mockResolvedValue(undefined);

      await component.addInitialCondition({
        section: mockSection as Partial<Section> as Section,
        initialCondition: mockInitialCondition,
        generateState: false
      });

      expect(mockInitialConditionService.addInitialCondition).toHaveBeenCalled();
      expect(mockStudiesService.getStudy).toHaveBeenCalledWith('study-123');
      expect(mockInitialConditionService.setInitialCondition).not.toHaveBeenCalled();
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should add initial condition and generate state when requested', async () => {
      const mockStudy = { uuid: 'study-456', name: 'Test Study 2' };
      const mockSection = { uuid: 'section-456', name: 'Test Section 2' };
      const mockInitialCondition = {
        uuid: '',
        name: 'Test IC 2',
        base_parameters: 1900,
        base_temperature: 15,
        cable_pretension: 0,
        min_temperature: 0,
        max_wind_pressure: 0,
        max_frost_width: 0
      };

      plotService.study.set(mockStudy as Partial<Study> as Study);
      mockStudiesService.getStudy.mockResolvedValue(mockStudy as Partial<Study> as Study);
      mockInitialConditionService.addInitialCondition.mockResolvedValue(undefined);
      mockInitialConditionService.setInitialCondition.mockResolvedValue(undefined);

      await component.addInitialCondition({
        section: mockSection as Partial<Section> as Section,
        initialCondition: mockInitialCondition,
        generateState: true
      });

      expect(mockInitialConditionService.addInitialCondition).toHaveBeenCalled();
      expect(mockStudiesService.getStudy).toHaveBeenCalledWith('study-456');
      expect(mockInitialConditionService.setInitialCondition).toHaveBeenCalled();
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 3000
      });
    });

    it('should return early when currentStudy is null', async () => {
      const mockSection = { uuid: 'section-789', name: 'Test Section 3' };
      const mockInitialCondition = {
        uuid: '',
        name: 'Test IC 3',
        base_parameters: 1800,
        base_temperature: 15,
        cable_pretension: 0,
        min_temperature: 0,
        max_wind_pressure: 0,
        max_frost_width: 0
      };

      plotService.study.set(null);

      await component.addInitialCondition({
        section: mockSection as Partial<Section> as Section,
        initialCondition: mockInitialCondition,
        generateState: false
      });

      expect(mockInitialConditionService.addInitialCondition).not.toHaveBeenCalled();
      expect(mockMessageService.add).not.toHaveBeenCalled();
    });

    it('should return early when getStudy returns null', async () => {
      const mockStudy = { uuid: 'study-999', name: 'Test Study 4' };
      const mockSection = { uuid: 'section-999', name: 'Test Section 4' };
      const mockInitialCondition = {
        uuid: '',
        name: 'Test IC 4',
        base_parameters: 1750,
        base_temperature: 15,
        cable_pretension: 0,
        min_temperature: 0,
        max_wind_pressure: 0,
        max_frost_width: 0
      };

      plotService.study.set(mockStudy as Partial<Study> as Study);
      mockStudiesService.getStudy.mockResolvedValue(undefined);
      mockInitialConditionService.addInitialCondition.mockResolvedValue(undefined);

      await component.addInitialCondition({
        section: mockSection as Partial<Section> as Section,
        initialCondition: mockInitialCondition,
        generateState: false
      });

      expect(mockInitialConditionService.addInitialCondition).toHaveBeenCalled();
      expect(mockStudiesService.getStudy).toHaveBeenCalledWith('study-999');
      expect(mockMessageService.add).not.toHaveBeenCalled();
    });
  });

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    it('should render update-mode-selector', () => {
      expect(getByTestId('update-mode-selector')).toBeTruthy();
    });

    it('should render calculate-parameter-btn', () => {
      const el = getByTestId('calculate-parameter-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('should render parameter-papoto-input when mode is manual', () => {
      component.updateMeasureData('updateMode15C', 'manual');
      fixture.detectChanges();
      const el = getByTestId('parameter-papoto-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render cable-temperature-input when mode is manual', () => {
      component.updateMeasureData('updateMode15C', 'manual');
      fixture.detectChanges();
      const el = getByTestId('cable-temperature-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    describe('HTML rendering - result values truncation', () => {
      beforeEach(async () => {
        workerPythonServiceMock.runTask.mockResolvedValue({
          result: {
            parameter15CMinusUncertainty: 1885.17,
            parameter15C: 1900.99,
            parameter15CPlusUncertainty: 1915.35
          },
          error: null,
          diagnostics: []
        });

        component.updateMeasureData('updateMode15C', 'manual');
        component.updateManualParameterCalculation15CWithoutWind('parameterPapoto', 1700);
        component.updateManualParameterCalculation15CWithoutWind('parameterUncertaintyPapoto', 12);
        component.updateManualParameterCalculation15CWithoutWind('cableTemperatureCalibration', 45);
        component.updateManualParameterCalculation15CWithoutWind('cableTemperatureCalibrationUncertainty', 3);

        await component.calculateParameter15C();
        fixture.detectChanges();
      });

      it('should display parameter15CMinusUncertainty truncated to 1 decimal, not rounded (1885.17 → 1885.1)', () => {
        const text = getByTestId('parameter-15c-minus')?.textContent?.trim();
        expect(text).toContain('1,885.1');
        expect(text).not.toContain('1,885.2');
      });

      it('should display parameter15C truncated to 1 decimal, not rounded (1900.99 → 1900.9)', () => {
        const text = getByTestId('parameter-15c')?.textContent?.trim();
        expect(text).toContain('1,900.9');
        expect(text).not.toContain('1,901.0');
      });

      it('should display parameter15CPlusUncertainty truncated to 1 decimal, not rounded (1915.35 → 1915.3)', () => {
        const text = getByTestId('parameter-15c-plus')?.textContent?.trim();
        expect(text).toContain('1,915.3');
        expect(text).not.toContain('1,915.4');
      });
    });
  });
});
