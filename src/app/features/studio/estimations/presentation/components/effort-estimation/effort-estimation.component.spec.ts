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
import { EffortEstimationComponent } from '@features/studio/estimations/presentation/components/effort-estimation/effort-estimation.component';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { PythonErrorCode, Task, TaskError } from '@services/worker_python/tasks/types';
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { Section } from '@shared/domain';

// Synthetic data only
const makeSection = (): Section =>
  ({
    uuid: 'section-uuid',
    supports: [
      { uuid: 'support-a', number: 'ABCDE-001', spanLength: 310.5 },
      { uuid: 'support-b', number: 'FGHIJ-002', spanLength: 420 },
      { uuid: 'support-c', number: 'KLMNO-003', spanLength: null }
    ]
  }) as unknown as Section;

const ENGINE_RESULT = { effort: -45.678, xDisplacement: 3.2149 };

describe('EffortEstimationComponent', () => {
  let component: EffortEstimationComponent;
  let fixture: ComponentFixture<EffortEstimationComponent>;
  let spanService: PlotSpanService;
  let plotOptionsService: PlotOptionsService;
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

  const errorOf = (id: string): string | undefined =>
    fixture.nativeElement.querySelector(`#${id}-error`)?.textContent?.trim();

  const selects = (): Select[] =>
    fixture.debugElement.queryAll(By.directive(Select)).map((debugElement) => debugElement.componentInstance);

  const calculateBtn = (): HTMLButtonElement => getByTestId('calculate-btn') as HTMLButtonElement;

  const calculate = async (): Promise<void> => {
    await component.calculate();
    fixture.detectChanges();
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
        EffortEstimationComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'common.required': 'Required',
              'common.meter': 'm',
              'common.min-value-error': 'Min. value: {{ min }}',
              'common.max-value-error': 'Max. value: {{ max }}',
              'common.max-decimals-error': 'Max decimals: {{ maxDecimals }}',
              'common.error-occurred-label': 'An error occurred',
              'shared.python-errors.estimation-not-converged-error': 'The target cannot be reached.',
              'shared.python-errors.estimate-on-split-support-error': 'Span split by a virtual support.',
              'shared.python-errors.effort-position-out-of-span-error': 'The distance is outside the span.',
              'studio.effort-estimation.up': 'Up',
              'studio.effort-estimation.down': 'Down',
              'studio.effort-estimation.copied': 'Effort copied',
              'studio.effort-estimation.copy-failed': 'Copy failed'
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
    plotOptionsService = TestBed.inject(PlotOptionsService);
    spanService.section.set(makeSection());
    fixture = TestBed.createComponent(EffortEstimationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Span (RG.PDS-TRA.POR)', () => {
    it('lists every span of the section named after its supports, truncated to 5 characters (POR.1)', () => {
      const [spanSelect] = selects();
      expect(spanSelect.options?.map((option) => option.label)).toEqual(['ABCDE - FGHIJ', 'FGHIJ - KLMNO']);
    });

    it('filters the list while typing (POR.2)', () => {
      const [spanSelect] = selects();
      expect(spanSelect.filter).toBe(true);
    });

    it('selects the current span of the studio by default (POR.4)', () => {
      expect(component.form.controls.span.value).toEqual({ index: 0, uuid: 'support-a' });

      plotOptionsService.plotOptions.update((options) => ({ ...options, startSupport: 1, endSupport: 2 }));
      const otherFixture = TestBed.createComponent(EffortEstimationComponent);
      otherFixture.detectChanges();
      expect(otherFixture.componentInstance.form.controls.span.value).toEqual({ index: 1, uuid: 'support-b' });
    });

    it('selects no span when the current span is not in the section', () => {
      plotOptionsService.plotOptions.update((options) => ({ ...options, startSupport: 9, endSupport: 10 }));
      const otherFixture = TestBed.createComponent(EffortEstimationComponent);
      otherFixture.detectChanges();
      expect(otherFixture.componentInstance.form.controls.span.value).toBeNull();
    });
  });

  describe('Reference support (RG.PDS-TRA.SUP)', () => {
    it('is empty and disabled without span (SUP.1)', () => {
      component.form.controls.span.setValue(null);
      fixture.detectChanges();
      expect(component.supportOptions()).toEqual([]);
      expect(component.form.controls.referenceSupport.disabled).toBe(true);
      expect(component.form.controls.referenceSupport.value).toBeNull();
    });

    it('lists the numbers of the two supports of the selected span (POR.3, SUP.2)', () => {
      component.form.controls.span.setValue({ index: 1, uuid: 'support-b' });
      fixture.detectChanges();
      expect(selects()[1].options).toEqual([
        { label: 'FGHIJ', value: 'LEFT' },
        { label: 'KLMNO', value: 'RIGHT' }
      ]);
      expect(component.form.controls.referenceSupport.enabled).toBe(true);
    });

    it('preselects the departure support of the span', () => {
      expect(component.form.controls.referenceSupport.value).toBe('LEFT');
    });

    it('goes back to the departure support when the span changes', () => {
      component.form.controls.referenceSupport.setValue('RIGHT');
      component.form.controls.span.setValue({ index: 1, uuid: 'support-b' });
      expect(component.form.controls.referenceSupport.value).toBe('LEFT');
    });
  });

  describe('Distance to the reference support (RG.PDS-TRA.DIS)', () => {
    it('defaults to 0 (DIS.2)', () => {
      expect((getByTestId('distance-input') as HTMLInputElement).value).toBe('0');
    });

    it.each([
      ['-0.01', 'Min. value: 0'],
      ['310.51', 'Max. value: 310.5'],
      ['1.234', 'Max decimals: 2'],
      ['', 'Required']
    ])('rejects "%s" (DIS.1)', (value, message) => {
      typeIn('distance-input', value);
      expect(errorOf('effort-distance')).toBe(message);
      expect(getByTestId('distance-input')?.getAttribute('aria-invalid')).toBe('true');
    });

    it.each(['0', '310.5', '12.34'])('accepts %s (DIS.1)', (value) => {
      typeIn('distance-input', value);
      expect(errorOf('effort-distance')).toBeUndefined();
    });

    it('is limited to the length of the selected span', () => {
      expect(component.spanLength()).toBe(310.5);
      expect(getByTestId('distance-input')?.getAttribute('max')).toBe('310.5');

      component.form.controls.span.setValue({ index: 1, uuid: 'support-b' });
      fixture.detectChanges();
      expect(component.spanLength()).toBe(420);
      expect(getByTestId('distance-input')?.getAttribute('max')).toBe('420');

      typeIn('distance-input', '400');
      expect(errorOf('effort-distance')).toBeUndefined();
    });

    it('is checked again against the new span when the span changes', () => {
      typeIn('distance-input', '400');
      expect(errorOf('effort-distance')).toBe('Max. value: 310.5');
      expect(calculateBtn().disabled).toBe(true);

      component.form.controls.span.setValue({ index: 1, uuid: 'support-b' });
      fixture.detectChanges();
      expect(errorOf('effort-distance')).toBeUndefined();
      expect(calculateBtn().disabled).toBe(false);

      typeIn('distance-input', '300');
      component.form.controls.span.setValue({ index: 0, uuid: 'support-a' });
      fixture.detectChanges();
      expect(component.form.controls.distanceToReferenceSupport.valid).toBe(true);
    });

    it('disables the calculation when the span length is unknown', () => {
      component.form.controls.span.setValue({ index: 2, uuid: 'support-c' });
      fixture.detectChanges();

      expect(component.spanLength()).toBeNull();
      expect(calculateBtn().disabled).toBe(true);
    });
  });

  describe('Temperature (RG.PDS-TRA.TEM)', () => {
    it('defaults to 15 (TEM.2)', () => {
      expect(component.form.controls.temperature.value).toBe(15);
      expect((getByTestId('temperature-input') as HTMLInputElement).value).toBe('15');
    });

    it.each([
      ['-50.01', 'Min. value: -50'],
      ['250.01', 'Max. value: 250'],
      ['1.234', 'Max decimals: 2'],
      ['', 'Required']
    ])('rejects "%s" (TEM.1)', (value, message) => {
      typeIn('temperature-input', value);
      expect(errorOf('effort-temperature')).toBe(message);
    });

    it.each(['-50', '250', '15.25'])('accepts %s (TEM.1)', (value) => {
      typeIn('temperature-input', value);
      expect(errorOf('effort-temperature')).toBeUndefined();
    });
  });

  describe('Target displacement (RG.PDS-TRA.DEP)', () => {
    it('is on "Up" by default (DEP.1)', () => {
      expect(component.form.controls.direction.value).toBe('UP');
      expect(textOf('direction-up')).toBe('Up');
      expect(textOf('direction-down')).toBe('Down');
    });

    it('does not allow an empty direction', () => {
      const switchButton = fixture.debugElement.query(By.css('[data-testid="direction-switch"]'));
      expect(switchButton.componentInstance.allowEmpty).toBe(false);
    });

    it('defaults to 0 (DEP.3)', () => {
      expect((getByTestId('target-displacement-input') as HTMLInputElement).value).toBe('0');
    });

    it.each([
      ['-1', 'Min. value: 0'],
      ['150.5', 'Max. value: 150'],
      ['151', 'Max. value: 150'],
      ['1.5', 'Max decimals: 0'],
      ['', 'Required']
    ])('rejects "%s" (DEP.2)', (value, message) => {
      typeIn('target-displacement-input', value);
      expect(errorOf('effort-target-displacement')).toBe(message);
    });

    it.each(['0', '150', '12'])('accepts %s (DEP.2)', (value) => {
      typeIn('target-displacement-input', value);
      expect(errorOf('effort-target-displacement')).toBeUndefined();
    });
  });

  describe('Calculate button (RG.PDS-TRA.CAL-BTN)', () => {
    it('is enabled once every field holds its default value (CAL-BTN.1)', () => {
      expect(calculateBtn().disabled).toBe(false);
    });

    it('is disabled while a field is not filled (CAL-BTN.1)', () => {
      typeIn('temperature-input', '');
      expect(calculateBtn().disabled).toBe(true);

      typeIn('temperature-input', '15');
      expect(calculateBtn().disabled).toBe(false);
    });

    it('is disabled while a field is invalid (CAL-BTN.1)', () => {
      typeIn('distance-input', '310.51');
      expect(calculateBtn().disabled).toBe(true);

      typeIn('distance-input', '10');
      expect(calculateBtn().disabled).toBe(false);
    });

    it('is disabled without span', () => {
      component.form.controls.span.setValue(null);
      fixture.detectChanges();
      expect(calculateBtn().disabled).toBe(true);
    });

    it('runs the estimation with every field (CAL-BTN.2)', async () => {
      typeIn('distance-input', '120.5');
      typeIn('target-displacement-input', '3');
      component.form.controls.direction.setValue('DOWN');
      component.form.controls.referenceSupport.setValue('RIGHT');

      await calculate();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.estimateCableEffort, {
        spanIndex: 0,
        referenceSupport: 'RIGHT',
        distanceToReferenceSupport: 120.5,
        temperature: 15,
        targetDisplacement: 3,
        direction: 'DOWN'
      });
    });

    it('does not run the estimation while the button is disabled', async () => {
      typeIn('temperature-input', '');
      await calculate();
      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('does not run the estimation when the span is unknown', async () => {
      component.form.controls.span.setValue(null);
      await calculate();
      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('keeps the fields editable after the calculation (CAL-BTN.2)', async () => {
      await calculate();
      expect(component.form.enabled).toBe(true);
    });

    it('is disabled until an input is modified once the results are displayed', async () => {
      await calculate();
      expect(calculateBtn().disabled).toBe(true);

      typeIn('temperature-input', '20');
      expect(calculateBtn().disabled).toBe(false);
    });

    it('is disabled while the calculation is running', async () => {
      let release!: (value: unknown) => void;
      mockWorkerPythonService.runTask.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));

      const pending = component.calculate();
      fixture.detectChanges();
      expect(calculateBtn().disabled).toBe(true);
      expect(getByTestId('effort-estimation-form')?.getAttribute('aria-busy')).toBe('true');

      release({ result: ENGINE_RESULT, error: null, diagnostics: [] });
      await pending;
      fixture.detectChanges();
      expect(getByTestId('effort-estimation-form')?.getAttribute('aria-busy')).toBe('false');
    });
  });

  describe('Results frame (RG.PDS-TRA.RES-CAD)', () => {
    it('is hidden until the calculation is done (RES-CAD.1)', () => {
      expect(getByTestId('results-frame')).toBeNull();
    });

    it('is announced politely, always present on the page', () => {
      expect(getByTestId('results')?.tagName).toBe('OUTPUT');
    });

    it('is displayed after the calculation', async () => {
      await calculate();
      expect(getByTestId('results-frame')).not.toBeNull();
    });

    it('stays displayed when an input is modified (daily of 4 November)', async () => {
      await calculate();

      typeIn('temperature-input', '20');
      expect(getByTestId('results-frame')).not.toBeNull();
      expect(textOf('effort-value')).toBe('-45.68 daN');
    });

    it('stays hidden when the calculation fails with a Python error', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: 'Solver error' as unknown as TaskError,
        diagnostics: []
      });
      await calculate();

      expect(getByTestId('results-frame')).toBeNull();
    });
  });

  describe('Results (RG.PDS-TRA.EFF-RES, RG.PDS-TRA.DEP-RES)', () => {
    beforeEach(async () => {
      await calculate();
    });

    it('shows the effort with 2 decimals, negative for a traction (EFF-RES.1)', () => {
      expect(textOf('effort-value')).toBe('-45.68 daN');
    });

    it('shows the effort as a weight when positive (EFF-RES.1)', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: { effort: 120, xDisplacement: 0 },
        error: null,
        diagnostics: []
      });
      typeIn('temperature-input', '20');
      await calculate();
      expect(textOf('effort-value')).toBe('120.00 daN');
    });

    it('shows the displacement along the span axis with 2 decimals (DEP-RES.1)', () => {
      expect(textOf('x-displacement-value')).toBe('3.21 m');
    });

    it('shows both results as read-only values (EFF-RES.2, DEP-RES.2)', () => {
      expect(getByTestId('effort-value')?.closest('dd')).not.toBeNull();
      expect(getByTestId('x-displacement-value')?.tagName).toBe('DD');
      expect(getByTestId('results-frame')?.querySelector('input')).toBeNull();
    });

    it('copies the effort as displayed to the clipboard (EFF-RES.3)', () => {
      (getByTestId('copy-effort-btn') as HTMLButtonElement).click();

      expect(mockClipboard.copy).toHaveBeenCalledWith('-45.68');
      expect(mockNotificationService.success).toHaveBeenCalledWith('Effort copied');
    });

    it('notifies when the copy fails (EFF-RES.3)', () => {
      mockClipboard.copy.mockReturnValue(false);
      (getByTestId('copy-effort-btn') as HTMLButtonElement).click();

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
      await calculate();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to estimate the cable effort', expect.any(Error));
      expect(mockNotificationService.error).toHaveBeenCalledWith('An error occurred');
      expect(component.form.enabled).toBe(true);
      expect(component.isCalculating()).toBe(false);
    });

    it.each([
      [PythonErrorCode.EstimationNotConvergedError, 'The target cannot be reached.'],
      [PythonErrorCode.EstimateOnSplitSupportError, 'Span split by a virtual support.'],
      [PythonErrorCode.EffortPositionOutOfSpanError, 'The distance is outside the span.']
    ])('notifies the specific message of the Python error %s', async (code, message) => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: 'CALCULATION_ERROR' as unknown as TaskError,
        diagnostics: [{ code, severity: 'error', origin: 'exception', rawText: `${code}: raw` }]
      });
      await calculate();

      expect(mockNotificationService.error).toHaveBeenCalledWith(message);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to estimate the cable effort', expect.any(Error));
      expect(component.results()).toBeNull();
    });

    it('falls back to the generic message when only a warning diagnostic comes with the error', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: 'CALCULATION_ERROR' as unknown as TaskError,
        diagnostics: [
          { code: PythonErrorCode.EstimationWarning, severity: 'warning', origin: 'warning', rawText: 'warning' }
        ]
      });
      await calculate();

      expect(mockNotificationService.error).toHaveBeenCalledWith('An error occurred');
    });

    it('falls back to the generic message when the worker returns no diagnostics', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({ result: null, error: 'CALCULATION_ERROR' });
      await calculate();

      expect(mockNotificationService.error).toHaveBeenCalledWith('An error occurred');
    });

    it('notifies a failure of the worker', async () => {
      mockWorkerPythonService.runTask.mockRejectedValue(new Error('worker crashed'));
      await calculate();

      expect(mockNotificationService.error).toHaveBeenCalledWith('An error occurred');
      expect(component.results()).toBeNull();
    });

    it('clears the previous results when a new calculation fails', async () => {
      await calculate();
      expect(component.results()).not.toBeNull();

      mockWorkerPythonService.runTask.mockRejectedValue(new Error('worker crashed'));
      typeIn('temperature-input', '20');
      await calculate();

      expect(getByTestId('results-frame')).toBeNull();
    });
  });
});
