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
import { TemperatureEstimationComponent } from '@features/studio/estimations/presentation/components/temperature-estimation/temperature-estimation.component';
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
    obstacles: [
      makeObstacle('obstacle-a', 'Obstacle A', 0, 2),
      makeObstacle('obstacle-empty', 'Obstacle without point', 0, 0),
      makeObstacle('obstacle-b', 'Obstacle B', 2, 1)
    ]
  }) as unknown as Section;

const ENGINE_RESULT = { value: 12.345, residual: 0.001, iterations: 8, converged: true };

describe('TemperatureEstimationComponent', () => {
  let component: TemperatureEstimationComponent;
  let fixture: ComponentFixture<TemperatureEstimationComponent>;
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
    selectObstacle('obstacle-a');
    typeIn('target-distance-input', '12');
  };

  const calculateBtn = (): HTMLButtonElement => getByTestId('calculate-btn') as HTMLButtonElement;

  const calculate = async (): Promise<void> => {
    await component.calculate();
    fixture.detectChanges();
  };

  const createComponent = (): void => {
    fixture = TestBed.createComponent(TemperatureEstimationComponent);
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
        TemperatureEstimationComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'common.required': 'Required',
              'common.meter': 'm',
              'common.celsius-unit': '°C',
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
              'shared.python-errors.estimation-not-converged-error': 'The target cannot be reached',
              'shared.python-errors.solver-error': 'A solver error occurred.',
              'shared.python-errors.convergence-error': 'The solver failed to converge.',
              'shared.python-errors.suspected-chain-reversal': 'The insulator chain is suspected to have reversed.',
              'shared.python-errors.balance-engine-warning': 'A balance engine warning was raised.',
              'studio.estimations.choose-obstacle-info': 'Choose an obstacle first',
              'studio.estimations.target-vertical-distance-label': 'Target vertical distance',
              'studio.estimations.conformity-temperature-label': 'Conformity temperature',
              'studio.estimations.copy-temperature-aria-label': 'Copy the conformity temperature',
              'studio.estimations.calculation-failed': 'Failed to estimate the conformity temperature'
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
      expect(getByTestId('temperature-estimation-form')?.tagName).toBe('FORM');
      expect(textOf('choose-obstacle-info')).toContain('Choose an obstacle first');
      expect(getByTestId('choose-obstacle-info')?.querySelector('app-icon')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('labels every field', () => {
      const labels = Array.from(fixture.nativeElement.querySelectorAll('label') as NodeListOf<HTMLLabelElement>).map(
        (label) => [label.htmlFor, label.textContent?.trim()]
      );
      expect(labels).toEqual([
        ['estimation-obstacle', 'Obstacle name'],
        ['estimation-point', 'Point'],
        ['estimation-target-distance', 'Target vertical distance']
      ]);
    });
  });

  describe('Obstacle name (RG.TCO.OBS-NOM)', () => {
    it('lists the obstacles of the section holding points', () => {
      expect(selectByTestId('obstacle-select').options).toEqual([
        { label: 'Obstacle A', value: 'obstacle-a' },
        { label: 'Obstacle B', value: 'obstacle-b' }
      ]);
    });

    it('filters the options while typing', () => {
      const select = selectByTestId('obstacle-select');
      expect(select.filter).toBe(true);
      expect(select.filterBy).toBe('label');
    });

    it('selects no obstacle by default', () => {
      expect(component.form.controls.obstacleUuid.value).toBeNull();
    });

    it('preselects the obstacle selected in the Studio, on its first point', () => {
      fixture.destroy();
      studioSelectedUuid.set('obstacle-b');

      createComponent();

      expect(component.form.controls.obstacleUuid.value).toBe('obstacle-b');
      expect(component.form.controls.pointIndex.value).toBe(0);
      expect(selectByTestId('point-select').options).toEqual([{ label: 'Point 1', value: 0 }]);
    });

    it.each([
      ['a floor', 'floor-uuid'],
      ['an obstacle without point', 'obstacle-empty']
    ])('preselects nothing when the Studio selection is %s', (_, uuid) => {
      fixture.destroy();
      studioSelectedUuid.set(uuid);

      createComponent();

      expect(component.form.controls.obstacleUuid.value).toBeNull();
      expect(component.form.controls.pointIndex.value).toBeNull();
    });
  });

  describe('Point (RG.TCO.OBS-PTN)', () => {
    it('is greyed out, without point before an obstacle is selected', () => {
      expect(component.form.controls.pointIndex.disabled).toBe(true);
      expect(component.form.controls.pointIndex.value).toBeNull();
      expect(selectByTestId('point-select').options).toEqual([]);
    });

    it('lists the points of the selected obstacle and selects the first one', () => {
      selectObstacle('obstacle-a');

      expect(selectByTestId('point-select').options).toEqual([
        { label: 'Point 1', value: 0 },
        { label: 'Point 2', value: 1 }
      ]);
      expect(component.form.controls.pointIndex.value).toBe(0);
      expect(component.form.controls.pointIndex.disabled).toBe(true);
    });

    it('follows the obstacle selection', () => {
      selectObstacle('obstacle-a');
      selectObstacle('obstacle-b');
      expect(selectByTestId('point-select').options).toEqual([{ label: 'Point 1', value: 0 }]);

      selectObstacle(null);
      expect(component.form.controls.pointIndex.value).toBeNull();
    });
  });

  describe('Target vertical distance (RG.TCO.DIS)', () => {
    it('is empty by default', () => {
      expect(component.form.controls.targetDistance.value).toBeNull();
    });

    it.each(['0.01', '150', '12.34'])('accepts %s', (value) => {
      typeIn('target-distance-input', value);
      expect(component.form.controls.targetDistance.valid).toBe(true);
      expect(getByTestId('target-distance-input')?.getAttribute('aria-invalid')).toBeNull();
    });

    it.each([
      ['0', 'Min. value: 0.01'],
      ['-1', 'Min. value: 0.01'],
      ['150.01', 'Max. value: 150'],
      ['1.234', 'Max decimals: 2']
    ])('rejects %s with "%s"', (value, message) => {
      typeIn('target-distance-input', value);

      const input = getByTestId('target-distance-input');
      expect(input?.getAttribute('aria-invalid')).toBe('true');
      expect(fixture.nativeElement.querySelector('#estimation-target-distance-error')?.textContent?.trim()).toBe(
        message
      );
    });

    it('uses the meter unit with a 0.01 step', () => {
      const input = getByTestId('target-distance-input');
      expect(input?.getAttribute('step')).toBe('0.01');
      expect(input?.getAttribute('max')).toBe('150');
      expect(fixture.nativeElement.querySelector('p-inputgroup-addon')?.textContent?.trim()).toBe('m');
    });
  });

  describe('Calculate button (RG.TCO.CAL-BTN)', () => {
    it('is inactive until every field is filled', () => {
      expect(calculateBtn().disabled).toBe(true);

      selectObstacle('obstacle-a');
      expect(calculateBtn().disabled).toBe(true);

      typeIn('target-distance-input', '12');
      expect(calculateBtn().disabled).toBe(false);
    });

    it('is inactive with an invalid distance', () => {
      selectObstacle('obstacle-a');
      typeIn('target-distance-input', '151');
      expect(calculateBtn().disabled).toBe(true);
    });

    it('estimates the temperature on the obstacle point, bounded to [-50; 250] °C', async () => {
      fillForm();

      await calculate();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.estimateTemperature, {
        spanIndex: 0,
        obstacleUuid: 'obstacle-a',
        pointIndex: 0,
        targetDistance: 12,
        bounds: [-50, 250]
      });
    });

    it('does not run the estimation while the form is incomplete', async () => {
      selectObstacle('obstacle-a');

      await calculate();

      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('keeps the form editable after the calculation', async () => {
      fillForm();

      await calculate();

      expect(component.form.controls.obstacleUuid.enabled).toBe(true);
      expect(component.form.controls.targetDistance.enabled).toBe(true);
    });
  });

  describe('Results (RG.TCO.RES-CAD / RG.TCO.TCO-RES)', () => {
    it('hides the results frame until calculated', () => {
      fillForm();
      expect(getByTestId('results-frame')).toBeNull();
    });

    it('shows the conformity temperature with two decimals', async () => {
      fillForm();

      await calculate();

      expect(getByTestId('results-frame')).not.toBeNull();
      expect(textOf('conformity-temperature-value')).toBe('12.35 °C');
    });

    it.each([
      [0, '0.00 °C'],
      [-50, '-50.00 °C'],
      [250, '250.00 °C']
    ])('shows a %s °C result as "%s"', async (value, displayed) => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: { ...ENGINE_RESULT, value },
        error: null,
        diagnostics: []
      });
      fillForm();

      await calculate();

      expect(textOf('conformity-temperature-value')).toBe(displayed);
    });

    it('is read-only: no input in the results frame', async () => {
      fillForm();

      await calculate();

      expect(getByTestId('results-frame')?.querySelector('input')).toBeNull();
    });

    it('hides the results once an input changes', async () => {
      fillForm();
      await calculate();

      typeIn('target-distance-input', '13');

      expect(getByTestId('results-frame')).toBeNull();
    });

    it('shows the engine error message and no result when the estimation fails', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: undefined,
        error: TaskError.SOLVER_DID_NOT_CONVERGE,
        diagnostics: [
          {
            code: PythonErrorCode.EstimationNotConvergedError,
            severity: 'error',
            origin: 'exception',
            rawText: 'EstimationNotConvergedError'
          }
        ]
      });
      fillForm();

      await calculate();

      expect(mockNotificationService.error).toHaveBeenCalledWith('The target cannot be reached');
      expect(getByTestId('results-frame')).toBeNull();
      expect(calculateBtn().disabled).toBe(false);
    });

    it.each([
      [PythonErrorCode.SolverError, 'A solver error occurred.'],
      [PythonErrorCode.ConvergenceError, 'The solver failed to converge.'],
      [PythonErrorCode.SuspectedChainReversal, 'The insulator chain is suspected to have reversed.']
    ])('shows the %s message when a trial temperature fails to balance', async (code, message) => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: TaskError.CALCULATION_ERROR,
        diagnostics: [{ code, severity: 'error', origin: 'exception', rawText: `${code}: boom` }]
      });
      fillForm();

      await calculate();

      expect(mockNotificationService.error).toHaveBeenCalledWith(message);
      expect(getByTestId('results-frame')).toBeNull();
    });

    it('shows the BalanceEngineWarning once, along with the result', async () => {
      const warning = {
        code: PythonErrorCode.BalanceEngineWarning,
        severity: 'warning',
        origin: 'warning',
        rawText: 'BalanceEngineWarning: not adjusted'
      };
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: ENGINE_RESULT,
        error: null,
        diagnostics: [warning, warning]
      });
      fillForm();

      await calculate();

      expect(mockNotificationService.warning).toHaveBeenCalledExactlyOnceWith('A balance engine warning was raised.');
      expect(mockNotificationService.error).not.toHaveBeenCalled();
      expect(textOf('conformity-temperature-value')).toBe('12.35 °C');
    });

    it('shows the warnings raised before the engine error', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: TaskError.CALCULATION_ERROR,
        diagnostics: [
          {
            code: PythonErrorCode.ConvergenceError,
            severity: 'error',
            origin: 'exception',
            rawText: 'ConvergenceError: boom'
          },
          {
            code: PythonErrorCode.BalanceEngineWarning,
            severity: 'warning',
            origin: 'warning',
            rawText: 'BalanceEngineWarning: not adjusted'
          }
        ]
      });
      fillForm();

      await calculate();

      expect(mockNotificationService.warning).toHaveBeenCalledWith('A balance engine warning was raised.');
      expect(mockNotificationService.error).toHaveBeenCalledWith('The solver failed to converge.');
    });

    it('falls back to a generic message without engine diagnostic', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: undefined,
        error: TaskError.CALCULATION_ERROR,
        diagnostics: []
      });
      fillForm();

      await calculate();

      expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to estimate the conformity temperature');
    });

    it('notifies and logs when the worker rejects', async () => {
      mockWorkerPythonService.runTask.mockRejectedValue(new Error('worker down'));
      fillForm();

      await calculate();

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to estimate the conformity temperature');
      expect(component.isCalculating()).toBe(false);
    });
  });

  describe('Copy icon (RG.TCO.TCO-RES.3)', () => {
    beforeEach(async () => {
      fillForm();
      await calculate();
    });

    it('is labelled for assistive technologies', () => {
      expect(getByTestId('copy-temperature-btn')?.getAttribute('aria-label')).toBe('Copy the conformity temperature');
    });

    it('copies the displayed temperature to the clipboard', async () => {
      getByTestId('copy-temperature-btn')?.click();
      await fixture.whenStable();

      expect(writeText).toHaveBeenCalledWith('12.35');
      expect(mockNotificationService.success).toHaveBeenCalledWith('Copied to clipboard');
    });

    it('notifies when the copy fails', async () => {
      writeText.mockRejectedValue(new Error('denied'));

      await component.copyTemperature();

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to copy to the clipboard');
    });

    it('notifies when the clipboard is unavailable', async () => {
      Reflect.deleteProperty(navigator, 'clipboard');

      await component.copyTemperature();

      expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to copy to the clipboard');
    });
  });

  it('copies nothing without result', async () => {
    await component.copyTemperature();
    expect(writeText).not.toHaveBeenCalled();
  });
});
