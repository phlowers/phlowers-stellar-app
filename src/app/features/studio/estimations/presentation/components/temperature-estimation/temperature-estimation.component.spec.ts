/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Clipboard } from '@angular/cdk/clipboard';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Select } from 'primeng/select';
import { TemperatureEstimationComponent } from '@features/studio/estimations/presentation/components/temperature-estimation/temperature-estimation.component';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { PythonErrorCode, Task, TaskError } from '@services/worker_python/tasks/types';
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { Section } from '@shared/domain';

// Synthetic data only
const makeSection = (): Section =>
  ({
    uuid: 'section-uuid',
    obstacles: [
      {
        uuid: 'obstacle-a',
        name: 'Obstacle A',
        supportIndex: 1,
        positions: [
          { x: 1, y: 2, z: 3 },
          { x: 4, y: 5, z: 6 }
        ]
      },
      { uuid: 'obstacle-b', name: 'Obstacle B', supportIndex: 0, positions: [{ x: 7, y: 8, z: 9 }] }
    ]
  }) as unknown as Section;

const ENGINE_RESULT = { value: 45.678, residual: 0, iterations: 5, converged: true };

describe('TemperatureEstimationComponent', () => {
  let component: TemperatureEstimationComponent;
  let fixture: ComponentFixture<TemperatureEstimationComponent>;
  let spanService: PlotSpanService;
  let mockWorkerPythonService: { runTask: ReturnType<typeof vi.fn> };
  let mockNotificationService: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };
  let mockLogger: { error: ReturnType<typeof vi.fn> };
  let mockClipboard: { copy: ReturnType<typeof vi.fn> };

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const textOf = (testId: string): string | undefined =>
    getByTestId(testId)?.textContent?.replaceAll('\u00a0', ' ').trim();

  const typeIn = (testId: string, value: string): void => {
    const input = getByTestId(testId) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const selectObstacle = (uuid: string | null): void => {
    component.form.controls.obstacleUuid.setValue(uuid);
    fixture.detectChanges();
  };

  const errorOf = (id: string): string | undefined =>
    fixture.nativeElement.querySelector(`#${id}-error`)?.textContent?.trim();

  const selects = (): Select[] =>
    fixture.debugElement.queryAll(By.directive(Select)).map((debugElement) => debugElement.componentInstance);

  const calculateBtn = (): HTMLButtonElement => getByTestId('calculate-btn') as HTMLButtonElement;

  const calculate = async (): Promise<void> => {
    await component.calculate();
    fixture.detectChanges();
  };

  const fillValidForm = (): void => {
    selectObstacle('obstacle-a');
    typeIn('target-distance-input', '12.5');
  };

  beforeEach(async () => {
    mockWorkerPythonService = {
      runTask: vi.fn().mockResolvedValue({ result: ENGINE_RESULT, error: null, diagnostics: [] })
    };
    mockNotificationService = { error: vi.fn(), success: vi.fn() };
    mockLogger = { error: vi.fn() };
    mockClipboard = { copy: vi.fn().mockReturnValue(true) };

    await TestBed.configureTestingModule({
      imports: [
        TemperatureEstimationComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'common.required': 'Required',
              'common.meter': 'm',
              'common.point-index-label': 'Point {{ index }}',
              'common.min-value-error': 'Min. value: {{ min }}',
              'common.max-value-error': 'Max. value: {{ max }}',
              'common.max-decimals-error': 'Max decimals: {{ maxDecimals }}',
              'common.error-occurred-label': 'An error occurred',
              'shared.python-errors.estimation-not-converged-error': 'The target cannot be reached.',
              'studio.temperature-estimation.copied': 'Temperature copied',
              'studio.temperature-estimation.copy-failed': 'Copy failed'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
        })
      ],
      providers: [
        { provide: WorkerPythonService, useValue: mockWorkerPythonService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: Clipboard, useValue: mockClipboard }
      ]
    }).compileComponents();

    spanService = TestBed.inject(PlotSpanService);
    spanService.section.set(makeSection());
    fixture = TestBed.createComponent(TemperatureEstimationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Obstacle name (RG.TCO.OBS-NOM)', () => {
    it('lists the names of every obstacle of the section (OBS-NOM.1)', () => {
      expect(selects()[0].options).toEqual([
        { label: 'Obstacle A', value: 'obstacle-a' },
        { label: 'Obstacle B', value: 'obstacle-b' }
      ]);
    });

    it('is empty without section', () => {
      spanService.section.set(null);
      fixture.detectChanges();
      expect(component.obstacleOptions()).toEqual([]);
    });

    it('filters the list while typing (OBS-NOM.2)', () => {
      expect(selects()[0].filter).toBe(true);
    });

    it('filters the points with the selected obstacle (OBS-NOM.3)', () => {
      selectObstacle('obstacle-a');
      expect(selects()[1].options).toEqual([
        { label: 'Point 1', value: 0 },
        { label: 'Point 2', value: 1 }
      ]);

      selectObstacle('obstacle-b');
      expect(selects()[1].options).toEqual([{ label: 'Point 1', value: 0 }]);
    });

    it('selects nothing by default (OBS-NOM.4)', () => {
      expect(component.form.controls.obstacleUuid.value).toBeNull();
    });

    it('asks to choose an obstacle first until one is selected', () => {
      expect(getByTestId('select-obstacle-info')).not.toBeNull();

      selectObstacle('obstacle-a');
      expect(getByTestId('select-obstacle-info')).toBeNull();
    });
  });

  describe('Point (RG.TCO.OBS-PTN)', () => {
    it('is empty without obstacle (PTN.1)', () => {
      expect(component.pointOptions()).toEqual([]);
      expect(component.form.controls.pointIndex.value).toBeNull();
    });

    it('is greyed out (PTN.2)', () => {
      expect(component.form.controls.pointIndex.disabled).toBe(true);

      selectObstacle('obstacle-a');
      expect(component.form.controls.pointIndex.disabled).toBe(true);
    });

    it('selects the first point of the obstacle by default (PTN.3)', () => {
      selectObstacle('obstacle-a');
      expect(component.form.controls.pointIndex.value).toBe(0);
    });

    it('goes back to no point when the obstacle is cleared', () => {
      selectObstacle('obstacle-a');
      selectObstacle(null);
      expect(component.form.controls.pointIndex.value).toBeNull();
    });
  });

  describe('Target vertical distance (RG.TCO.DIS)', () => {
    it('has no default value (DIS.2)', () => {
      expect((getByTestId('target-distance-input') as HTMLInputElement).value).toBe('');
    });

    it.each([
      ['-0.01', 'Min. value: 0'],
      ['150.01', 'Max. value: 150'],
      ['1.234', 'Max decimals: 2'],
      ['', 'Required']
    ])('rejects "%s" (DIS.1)', (value, message) => {
      typeIn('target-distance-input', value);
      component.form.controls.targetDistance.markAsTouched();
      fixture.detectChanges();
      expect(errorOf('temperature-target-distance')).toBe(message);
      expect(getByTestId('target-distance-input')?.getAttribute('aria-invalid')).toBe('true');
    });

    it.each(['0', '150', '12.34'])('accepts %s (DIS.1)', (value) => {
      typeIn('target-distance-input', value);
      expect(errorOf('temperature-target-distance')).toBeUndefined();
    });

    it('is limited by the min, max and step of the input', () => {
      const input = getByTestId('target-distance-input');
      expect(input?.getAttribute('min')).toBe('0');
      expect(input?.getAttribute('max')).toBe('150');
      expect(input?.getAttribute('step')).toBe('0.01');
    });
  });

  describe('Calculate button (RG.TCO.CAL-BTN)', () => {
    it('is disabled until every field is filled (CAL-BTN.1)', () => {
      expect(calculateBtn().disabled).toBe(true);

      selectObstacle('obstacle-a');
      expect(calculateBtn().disabled).toBe(true);

      typeIn('target-distance-input', '12.5');
      expect(calculateBtn().disabled).toBe(false);
    });

    it('is disabled when the target distance is invalid', () => {
      selectObstacle('obstacle-a');
      typeIn('target-distance-input', '151');
      expect(calculateBtn().disabled).toBe(true);
    });

    it('runs the temperature estimation on the selected point (CAL-BTN.2)', async () => {
      selectObstacle('obstacle-a');
      typeIn('target-distance-input', '12.5');
      await calculate();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.estimateTemperature, {
        spanIndex: 1,
        obstacleUuid: 'obstacle-a',
        pointIndex: 0,
        targetDistance: 12.5
      });
    });

    it('does not run the estimation while the button is disabled', async () => {
      await calculate();
      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('keeps the fields editable and the point greyed out after the calculation (CAL-BTN.2)', async () => {
      fillValidForm();
      await calculate();

      expect(component.form.controls.obstacleUuid.enabled).toBe(true);
      expect(component.form.controls.targetDistance.enabled).toBe(true);
      expect(component.form.controls.pointIndex.disabled).toBe(true);
    });

    it('is disabled until an input is modified once the result is displayed', async () => {
      fillValidForm();
      await calculate();
      expect(calculateBtn().disabled).toBe(true);

      typeIn('target-distance-input', '20');
      expect(calculateBtn().disabled).toBe(false);
    });

    it('is disabled while the calculation is running', async () => {
      fillValidForm();
      let release!: (value: unknown) => void;
      mockWorkerPythonService.runTask.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));

      const pending = component.calculate();
      fixture.detectChanges();
      expect(calculateBtn().disabled).toBe(true);
      expect(getByTestId('temperature-estimation-form')?.getAttribute('aria-busy')).toBe('true');

      release({ result: ENGINE_RESULT, error: null, diagnostics: [] });
      await pending;
      fixture.detectChanges();
      expect(getByTestId('temperature-estimation-form')?.getAttribute('aria-busy')).toBe('false');
    });
  });

  describe('Results frame (RG.TCO.RES-CAD)', () => {
    it('is hidden until the calculation is done (RES-CAD.1)', () => {
      fillValidForm();
      expect(getByTestId('results-frame')).toBeNull();
    });

    it('is announced politely, always present on the page', () => {
      expect(getByTestId('results')?.tagName).toBe('OUTPUT');
    });

    it('is displayed after the calculation', async () => {
      fillValidForm();
      await calculate();
      expect(getByTestId('results-frame')).not.toBeNull();
    });

    it('stays displayed when an input is modified', async () => {
      fillValidForm();
      await calculate();

      typeIn('target-distance-input', '20');
      expect(getByTestId('results-frame')).not.toBeNull();
      expect(textOf('temperature-value')).toBe('45.68 °C');
    });

    it('stays hidden when the calculation fails with a Python error', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: 'Solver error' as unknown as TaskError,
        diagnostics: []
      });
      fillValidForm();
      await calculate();

      expect(getByTestId('results-frame')).toBeNull();
    });
  });

  describe('Conformity temperature (RG.TCO.TCO-RES)', () => {
    beforeEach(async () => {
      fillValidForm();
      await calculate();
    });

    it('shows the temperature with 2 decimals (TCO-RES.1)', () => {
      expect(textOf('temperature-value')).toBe('45.68 °C');
    });

    it.each([
      [-12.3, '-12.30 °C'],
      [0, '0.00 °C'],
      [-0.001, '0.00 °C']
    ])('shows %s as %s (TCO-RES.1)', async (value, expected) => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: { ...ENGINE_RESULT, value },
        error: null,
        diagnostics: []
      });
      typeIn('target-distance-input', '20');
      await calculate();
      expect(textOf('temperature-value')).toBe(expected);
    });

    it('shows the temperature as a read-only value (TCO-RES.2)', () => {
      expect(getByTestId('temperature-value')?.closest('dd')).not.toBeNull();
      expect(getByTestId('results-frame')?.querySelector('input')).toBeNull();
    });

    it('copies the temperature as displayed to the clipboard (TCO-RES.3)', () => {
      (getByTestId('copy-temperature-btn') as HTMLButtonElement).click();

      expect(mockClipboard.copy).toHaveBeenCalledWith('45.68');
      expect(mockNotificationService.success).toHaveBeenCalledWith('Temperature copied');
    });

    it('notifies when the copy fails (TCO-RES.3)', () => {
      mockClipboard.copy.mockReturnValue(false);
      (getByTestId('copy-temperature-btn') as HTMLButtonElement).click();

      expect(mockNotificationService.success).not.toHaveBeenCalled();
      expect(mockNotificationService.error).toHaveBeenCalledWith('Copy failed');
    });
  });

  describe('Errors', () => {
    it('notifies and logs a calculation failure', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: 'Solver error' as unknown as TaskError,
        diagnostics: []
      });
      fillValidForm();
      await calculate();

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockNotificationService.error).toHaveBeenCalledWith('An error occurred');
    });

    it('prefers the message matching the Python error raised by the task', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: 'Not converged' as unknown as TaskError,
        diagnostics: [{ origin: 'exception', code: PythonErrorCode.EstimationNotConvergedError }]
      });
      fillValidForm();
      await calculate();

      expect(mockNotificationService.error).toHaveBeenCalledWith('The target cannot be reached.');
    });

    it('handles a missing diagnostics list', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({ result: null, error: 'Failure' as unknown as TaskError });
      fillValidForm();
      await calculate();

      expect(mockNotificationService.error).toHaveBeenCalledWith('An error occurred');
    });
  });
});
