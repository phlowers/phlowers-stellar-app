/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Select } from 'primeng/select';
import { WindPressureEstimationComponent } from '@features/studio/estimations/presentation/components/wind-pressure-estimation/wind-pressure-estimation.component';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { PythonErrorCode, Task, TaskError } from '@services/worker_python/tasks/types';
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { Section } from '@shared/domain';
import { LateralDistanceType, Obstacle, ReferenceSupport } from '@shared/domain/models/obstacle.model';

// Synthetic data only
const makeObstacle = (uuid: string, name: string, supportIndex: number, pointCount: number): Obstacle => ({
  uuid,
  supportUuid: `support-${supportIndex}`,
  supportIndex,
  name,
  type: 'tree',
  altitudeType: 'absolute',
  referenceSupport: ReferenceSupport.LEFT,
  lateralDistanceType: LateralDistanceType.SPAN_AXIS,
  positions: Array.from({ length: pointCount }, (_, index) => ({ x: index, y: 1, z: 2 }))
});

const makeSection = (): Section =>
  ({
    uuid: 'section-uuid',
    supports: [],
    obstacles: [makeObstacle('obstacle-a', 'Obstacle A', 0, 2), makeObstacle('obstacle-b', 'Obstacle B', 2, 1)]
  }) as unknown as Section;

const ENGINE_RESULT = { value: 831.4, distance: 7.186, iterations: 11 };

describe('WindPressureEstimationComponent', () => {
  let component: WindPressureEstimationComponent;
  let fixture: ComponentFixture<WindPressureEstimationComponent>;
  let mockWorkerPythonService: { runTask: ReturnType<typeof vi.fn> };
  let mockNotificationService: {
    error: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
  };
  let mockLogger: { error: ReturnType<typeof vi.fn> };
  let writeText: ReturnType<typeof vi.fn>;
  let studioSelectedUuid: ReturnType<typeof signal<string | null>>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const textOf = (testId: string): string | undefined =>
    getByTestId(testId)?.textContent?.replaceAll('\u00a0', ' ').replaceAll(/\s+/g, ' ').trim();

  const typeIn = (testId: string, value: string): void => {
    const input = getByTestId(testId) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const selectByTestId = (testId: string): Select =>
    fixture.debugElement.query(By.css(`[data-testid="${testId}"]`)).injector.get(Select);

  const selectObstacle = (uuid: string | null): void => {
    component.form.controls.obstacleUuid.setValue(uuid);
    fixture.detectChanges();
  };

  const fillForm = (): void => {
    selectObstacle('obstacle-b');
    typeIn('temperature-input', '-12.5');
  };

  const calculateBtn = (): HTMLButtonElement => getByTestId('calculate-btn') as HTMLButtonElement;

  const calculate = async (): Promise<void> => {
    await component.calculate();
    fixture.detectChanges();
  };

  const mockEngineResult = (result: Partial<typeof ENGINE_RESULT>): void => {
    mockWorkerPythonService.runTask.mockResolvedValue({
      result: { ...ENGINE_RESULT, ...result },
      error: null,
      diagnostics: []
    });
  };

  const createComponent = (): void => {
    fixture = TestBed.createComponent(WindPressureEstimationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    studioSelectedUuid = signal<string | null>(null);
    mockWorkerPythonService = {
      runTask: vi.fn().mockResolvedValue({ result: ENGINE_RESULT, error: null, diagnostics: [] })
    };
    mockNotificationService = { error: vi.fn(), success: vi.fn(), warning: vi.fn() };
    mockLogger = { error: vi.fn() };
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await TestBed.configureTestingModule({
      imports: [
        WindPressureEstimationComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'common.required': 'Required',
              'common.meter': 'm',
              'common.celsius-unit': '°C',
              'common.pascal-unit': 'Pa',
              'common.temperature-label': 'Temperature',
              'common.calculate': 'Calculate',
              'common.results': 'Results:',
              'common.point-label': 'Point',
              'common.point-index-label': 'Point {{ index }}',
              'common.obstacle-name-label': 'Obstacle name',
              'common.copied-to-clipboard': 'Copied to clipboard',
              'common.copy-to-clipboard-failed': 'Failed to copy to the clipboard',
              'common.min-value-error': 'Min. value: {{ min }}',
              'common.max-value-error': 'Max. value: {{ max }}',
              'common.max-decimals-error': 'Max decimals: {{ maxDecimals }}',
              'shared.python-errors.suspected-chain-reversal': 'The insulator chain is suspected to have reversed.',
              'studio.estimations.choose-obstacle-info': 'Choose an obstacle first',
              'studio.estimations.wind-pressure-label': 'Wind pressure',
              'studio.estimations.minimum-oblique-distance-label': 'Minimum oblique distance',
              'studio.estimations.copy-wind-pressure-aria-label': 'Copy the wind pressure',
              'studio.estimations.wind-pressure-calculation-failed': 'Failed to estimate the wind pressure'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
        })
      ],
      providers: [
        { provide: WorkerPythonService, useValue: mockWorkerPythonService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: ObstaclesService, useValue: { selectedMeasureUuid: studioSelectedUuid } }
      ]
    }).compileComponents();

    TestBed.inject(PlotSpanService).section.set(makeSection());
    createComponent();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  describe('HTML rendering', () => {
    it('renders the form with the obstacle choice hint', () => {
      expect(getByTestId('wind-pressure-estimation-form')?.tagName).toBe('FORM');
      expect(textOf('choose-obstacle-info')).toContain('Choose an obstacle first');

      selectObstacle('obstacle-a');
      expect(getByTestId('choose-obstacle-info')).toBeNull();
    });

    it('labels every field', () => {
      const labels = Array.from(fixture.nativeElement.querySelectorAll('label') as NodeListOf<HTMLLabelElement>).map(
        (label) => [label.htmlFor, label.textContent?.trim()]
      );
      expect(labels).toEqual([
        ['wind-estimation-obstacle', 'Obstacle name'],
        ['wind-estimation-point', 'Point'],
        ['wind-estimation-temperature', 'Temperature']
      ]);
    });
  });

  describe('Obstacle name (RG.PRE-DIS.OBS-NOM)', () => {
    it('lists the obstacles of the section, filtered while typing, none selected by default', () => {
      const select = selectByTestId('obstacle-select');
      expect(select.options).toEqual([
        { label: 'Obstacle A', value: 'obstacle-a' },
        { label: 'Obstacle B', value: 'obstacle-b' }
      ]);
      expect(select.filter).toBe(true);
      expect(component.form.controls.obstacleUuid.value).toBeNull();
    });

    it('preselects the obstacle selected in the Studio', () => {
      fixture.destroy();
      studioSelectedUuid.set('obstacle-b');

      createComponent();

      expect(component.form.controls.obstacleUuid.value).toBe('obstacle-b');
    });
  });

  describe('Point (RG.PRE-DIS.OBS-PTN)', () => {
    it('is greyed out and set to the first point of the selected obstacle', () => {
      selectObstacle('obstacle-a');

      expect(selectByTestId('point-select').options).toEqual([
        { label: 'Point 1', value: 0 },
        { label: 'Point 2', value: 1 }
      ]);
      expect(component.form.controls.pointIndex.value).toBe(0);
      expect(component.form.controls.pointIndex.disabled).toBe(true);
    });
  });

  describe('Temperature (RG.PRE-DIS.TEM)', () => {
    it('is empty by default', () => {
      expect(component.form.controls.temperature.value).toBeNull();
    });

    it.each(['-50', '250', '-12.34', '0'])('accepts %s', (value) => {
      typeIn('temperature-input', value);
      expect(component.form.controls.temperature.valid).toBe(true);
      expect(getByTestId('temperature-input')?.getAttribute('aria-invalid')).toBeNull();
    });

    it.each([
      ['-50.01', 'Min. value: -50'],
      ['250.01', 'Max. value: 250'],
      ['1.234', 'Max decimals: 2']
    ])('rejects %s with "%s"', (value, message) => {
      typeIn('temperature-input', value);

      expect(getByTestId('temperature-input')?.getAttribute('aria-invalid')).toBe('true');
      expect(fixture.nativeElement.querySelector('#wind-estimation-temperature-error')?.textContent?.trim()).toBe(
        message
      );
    });

    it('uses the Celsius unit with a 0.01 step', () => {
      const input = getByTestId('temperature-input');
      expect(input?.getAttribute('step')).toBe('0.01');
      expect(input?.getAttribute('min')).toBe('-50');
      expect(input?.getAttribute('max')).toBe('250');
      expect(fixture.nativeElement.querySelector('p-inputgroup-addon')?.textContent?.trim()).toBe('°C');
    });
  });

  describe('Calculate button (RG.PRE-DIS.CAL-BTN)', () => {
    it('is inactive until every field is filled with valid values', () => {
      expect(calculateBtn().disabled).toBe(true);

      selectObstacle('obstacle-b');
      expect(calculateBtn().disabled).toBe(true);

      typeIn('temperature-input', '251');
      expect(calculateBtn().disabled).toBe(true);

      typeIn('temperature-input', '-12.5');
      expect(calculateBtn().disabled).toBe(false);
    });

    it('estimates the minimum distance wind pressure on the obstacle point, bounded to [-3000; 3000] Pa', async () => {
      fillForm();

      await calculate();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.estimateMinimumDistanceWind, {
        spanIndex: 2,
        obstacleUuid: 'obstacle-b',
        pointIndex: 0,
        temperature: -12.5,
        bounds: [-3000, 3000]
      });
    });

    it('locks the inputs during the calculation, then keeps them editable', async () => {
      let resolveTask!: (value: unknown) => void;
      mockWorkerPythonService.runTask.mockReturnValue(new Promise((resolve) => (resolveTask = resolve)));
      fillForm();

      const calculation = component.calculate();
      fixture.detectChanges();
      expect((getByTestId('temperature-input') as HTMLInputElement).disabled).toBe(true);
      expect(component.form.controls.obstacleUuid.disabled).toBe(true);

      resolveTask({ result: ENGINE_RESULT, error: null, diagnostics: [] });
      await calculation;
      fixture.detectChanges();

      expect((getByTestId('temperature-input') as HTMLInputElement).disabled).toBe(false);
      expect(component.form.controls.obstacleUuid.enabled).toBe(true);
      expect(component.form.controls.pointIndex.disabled).toBe(true);
    });
  });

  describe('Results (RG.PRE-DIS.RES-CAD / PRE-RES / DIS-RES)', () => {
    it('hides the results frame until calculated', () => {
      fillForm();
      expect(getByTestId('results-frame')).toBeNull();
    });

    it('shows the wind pressure without decimal and the minimum oblique distance with two decimals', async () => {
      fillForm();

      await calculate();

      expect(textOf('wind-pressure-value')).toBe('831 Pa');
      expect(textOf('minimum-distance-value')).toBe('7.19 m');
      expect(getByTestId('results-frame')?.querySelector('input')).toBeNull();
    });

    it.each([
      [-2999.6, '-3,000 Pa'],
      [-0.4, '0 Pa'],
      [2999.4, '2,999 Pa']
    ])('shows a %s Pa result as "%s"', async (value, displayed) => {
      mockEngineResult({ value });
      fillForm();

      await calculate();

      expect(textOf('wind-pressure-value')).toBe(displayed);
    });

    it.each([
      [0, '0.00 m'],
      [150, '150.00 m']
    ])('shows a %s m minimum distance as "%s"', async (distance, displayed) => {
      mockEngineResult({ distance });
      fillForm();

      await calculate();

      expect(textOf('minimum-distance-value')).toBe(displayed);
    });

    it('hides the results once an input changes', async () => {
      fillForm();
      await calculate();

      typeIn('temperature-input', '20');

      expect(getByTestId('results-frame')).toBeNull();
    });

    it('shows the engine error message and no result when the chains reverse first', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: TaskError.CALCULATION_ERROR,
        diagnostics: [
          {
            code: PythonErrorCode.SuspectedChainReversal,
            severity: 'error',
            origin: 'exception',
            rawText: 'SuspectedChainReversal: boom'
          }
        ]
      });
      fillForm();

      await calculate();

      expect(mockNotificationService.error).toHaveBeenCalledWith('The insulator chain is suspected to have reversed.');
      expect(getByTestId('results-frame')).toBeNull();
    });

    it('falls back to the wind pressure failure message', async () => {
      mockWorkerPythonService.runTask.mockRejectedValue(new Error('worker down'));
      fillForm();

      await calculate();

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to estimate the wind pressure');
    });
  });

  describe('Copy icon (RG.PRE-DIS.PRE-RES.3)', () => {
    it('copies the displayed wind pressure, without group separator, to the clipboard', async () => {
      mockEngineResult({ value: -1234.6 });
      fillForm();
      await calculate();

      expect(getByTestId('copy-wind-pressure-btn')?.getAttribute('aria-label')).toBe('Copy the wind pressure');
      getByTestId('copy-wind-pressure-btn')?.click();
      await fixture.whenStable();

      expect(writeText).toHaveBeenCalledWith('-1235');
      expect(mockNotificationService.success).toHaveBeenCalledWith('Copied to clipboard');
    });

    it('notifies when the copy fails', async () => {
      writeText.mockRejectedValue(new Error('denied'));
      fillForm();
      await calculate();

      await component.copyWindPressure();

      expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to copy to the clipboard');
    });

    it('copies nothing without result', async () => {
      await component.copyWindPressure();
      expect(writeText).not.toHaveBeenCalled();
    });
  });
});
