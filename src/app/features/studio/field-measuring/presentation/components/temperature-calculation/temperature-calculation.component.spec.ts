import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { TemperatureCalculationComponent } from './temperature-calculation.component';
import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskError, TaskOutputs } from '@services/worker_python/tasks/types';
import {
  WIND_DIRECTION_OPTIONS,
  SKY_COVER_OPTIONS,
  TRANSIT_BOUNDS
} from '@features/studio/field-measuring/presentation/constants';

describe('TemperatureCalculationComponent', () => {
  let component: TemperatureCalculationComponent;
  let fixture: ComponentFixture<TemperatureCalculationComponent>;
  let componentRef: ComponentRef<TemperatureCalculationComponent>;
  let workerPythonServiceMock: vi.Mocked<WorkerPythonService>;
  let workerReadySubject: BehaviorSubject<boolean>;

  beforeEach(async () => {
    workerReadySubject = new BehaviorSubject<boolean>(false);

    workerPythonServiceMock = {
      runTask: vi.fn(),
      ready$: workerReadySubject.asObservable()
    } as unknown as vi.Mocked<WorkerPythonService>;

    await TestBed.configureTestingModule({
      imports: [TemperatureCalculationComponent],
      providers: [provideNoopAnimations(), { provide: WorkerPythonService, useValue: workerPythonServiceMock }]
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

  describe('isCalculating signal', () => {
    it('should start as false', () => {
      expect(component.isCalculating()).toBe(false);
    });

    it('should be true during calculation and false after', async () => {
      let resolveTask!: (value: {
        result: TaskOutputs[Task.temperatureCalculation];
        error: TaskError | null;
        diagnostics: [];
      }) => void;
      workerPythonServiceMock.runTask.mockReturnValueOnce(
        new Promise((res) => {
          resolveTask = res;
        })
      );

      component.updateField('cableName', 'ASTER570');
      component.updateField('transit', 1000);
      component.updateField('skyCover', 'N5');

      const calcPromise = component.calculateTemperature();
      expect(component.isCalculating()).toBe(true);

      resolveTask({
        result: { cableSolarFlux: 0, cableTemperature: 0, cableTemperatureUncertainty: 0 },
        error: null,
        diagnostics: []
      });
      await calcPromise;

      expect(component.isCalculating()).toBe(false);
    });

    it('should reset to false even when calculation throws', async () => {
      workerPythonServiceMock.runTask.mockRejectedValue(new Error('unexpected'));

      component.updateField('cableName', 'ASTER570');
      component.updateField('transit', 1000);
      component.updateField('skyCover', 'N5');

      await expect(component.calculateTemperature()).rejects.toThrow('unexpected');
      expect(component.isCalculating()).toBe(false);
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
      error: null,
      diagnostics: []
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

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    it('should render transit-input', () => {
      const el = getByTestId('transit-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render wind-incidence-mode-selector', () => {
      expect(getByTestId('wind-incidence-mode-selector')).toBeTruthy();
    });

    it('should render sky-cover-select', () => {
      expect(getByTestId('sky-cover-select')).toBeTruthy();
    });

    it('should render measured-solar-flux-input', () => {
      const el = getByTestId('measured-solar-flux-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render calculate-temperature-btn', () => {
      const el = getByTestId('calculate-temperature-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    describe('wind incidence area', () => {
      beforeEach(() => {
        componentRef.setInput(
          'measureData',
          createTestMeasureData({ azimuth: 45, windDirection: 'North', windIncidenceMode: 'auto' })
        );
        fixture.detectChanges();
      });

      it('should show spinner when worker is not ready', () => {
        expect(getByTestId('wind-incidence-spinner')).toBeTruthy();
        expect(getByTestId('wind-incidence-value')).toBeNull();
      });

      it('should still show spinner when worker is ready but windIncidence is still null', async () => {
        let resolveTask!: (value: { result: { windIncidence: number }; error: null; diagnostics: [] }) => void;
        workerPythonServiceMock.runTask.mockReturnValueOnce(
          new Promise((res) => {
            resolveTask = res;
          })
        );

        workerReadySubject.next(true);
        fixture.detectChanges();

        // task not yet resolved — windIncidence still null
        expect(getByTestId('wind-incidence-spinner')).toBeTruthy();
        expect(getByTestId('wind-incidence-value')).toBeNull();

        resolveTask({ result: { windIncidence: 58 }, error: null, diagnostics: [] });
        await fixture.whenStable();
        fixture.detectChanges();

        expect(getByTestId('wind-incidence-spinner')).toBeNull();
        expect(getByTestId('wind-incidence-value')).toBeTruthy();
      });

      it('should show value and hide spinner when worker is ready and value is returned', async () => {
        workerPythonServiceMock.runTask.mockResolvedValue({
          result: { windIncidence: 58.00000000000001 },
          error: null,
          diagnostics: []
        });
        workerReadySubject.next(true);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(getByTestId('wind-incidence-spinner')).toBeNull();
        const valueEl = getByTestId('wind-incidence-value');
        expect(valueEl).toBeTruthy();
        expect(valueEl?.textContent).toContain('58°');
      });

      describe('missing inputs warning', () => {
        it('should show warning when windDirection is null and hide spinner and value', () => {
          componentRef.setInput(
            'measureData',
            createTestMeasureData({ azimuth: 45, windDirection: null, windIncidenceMode: 'auto' })
          );
          fixture.detectChanges();

          expect(getByTestId('wind-incidence-missing-inputs-warning')).toBeTruthy();
          expect(getByTestId('wind-incidence-spinner')).toBeNull();
          expect(getByTestId('wind-incidence-value')).toBeNull();
        });

        it('should show warning when azimuth is null and hide spinner and value', () => {
          componentRef.setInput(
            'measureData',
            createTestMeasureData({ azimuth: null, windDirection: 'North', windIncidenceMode: 'auto' })
          );
          fixture.detectChanges();

          expect(getByTestId('wind-incidence-missing-inputs-warning')).toBeTruthy();
          expect(getByTestId('wind-incidence-spinner')).toBeNull();
          expect(getByTestId('wind-incidence-value')).toBeNull();
        });

        it('should not show warning when mode is perpendicular', () => {
          componentRef.setInput(
            'measureData',
            createTestMeasureData({ azimuth: null, windDirection: null, windIncidenceMode: 'perpendicular' })
          );
          fixture.detectChanges();

          expect(getByTestId('wind-incidence-missing-inputs-warning')).toBeNull();
          expect(getByTestId('wind-incidence-perpendicular')).toBeTruthy();
          expect(getByTestId('wind-incidence-perpendicular')?.textContent).toContain('90°');
        });
      });
    });
  });

  describe('isWindIncidenceLoading', () => {
    it('should be true when worker is not ready', () => {
      expect(component.isWindIncidenceLoading()).toBe(true);
    });

    it('should be false when worker becomes ready', () => {
      workerReadySubject.next(true);
      expect(component.isWindIncidenceLoading()).toBe(false);
    });
  });

  describe('windIncidenceDisplayState', () => {
    it('should return perpendicular when mode is perpendicular', () => {
      componentRef.setInput('measureData', createTestMeasureData({ windIncidenceMode: 'perpendicular' }));
      expect(component.windIncidenceDisplayState()).toBe('perpendicular');
    });

    it('should return missing-inputs when mode is auto and windDirection is null', () => {
      componentRef.setInput(
        'measureData',
        createTestMeasureData({ windIncidenceMode: 'auto', azimuth: 45, windDirection: null })
      );
      expect(component.windIncidenceDisplayState()).toBe('missing-inputs');
    });

    it('should return missing-inputs when mode is auto and azimuth is null', () => {
      componentRef.setInput(
        'measureData',
        createTestMeasureData({ windIncidenceMode: 'auto', azimuth: null, windDirection: 'North' })
      );
      expect(component.windIncidenceDisplayState()).toBe('missing-inputs');
    });

    it('should return missing-inputs when mode is auto and azimuth is undefined', () => {
      const data = createTestMeasureData({ windIncidenceMode: 'auto', windDirection: 'North' });
      // Simulate stored measure where azimuth field is absent (undefined)
      const { azimuth: _removed, ...dataWithoutAzimuth } = data as typeof data & { azimuth: unknown };
      componentRef.setInput('measureData', dataWithoutAzimuth as typeof data);
      expect(component.windIncidenceDisplayState()).toBe('missing-inputs');
    });

    it('should return missing-inputs when mode is auto and windDirection is undefined', () => {
      const data = createTestMeasureData({ windIncidenceMode: 'auto', azimuth: 45 });
      const { windDirection: _removed, ...dataWithoutWind } = data as typeof data & { windDirection: unknown };
      componentRef.setInput('measureData', dataWithoutWind as typeof data);
      expect(component.windIncidenceDisplayState()).toBe('missing-inputs');
    });

    it('should return loading when worker is not ready', () => {
      componentRef.setInput(
        'measureData',
        createTestMeasureData({ windIncidenceMode: 'auto', azimuth: 45, windDirection: 'North' })
      );
      // workerReady is false by default
      expect(component.windIncidenceDisplayState()).toBe('loading');
    });

    it('should return loading when worker is ready but windIncidence is still null', () => {
      componentRef.setInput(
        'measureData',
        createTestMeasureData({ windIncidenceMode: 'auto', azimuth: 45, windDirection: 'North', windIncidence: null })
      );
      workerReadySubject.next(true);
      expect(component.windIncidenceDisplayState()).toBe('loading');
    });

    it('should return value when worker is ready and windIncidence is set', () => {
      componentRef.setInput(
        'measureData',
        createTestMeasureData({ windIncidenceMode: 'auto', azimuth: 45, windDirection: 'North', windIncidence: 58 })
      );
      workerReadySubject.next(true);
      expect(component.windIncidenceDisplayState()).toBe('value');
    });
  });

  describe('computeWindIncidence rounding', () => {
    beforeEach(() => {
      componentRef.setInput(
        'measureData',
        createTestMeasureData({ azimuth: 45, windDirection: 'North', windIncidenceMode: 'auto' })
      );
      fixture.detectChanges();
    });

    it('should round 58.00000000000001 to 58', async () => {
      workerPythonServiceMock.runTask.mockResolvedValue({
        result: { windIncidence: 58.00000000000001 },
        error: null,
        diagnostics: []
      });
      workerReadySubject.next(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.measureData().windIncidence).toBe(58);
    });

    it('should round 63.999999999999986 to 64', async () => {
      workerPythonServiceMock.runTask.mockResolvedValue({
        result: { windIncidence: 63.999999999999986 },
        error: null,
        diagnostics: []
      });
      workerReadySubject.next(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.measureData().windIncidence).toBe(64);
    });

    it('should not update windIncidence when task returns an error', async () => {
      workerPythonServiceMock.runTask.mockResolvedValue({
        result: undefined,
        error: TaskError.CALCULATION_ERROR,
        diagnostics: []
      });
      workerReadySubject.next(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.measureData().windIncidence).toBeNull();
    });
  });

  describe('wind incidence deduplication effect', () => {
    beforeEach(() => {
      workerPythonServiceMock.runTask.mockResolvedValue({
        result: { windIncidence: 45 },
        error: null,
        diagnostics: []
      });
      componentRef.setInput(
        'measureData',
        createTestMeasureData({ azimuth: 45, windDirection: 'North', windIncidenceMode: 'auto' })
      );
      workerReadySubject.next(true);
      fixture.detectChanges();
    });

    it('should call runTask once for initial valid inputs', async () => {
      await fixture.whenStable();
      const windCalls = workerPythonServiceMock.runTask.mock.calls.filter(([task]) => task === Task.getWindIncidence);
      expect(windCalls.length).toBe(1);
    });

    it('should not call runTask again when same azimuth and windDirection are set', async () => {
      await fixture.whenStable();
      component.updateField('azimuth', 45);
      component.updateField('windDirection', 'North');
      fixture.detectChanges();
      await fixture.whenStable();

      const windCalls = workerPythonServiceMock.runTask.mock.calls.filter(([task]) => task === Task.getWindIncidence);
      expect(windCalls.length).toBe(1);
    });

    it('should call runTask again when azimuth changes', async () => {
      await fixture.whenStable();
      component.updateField('azimuth', 90);
      fixture.detectChanges();
      await fixture.whenStable();

      const windCalls = workerPythonServiceMock.runTask.mock.calls.filter(([task]) => task === Task.getWindIncidence);
      expect(windCalls.length).toBe(2);
    });

    it('should call runTask again when windDirection changes', async () => {
      await fixture.whenStable();
      component.updateField('windDirection', 'South');
      fixture.detectChanges();
      await fixture.whenStable();

      const windCalls = workerPythonServiceMock.runTask.mock.calls.filter(([task]) => task === Task.getWindIncidence);
      expect(windCalls.length).toBe(2);
    });
  });
});
