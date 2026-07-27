import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PapotoComponent } from './papoto.component';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { LEFT_SUPPORT_OPTIONS_MOCK } from '@features/studio/field-measuring/presentation/mock-data';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskError, TaskOutputs, GetSectionOutput } from '@services/worker_python/tasks/types';
import { PythonDiagnostic } from '@services/worker_python/tasks/python-diagnostic.interfaces';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('Papoto component', () => {
  let component: PapotoComponent;
  let fixture: ComponentFixture<PapotoComponent>;
  let componentRef: ComponentRef<PapotoComponent>;
  let workerPythonServiceMock: vi.Mocked<WorkerPythonService>;
  let plotServiceMock: vi.Mocked<PlotService>;
  let plotSpanServiceMock: vi.Mocked<PlotSpanService>;

  beforeEach(async () => {
    workerPythonServiceMock = {
      runTask: vi.fn()
    } as unknown as vi.Mocked<WorkerPythonService>;

    plotServiceMock = {
      litData: signal({
        output_parameters: {
          span_length: [100, 150, 200],
          elevation: [5.5, 10.75, -3.25]
        }
      })
    } as unknown as vi.Mocked<PlotService>;

    plotSpanServiceMock = {
      section: signal(null)
    } as unknown as vi.Mocked<PlotSpanService>;

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),PapotoComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WorkerPythonService, useValue: workerPythonServiceMock },
        { provide: PlotService, useValue: plotServiceMock },
        { provide: PlotSpanService, useValue: plotSpanServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PapotoComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('leftSupportOption', LEFT_SUPPORT_OPTIONS_MOCK);
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

  describe('isCalculating signal', () => {
    it('should start as false', () => {
      expect(component.isCalculating()).toBe(false);
    });

    it('should be true during calculation and false after', async () => {
      let resolveTask!: (value: {
        result: TaskOutputs[Task.calculatePapoto];
        error: TaskError | null;
        diagnostics: PythonDiagnostic[];
      }) => void;
      workerPythonServiceMock.runTask.mockReturnValueOnce(
        new Promise((res) => {
          resolveTask = res;
        })
      );

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

      const calcPromise = component.calculatePapoto();
      expect(component.isCalculating()).toBe(true);

      resolveTask({
        result: {
          parameter: 0,
          parameter_1_2: 0,
          parameter_2_3: 0,
          parameter_1_3: 0,
          checkValidity: true,
          uncertainty: 0
        },
        error: null,
        diagnostics: []
      });
      await calcPromise;

      expect(component.isCalculating()).toBe(false);
    });

    it('should reset to false even when calculation throws', async () => {
      workerPythonServiceMock.runTask.mockRejectedValue(new Error('unexpected'));

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

      await expect(component.calculatePapoto()).rejects.toThrow('unexpected');
      expect(component.isCalculating()).toBe(false);
    });
  });

  it('should calculate PAPOTO and show results', async () => {
    const mockResult = {
      parameter: 1.5,
      parameter_1_2: 2,
      parameter_2_3: 2.5,
      parameter_1_3: 3,
      checkValidity: true,
      uncertainty: 4
    };

    workerPythonServiceMock.runTask.mockResolvedValue({
      result: mockResult,
      error: null,
      diagnostics: []
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

    expect(component.measureData().outputs.papoto).toBe(null);
    expect(component.papotoError()).toBe(false);

    await component.calculatePapoto();

    expect(workerPythonServiceMock.runTask).toHaveBeenCalledWith(Task.calculatePapoto, {
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
    });
    expect(component.papotoError()).toBe(false);
  });

  it('should handle calculation error', async () => {
    workerPythonServiceMock.runTask.mockResolvedValue({
      result: null as unknown as {
        parameter: number;
        parameter_1_2: number;
        parameter_2_3: number;
        parameter_1_3: number;
        checkValidity: boolean;
        uncertainty: number;
      },
      error: TaskError.CALCULATION_ERROR,
      diagnostics: []
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
    expect(component.measureData().outputs.papoto).toBe(null);
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
    it('should return correct support options when selectedSpan has two elements', () => {
      component.updateField('span', [12, 13]);
      fixture.detectChanges();

      expect(component.retrievedLeftSupportOptions()).toEqual([
        { label: '13', value: '13' },
        { label: '14', value: '14' }
      ]);
    });

    it('should update support options when selectedSpan changes', () => {
      component.updateField('span', [5, 6]);
      fixture.detectChanges();

      expect(component.retrievedLeftSupportOptions()).toEqual([
        { label: '6', value: '6' },
        { label: '7', value: '7' }
      ]);

      component.updateField('span', [10, 11]);
      fixture.detectChanges();

      expect(component.retrievedLeftSupportOptions()).toEqual([
        { label: '11', value: '11' },
        { label: '12', value: '12' }
      ]);
    });
  });

  describe('Calculated Span Length', () => {
    it('should return null when selectedSpan is empty', () => {
      fixture.detectChanges();

      expect(component.calculatedSpanLength()).toBeNull();
    });

    it('should return null when selectedSpan has only one element', () => {
      component.updateField('span', [0]);
      fixture.detectChanges();

      expect(component.calculatedSpanLength()).toBeNull();
    });

    it('should return null when litData is not available', () => {
      plotServiceMock.litData.set(null);
      component.updateField('span', [0, 1]);
      fixture.detectChanges();

      expect(component.calculatedSpanLength()).toBeNull();
    });

    it('should return null when span_length field is not available in litData', () => {
      plotServiceMock.litData.set({
        output_parameters: { elevation: [5.5, 10.75] }
      } as Partial<GetSectionOutput> as GetSectionOutput);
      component.updateField('span', [0, 1]);
      fixture.detectChanges();

      expect(component.calculatedSpanLength()).toBeNull();
    });

    it('should return correct span length from litData for given span', () => {
      component.updateField('span', [0, 1]);
      fixture.detectChanges();

      expect(component.calculatedSpanLength()).toBe(100);
    });

    it('should update when selectedSpan changes to different index', () => {
      component.updateField('span', [0, 1]);
      fixture.detectChanges();
      expect(component.calculatedSpanLength()).toBe(100);

      component.updateField('span', [1, 2]);
      fixture.detectChanges();
      expect(component.calculatedSpanLength()).toBe(150);
    });
  });

  describe('Calculated Elevation', () => {
    it('should return null when selectedSpan is empty', () => {
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBeNull();
    });

    it('should return null when selectedSpan has only one element', () => {
      component.updateField('span', [1]);
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBeNull();
    });

    it('should return null when litData is not available', () => {
      plotServiceMock.litData.set(null);
      component.updateField('span', [0, 1]);
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBeNull();
    });

    it('should return null when elevation field is not available in litData', () => {
      plotServiceMock.litData.set({
        output_parameters: { span_length: [100, 150] }
      } as Partial<GetSectionOutput> as GetSectionOutput);
      component.updateField('span', [0, 1]);
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBeNull();
    });

    it('should return correct elevation from litData for given span', () => {
      component.updateField('span', [0, 1]);
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBe(5.5);
    });

    it('should return elevation rounded to 2 decimal places', () => {
      component.updateField('span', [1, 2]);
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBe(10.75);
    });

    it('should handle negative elevation values correctly', () => {
      component.updateField('span', [2, 3]);
      fixture.detectChanges();

      expect(component.calculatedElevation()).toBe(-3.25);
    });

    it('should update when selectedSpan changes to different index', () => {
      component.updateField('span', [0, 1]);
      fixture.detectChanges();
      expect(component.calculatedElevation()).toBe(5.5);

      component.updateField('span', [1, 2]);
      fixture.detectChanges();
      expect(component.calculatedElevation()).toBe(10.75);
    });
  });

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    it('should render help-btn', () => {
      const el = getByTestId('help-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('should render import-station-data-btn', () => {
      const el = getByTestId('import-station-data-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('should render left-support-select', () => {
      const el = getByTestId('left-support-select');
      expect(el).toBeTruthy();
    });

    it('should render span-length-input', () => {
      const el = getByTestId('span-length-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render elevation-difference-input', () => {
      const el = getByTestId('elevation-difference-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render hl-input', () => {
      const el = getByTestId('hl-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render h1-input', () => {
      const el = getByTestId('h1-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render h2-input', () => {
      const el = getByTestId('h2-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render h3-input', () => {
      const el = getByTestId('h3-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render hr-input', () => {
      const el = getByTestId('hr-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render vl-input', () => {
      const el = getByTestId('vl-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render v1-input', () => {
      const el = getByTestId('v1-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render v2-input', () => {
      const el = getByTestId('v2-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render v3-input', () => {
      const el = getByTestId('v3-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render vr-input', () => {
      const el = getByTestId('vr-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render calculate-papoto-btn', () => {
      const el = getByTestId('calculate-papoto-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    describe('HTML rendering - result values truncation', () => {
      beforeEach(async () => {
        workerPythonServiceMock.runTask.mockResolvedValue({
          result: {
            parameter: 1.59,
            parameter_1_2: 2.99,
            parameter_2_3: 3.17,
            parameter_1_3: 4.85,
            checkValidity: true,
            uncertainty: 0.5
          },
          error: null,
          diagnostics: []
        });

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

        await component.calculatePapoto();
        fixture.detectChanges();
      });

      it('should display parameter truncated to 1 decimal, not rounded (1.59 → 1.5)', () => {
        const text = getByTestId('papoto-parameter')?.textContent?.trim();
        expect(text).toContain('1.5');
        expect(text).not.toContain('1.6');
      });

      it('should display parameter-1-2 truncated to 1 decimal, not rounded (2.99 → 2.9)', () => {
        const text = getByTestId('papoto-parameter-1-2')?.textContent?.trim();
        expect(text).toContain('2.9');
        expect(text).not.toContain('3.0');
      });

      it('should display parameter-2-3 truncated to 1 decimal, not rounded (3.17 → 3.1)', () => {
        const text = getByTestId('papoto-parameter-2-3')?.textContent?.trim();
        expect(text).toContain('3.1');
        expect(text).not.toContain('3.2');
      });

      it('should display parameter-1-3 truncated to 1 decimal, not rounded (4.85 → 4.8)', () => {
        const text = getByTestId('papoto-parameter-1-3')?.textContent?.trim();
        expect(text).toContain('4.8');
        expect(text).not.toContain('4.9');
      });
    });
  });
});
