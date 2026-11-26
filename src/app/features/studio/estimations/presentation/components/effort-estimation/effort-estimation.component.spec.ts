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
import { EffortEstimationComponent } from '@features/studio/estimations/presentation/components/effort-estimation/effort-estimation.component';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { LoadFormsService } from '@features/studio/loads/presentation/services/loadForms.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { PythonErrorCode, Task, TaskError } from '@services/worker_python/tasks/types';
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { Section } from '@shared/domain';

// Synthetic data only: spans 1-2 (400 m), 2-3 (250.5 m) and 3-4 (300 m)
const makeSection = (): Section =>
  ({
    uuid: 'section-uuid',
    supports: [
      { uuid: 'support-1', number: '1', spanLength: 400 },
      { uuid: 'support-2', number: '2', spanLength: 250.5 },
      { uuid: 'support-3', number: '3', spanLength: 300 },
      { uuid: 'support-4', number: '4', spanLength: null }
    ],
    obstacles: []
  }) as unknown as Section;

const ENGINE_RESULT = {
  value: -123.4,
  residual: 0,
  iterations: 5,
  converged: true,
  extra: { x_shift: -0.126 },
  effort: -121.05
};

describe('EffortEstimationComponent', () => {
  let component: EffortEstimationComponent;
  let fixture: ComponentFixture<EffortEstimationComponent>;
  let mockWorkerPythonService: { runTask: ReturnType<typeof vi.fn> };
  let mockNotificationService: {
    error: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
  };
  let mockLogger: { error: ReturnType<typeof vi.fn> };
  let writeText: ReturnType<typeof vi.fn>;
  let engineSynchronized: ReturnType<typeof signal<boolean>>;
  let engineRevision: ReturnType<typeof signal<string>>;

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

  const selectSpan = (index: number | null): void => {
    component.form.controls.span.setValue(index === null ? null : { index, uuid: `support-${index + 1}` });
    fixture.detectChanges();
  };

  const calculateBtn = (): HTMLButtonElement => getByTestId('calculate-btn') as HTMLButtonElement;

  const calculate = async (): Promise<void> => {
    await component.calculate();
    fixture.detectChanges();
  };

  const fillForm = (): void => {
    typeIn('distance-input', '100');
    typeIn('temperature-input', '15');
    typeIn('target-displacement-input', '2');
  };

  const mockEngineResult = (result: Partial<typeof ENGINE_RESULT>): void => {
    mockWorkerPythonService.runTask.mockResolvedValue({
      result: { ...ENGINE_RESULT, ...result },
      error: null,
      diagnostics: []
    });
  };

  const createComponent = (): void => {
    fixture = TestBed.createComponent(EffortEstimationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    engineSynchronized = signal(true);
    engineRevision = signal('1:0');
    mockWorkerPythonService = {
      runTask: vi.fn().mockResolvedValue({ result: ENGINE_RESULT, error: null, diagnostics: [] })
    };
    mockNotificationService = { error: vi.fn(), success: vi.fn(), warning: vi.fn() };
    mockLogger = { error: vi.fn() };
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await TestBed.configureTestingModule({
      imports: [
        EffortEstimationComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'common.required': 'Required',
              'common.meter': 'm',
              'common.celsius-unit': '°C',
              'common.dan-unit': 'daN',
              'common.span-label': 'Span',
              'common.reference-support-label': 'Reference support',
              'common.distance-to-reference-support-label': 'Distance to reference support',
              'common.temperature-label': 'Temperature',
              'common.calculate': 'Calculate',
              'common.results': 'Results:',
              'common.copied-to-clipboard': 'Copied to clipboard',
              'common.copy-to-clipboard-failed': 'Failed to copy to the clipboard',
              'common.min-value-error': 'Min. value: {{ min }}',
              'common.max-value-error': 'Max. value: {{ max }}',
              'common.max-decimals-error': 'Max decimals: {{ maxDecimals }}',
              'shared.python-errors.estimation-not-converged-error': 'The target is not reachable.',
              'studio.estimations.target-displacement-label': 'Target displ.',
              'studio.estimations.effort-direction-up': 'Up',
              'studio.estimations.effort-direction-down': 'Down',
              'studio.estimations.effort-label': 'Traction (-) / Weight (+)',
              'studio.estimations.axis-displacement-label': 'Displ. along span axis (x)',
              'studio.estimations.copy-effort-aria-label': 'Copy the effort',
              'studio.estimations.effort-calculation-failed': 'Failed to estimate the effort'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
        })
      ],
      providers: [
        { provide: WorkerPythonService, useValue: mockWorkerPythonService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: ObstaclesService, useValue: { selectedMeasureUuid: signal(null) } },
        {
          provide: LoadFormsService,
          useValue: { isEngineSynchronized: engineSynchronized, engineRevision: engineRevision }
        }
      ]
    }).compileComponents();

    TestBed.inject(PlotSpanService).section.set(makeSection());
    createComponent();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  describe('HTML rendering', () => {
    it('renders the form', () => {
      expect(getByTestId('effort-estimation-form')?.tagName).toBe('FORM');
    });

    it('labels every field', () => {
      const labels = Array.from(fixture.nativeElement.querySelectorAll('label') as NodeListOf<HTMLLabelElement>).map(
        (label) => [label.htmlFor, label.textContent?.trim()]
      );
      expect(labels).toEqual([
        ['effort-estimation-span', 'Span'],
        ['effort-estimation-reference-support', 'Reference support'],
        ['effort-estimation-distance', 'Distance to reference support'],
        ['effort-estimation-temperature', 'Temperature'],
        ['effort-estimation-target-displacement', 'Target displ.']
      ]);
    });
  });

  describe('Span (RG.PDS-TRA.POR)', () => {
    it('lists every span of the section, filtered while typing', () => {
      const select = selectByTestId('span-select');
      expect((select.options as { label: string }[]).map((option) => option.label)).toEqual([
        '1 - 2',
        '2 - 3',
        '3 - 4'
      ]);
      expect(select.filter).toBe(true);
    });

    it('selects the current span by default', () => {
      fixture.destroy();
      TestBed.inject(PlotOptionsService).plotOptions.update((options) => ({ ...options, startSupport: 1 }));

      createComponent();

      expect(component.form.controls.span.value).toEqual({ index: 1, uuid: 'support-2' });
    });

    it('selects no span when the current one is unknown', () => {
      fixture.destroy();
      TestBed.inject(PlotOptionsService).plotOptions.update((options) => ({ ...options, startSupport: 9 }));

      createComponent();

      expect(component.form.controls.span.value).toBeNull();
      expect(component.form.controls.referenceSupport.disabled).toBe(true);
    });
  });

  describe('Reference support (RG.PDS-TRA.SUP)', () => {
    it('is reduced to the two supports of the selected span, the departure one being selected', () => {
      selectSpan(1);

      expect(selectByTestId('reference-support-select').options).toEqual([
        { label: '2', value: 'LEFT' },
        { label: '3', value: 'RIGHT' }
      ]);
      expect(component.form.controls.referenceSupport.value).toBe('LEFT');
      expect(component.form.controls.referenceSupport.enabled).toBe(true);
    });

    it('goes back to the departure support when the span changes', () => {
      selectSpan(1);
      component.form.controls.referenceSupport.setValue('RIGHT');

      selectSpan(2);

      expect(component.form.controls.referenceSupport.value).toBe('LEFT');
    });

    it('is empty and disabled without span', () => {
      selectSpan(1);
      selectSpan(null);

      expect(selectByTestId('reference-support-select').options).toEqual([]);
      expect(component.form.controls.referenceSupport.value).toBeNull();
      expect(component.form.controls.referenceSupport.disabled).toBe(true);
    });
  });

  describe('Distance to the reference support (RG.PDS-TRA.DIS)', () => {
    it('is empty by default, so that no load is placed on a support', () => {
      expect(component.form.controls.distanceToReferenceSupport.value).toBeNull();
      expect(component.form.controls.distanceToReferenceSupport.valid).toBe(false);
    });

    it.each(['0.01', '1.5', '399.99', '12.34'])('accepts %s on a 400 m span', (value) => {
      selectSpan(0);
      typeIn('distance-input', value);
      expect(component.form.controls.distanceToReferenceSupport.valid).toBe(true);
      expect(getByTestId('distance-input')?.getAttribute('aria-invalid')).toBeNull();
    });

    it.each([
      ['0', 'Min. value: 0.01'],
      ['-0.01', 'Min. value: 0.01'],
      ['400', 'Max. value: 399.99'],
      ['400.01', 'Max. value: 399.99'],
      ['1.234', 'Max decimals: 2']
    ])('rejects %s with "%s"', (value, message) => {
      selectSpan(0);
      typeIn('distance-input', value);

      expect(getByTestId('distance-input')?.getAttribute('aria-invalid')).toBe('true');
      expect(fixture.nativeElement.querySelector('#effort-estimation-distance-error')?.textContent?.trim()).toBe(
        message
      );
    });

    it('is limited to the length of the selected span', () => {
      selectSpan(1);
      expect(getByTestId('distance-input')?.getAttribute('max')).toBe('250.49');
      typeIn('distance-input', '300');
      expect(component.form.controls.distanceToReferenceSupport.valid).toBe(false);

      selectSpan(0);
      expect(getByTestId('distance-input')?.getAttribute('max')).toBe('399.99');
      expect(component.form.controls.distanceToReferenceSupport.valid).toBe(true);
    });

    it('is required', () => {
      selectSpan(0);
      typeIn('distance-input', '');
      expect(fixture.nativeElement.querySelector('#effort-estimation-distance-error')?.textContent?.trim()).toBe(
        'Required'
      );
    });
  });

  describe('Temperature (RG.PDS-TRA.TEM)', () => {
    it('is empty by default', () => {
      expect(component.form.controls.temperature.value).toBeNull();
    });

    it.each(['-50', '250', '-12.34', '0'])('accepts %s', (value) => {
      typeIn('temperature-input', value);
      expect(component.form.controls.temperature.valid).toBe(true);
    });

    it.each([
      ['-50.01', 'Min. value: -50'],
      ['250.01', 'Max. value: 250'],
      ['1.234', 'Max decimals: 2'],
      ['', 'Required']
    ])('rejects "%s" with "%s"', (value, message) => {
      typeIn('temperature-input', value);

      expect(getByTestId('temperature-input')?.getAttribute('aria-invalid')).toBe('true');
      expect(fixture.nativeElement.querySelector('#effort-estimation-temperature-error')?.textContent?.trim()).toBe(
        message
      );
    });
  });

  describe('Target displacement (RG.PDS-TRA.DEP)', () => {
    it('goes up by default, with a 0 value', () => {
      expect(component.form.controls.direction.value).toBe('UP');
      expect(component.form.controls.targetDisplacement.value).toBe(0);
      expect(getByTestId('direction-up')?.textContent?.trim()).toBe('Up');
      expect(getByTestId('direction-down')?.textContent?.trim()).toBe('Down');
    });

    it.each(['0', '1', '150'])('accepts %s', (value) => {
      typeIn('target-displacement-input', value);
      expect(component.form.controls.targetDisplacement.valid).toBe(true);
    });

    it.each([
      ['-1', 'Min. value: 0'],
      ['151', 'Max. value: 150'],
      ['1.5', 'Max decimals: 0'],
      ['', 'Required']
    ])('rejects "%s" with "%s"', (value, message) => {
      typeIn('target-displacement-input', value);

      expect(
        fixture.nativeElement.querySelector('#effort-estimation-target-displacement-error')?.textContent?.trim()
      ).toBe(message);
    });
  });

  describe('Calculate button (RG.PDS-TRA.CAL-BTN)', () => {
    it('is inactive until the span and every field are filled with valid values', () => {
      expect(calculateBtn().disabled).toBe(true);

      selectSpan(0);
      expect(calculateBtn().disabled).toBe(true);

      typeIn('temperature-input', '251');
      expect(calculateBtn().disabled).toBe(true);

      typeIn('temperature-input', '15');
      expect(calculateBtn().disabled).toBe(true);

      typeIn('distance-input', '0');
      expect(calculateBtn().disabled).toBe(true);

      typeIn('distance-input', '100');
      expect(calculateBtn().disabled).toBe(false);
    });

    it('is inactive while the engine study is not synchronized', () => {
      selectSpan(0);
      typeIn('temperature-input', '15');

      engineSynchronized.set(false);
      fixture.detectChanges();

      expect(calculateBtn().disabled).toBe(true);
    });

    it('estimates an upward displacement from the left support', async () => {
      selectSpan(1);
      fillForm();

      await calculate();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.estimateLoadRelative, {
        spanIndex: 1,
        loadPositionDistance: 100,
        temperature: 15,
        targetDistance: 2,
        bounds: [-1000, 0]
      });
    });

    it('estimates a downward displacement from the right support', async () => {
      selectSpan(1);
      fillForm();
      component.form.controls.referenceSupport.setValue('RIGHT');
      component.form.controls.direction.setValue('DOWN');
      fixture.detectChanges();

      await calculate();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.estimateLoadRelative, {
        spanIndex: 1,
        loadPositionDistance: 150.5,
        temperature: 15,
        targetDistance: -2,
        bounds: [0, 1000]
      });
    });

    it('locks the inputs during the calculation, then keeps them editable', async () => {
      let resolveTask!: (value: unknown) => void;
      mockWorkerPythonService.runTask.mockReturnValue(new Promise((resolve) => (resolveTask = resolve)));
      selectSpan(0);
      fillForm();

      const calculation = component.calculate();
      fixture.detectChanges();
      expect((getByTestId('temperature-input') as HTMLInputElement).disabled).toBe(true);
      expect(component.form.controls.span.disabled).toBe(true);

      resolveTask({ result: ENGINE_RESULT, error: null, diagnostics: [] });
      await calculation;
      fixture.detectChanges();

      expect((getByTestId('temperature-input') as HTMLInputElement).disabled).toBe(false);
      expect(component.form.controls.span.enabled).toBe(true);
      expect(component.form.controls.referenceSupport.enabled).toBe(true);
    });
  });

  describe('Results (RG.PDS-TRA.RES-CAD / EFF-RES / DEP-RES)', () => {
    beforeEach(() => {
      selectSpan(0);
      fillForm();
    });

    it('hides the results frame until calculated', () => {
      expect(getByTestId('results-frame')).toBeNull();
    });

    it('shows the effort in daN and the displacement along the span axis, both with two decimals', async () => {
      await calculate();

      expect(textOf('effort-value')).toBe('-121.05 daN');
      expect(textOf('axis-displacement-value')).toBe('0.13 m');
      expect(getByTestId('results-frame')?.querySelector('input')).toBeNull();
    });

    it.each([
      [-0.004, '0.00 daN'],
      [4635.806, '4,635.81 daN'],
      [0, '0.00 daN']
    ])('shows a %s daN effort as "%s"', async (effort, displayed) => {
      mockEngineResult({ effort });

      await calculate();

      expect(textOf('effort-value')).toBe(displayed);
    });

    it('keeps the results hidden when the engine result is for another section', async () => {
      await calculate();

      TestBed.inject(PlotSpanService).section.set(makeSection());
      fixture.detectChanges();

      expect(getByTestId('results-frame')).toBeNull();
    });

    it('hides the results once an input changes', async () => {
      await calculate();

      typeIn('temperature-input', '20');

      expect(getByTestId('results-frame')).toBeNull();
    });

    it('shows the engine error message and no result when the target is not reachable', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: TaskError.CALCULATION_ERROR,
        diagnostics: [
          {
            code: PythonErrorCode.EstimationNotConvergedError,
            severity: 'error',
            origin: 'exception',
            rawText: 'EstimationNotConvergedError: boom'
          }
        ]
      });

      await calculate();

      expect(mockNotificationService.error).toHaveBeenCalledWith('The target is not reachable.');
      expect(getByTestId('results-frame')).toBeNull();
    });

    it('falls back to the effort failure message', async () => {
      mockWorkerPythonService.runTask.mockRejectedValue(new Error('worker down'));

      await calculate();

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to estimate the effort');
    });
  });

  describe('Copy icon (RG.PDS-TRA.EFF-RES.3)', () => {
    beforeEach(() => {
      selectSpan(0);
      fillForm();
    });

    it('copies the displayed effort, without unit nor group separator, to the clipboard', async () => {
      mockEngineResult({ effort: -4635.804 });
      await calculate();

      expect(getByTestId('copy-effort-btn')?.getAttribute('aria-label')).toBe('Copy the effort');
      getByTestId('copy-effort-btn')?.click();
      await fixture.whenStable();

      expect(writeText).toHaveBeenCalledWith('-4635.80');
      expect(mockNotificationService.success).toHaveBeenCalledWith('Copied to clipboard');
    });

    it('notifies when the copy fails', async () => {
      writeText.mockRejectedValue(new Error('denied'));
      await calculate();

      await component.copyEffort();

      expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to copy to the clipboard');
    });

    it('copies nothing without result', async () => {
      await component.copyEffort();
      expect(writeText).not.toHaveBeenCalled();
    });
  });
});
