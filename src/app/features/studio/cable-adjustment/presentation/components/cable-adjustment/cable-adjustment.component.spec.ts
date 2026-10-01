/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TemplateRef } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Select } from 'primeng/select';
import { CableAdjustmentComponent } from '@features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskError } from '@services/worker_python/tasks/types';
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
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

const ENGINE_RESULT = { horizontalSightAngle: 73.802, verticalSightAngle: 96.918 };

describe('CableAdjustmentComponent', () => {
  let component: CableAdjustmentComponent;
  let fixture: ComponentFixture<CableAdjustmentComponent>;
  let spanService: PlotSpanService;
  let mockToolbarDialogService: { setTemplates: ReturnType<typeof vi.fn> };
  let mockWorkerPythonService: { runTask: ReturnType<typeof vi.fn> };
  let mockNotificationService: { error: ReturnType<typeof vi.fn> };
  let mockLogger: { error: ReturnType<typeof vi.fn> };

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

  // Header and footer are rendered by the toolbar dialog, not in the component view
  const renderTemplate = (template: TemplateRef<unknown> | undefined): HTMLElement => {
    const view = template!.createEmbeddedView(null);
    view.detectChanges();
    const container = document.createElement('div');
    container.append(...view.rootNodes);
    return container;
  };

  const selects = (): Select[] =>
    fixture.debugElement.queryAll(By.directive(Select)).map((debugElement) => debugElement.componentInstance);

  const fillRequiredFields = (): void => {
    component.form.controls.support.setValue('LEFT');
    typeIn('tacheometer-horizontal-distance-input', '95');
    typeIn('adjustment-parameter-input', '1800');
  };

  const calculateBtn = (): HTMLButtonElement => getByTestId('calculate-btn') as HTMLButtonElement;

  const calculate = async (): Promise<void> => {
    await component.calculate();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockToolbarDialogService = { setTemplates: vi.fn() };
    mockWorkerPythonService = {
      runTask: vi.fn().mockResolvedValue({ result: ENGINE_RESULT, error: null, diagnostics: [] })
    };
    mockNotificationService = { error: vi.fn() };
    mockLogger = { error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [
        CableAdjustmentComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'common.required': 'Required',
              'common.meter': 'm',
              'common.left': 'Left',
              'common.right': 'Right',
              'common.min-value-error': 'Min. value: {{ min }}',
              'common.max-value-error': 'Max. value: {{ max }}',
              'common.max-decimals-error': 'Max decimals: {{ maxDecimals }}',
              'studio.cable-adjustment.grade-unit': 'gr',
              'studio.cable-adjustment.aria-help': 'Cable adjustment help',
              'studio.cable-adjustment.calculation-failed': 'Failed to calculate the cable adjustment'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
        })
      ],
      providers: [
        { provide: ToolbarDialogService, useValue: mockToolbarDialogService },
        { provide: WorkerPythonService, useValue: mockWorkerPythonService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: LoggerService, useValue: mockLogger }
      ]
    }).compileComponents();

    spanService = TestBed.inject(PlotSpanService);
    spanService.section.set(makeSection());
    fixture = TestBed.createComponent(CableAdjustmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('registers header and footer templates with the toolbar dialog service', () => {
    expect(mockToolbarDialogService.setTemplates).toHaveBeenCalledWith({
      header: component.headerTemplate(),
      footer: component.footerTemplate()
    });
  });

  describe('Span', () => {
    it('lists every span of the section named after its supports, truncated to 5 characters', () => {
      const [spanSelect] = selects();
      expect(spanSelect.options?.map((option) => option.label)).toEqual(['ABCDE - FGHIJ', 'FGHIJ - KLMNO']);
    });

    it('selects the current (first) span by default', () => {
      expect(component.form.controls.span.value).toEqual({ index: 0, uuid: 'support-a' });
    });

    it('selects no span when the section has none', () => {
      spanService.section.set(null);
      const emptyFixture = TestBed.createComponent(CableAdjustmentComponent);
      emptyFixture.detectChanges();
      expect(emptyFixture.componentInstance.form.controls.span.value).toBeNull();
    });
  });

  describe('Span length', () => {
    it('shows the length of the selected span', () => {
      expect(textOf('span-length-value')).toBe('310.5 m');

      component.form.controls.span.setValue({ index: 1, uuid: 'support-b' });
      fixture.detectChanges();
      expect(textOf('span-length-value')).toBe('420 m');
    });

    it('shows a dash without span', () => {
      component.form.controls.span.setValue(null);
      fixture.detectChanges();
      expect(textOf('span-length-value')).toBe('- m');
    });

    it('is read-only', () => {
      expect(getByTestId('span-length-value')?.tagName).toBe('DD');
    });
  });

  describe('Support angles', () => {
    const angleIds = ['left-horizontal-angle', 'right-horizontal-angle', 'left-vertical-angle', 'right-vertical-angle'];

    it.each(angleIds)('%s defaults to 0', (id) => {
      expect((getByTestId(`${id}-input`) as HTMLInputElement).value).toBe('0');
    });

    it.each(angleIds)('%s shows the bound and decimals errors', (id) => {
      const error = () => fixture.nativeElement.querySelector(`#${id}-error`)?.textContent?.trim();

      typeIn(`${id}-input`, '-200.01');
      expect(error()).toBe('Min. value: -200');
      typeIn(`${id}-input`, '200.01');
      expect(error()).toBe('Max. value: 200');
      typeIn(`${id}-input`, '1.234');
      expect(error()).toBe('Max decimals: 2');
      typeIn(`${id}-input`, '-12.34');
      expect(error()).toBeUndefined();
      expect(getByTestId(`${id}-input`)?.getAttribute('aria-invalid')).toBeNull();
    });
  });

  describe('Support', () => {
    it('is empty and disabled without span', () => {
      component.form.controls.span.setValue(null);
      fixture.detectChanges();
      expect(component.supportOptions()).toEqual([]);
      expect(component.form.controls.support.disabled).toBe(true);
    });

    it('lists the left and right supports of the selected span', () => {
      component.form.controls.span.setValue({ index: 1, uuid: 'support-b' });
      fixture.detectChanges();
      expect(selects()[1].options).toEqual([
        { label: 'Left', value: 'LEFT' },
        { label: 'Right', value: 'RIGHT' }
      ]);
      expect(component.form.controls.support.enabled).toBe(true);
    });

    it('clears the support when the span changes', () => {
      component.form.controls.support.setValue('RIGHT');
      component.form.controls.span.setValue({ index: 1, uuid: 'support-b' });
      expect(component.form.controls.support.value).toBeNull();
    });
  });

  describe('Tacheometer distance and adjustment parameter', () => {
    const error = (id: string) => fixture.nativeElement.querySelector(`#${id}-error`)?.textContent?.trim();

    it('have no default value', () => {
      expect(component.form.controls.tacheometerHorizontalDistance.value).toBeNull();
      expect(component.form.controls.adjustmentParameter.value).toBeNull();
    });

    it.each([
      ['-0.01', 'Min. value: 0'],
      ['5000.01', 'Max. value: 5000'],
      ['1.234', 'Max decimals: 2'],
      ['', 'Required']
    ])('tacheometer distance rejects "%s"', (value, message) => {
      typeIn('tacheometer-horizontal-distance-input', value);
      expect(error('tacheometer-horizontal-distance')).toBe(message);
    });

    it.each(['0', '5000', '95.25'])('tacheometer distance accepts %s', (value) => {
      typeIn('tacheometer-horizontal-distance-input', value);
      expect(error('tacheometer-horizontal-distance')).toBeUndefined();
    });

    it.each([
      ['19', 'Min. value: 20'],
      ['5001', 'Max. value: 5000'],
      ['20.5', 'Max decimals: 0'],
      ['', 'Required']
    ])('adjustment parameter rejects "%s"', (value, message) => {
      typeIn('adjustment-parameter-input', value);
      expect(error('adjustment-parameter')).toBe(message);
    });

    it.each(['20', '5000'])('adjustment parameter accepts %s', (value) => {
      typeIn('adjustment-parameter-input', value);
      expect(error('adjustment-parameter')).toBeUndefined();
    });
  });

  describe('Calculate button', () => {
    it('is disabled while required fields are missing', () => {
      expect(calculateBtn().disabled).toBe(true);

      fillRequiredFields();
      expect(calculateBtn().disabled).toBe(false);
    });

    it('is disabled when the span length is unknown', () => {
      fillRequiredFields();
      component.form.controls.span.setValue({ index: 2, uuid: 'support-c' });
      component.form.controls.support.setValue('LEFT');
      fixture.detectChanges();
      expect(calculateBtn().disabled).toBe(true);
    });

    it('runs the calculation with the validated values', async () => {
      fillRequiredFields();
      calculateBtn().click();
      await fixture.whenStable();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledTimes(1);
      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.calculateCableAdjustment, {
        spanIndex: 0,
        spanLength: 310.5,
        leftHorizontalAngle: 0,
        rightHorizontalAngle: 0,
        leftVerticalAngle: 0,
        rightVerticalAngle: 0,
        support: 'LEFT',
        tacheometerHorizontalDistance: 95,
        adjustmentParameter: 1800
      });
    });

    it('flags the invalid fields and does not calculate', async () => {
      await calculate();

      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('#adjustment-parameter-error')?.textContent?.trim()).toBe('Required');
    });

    it('marks the form busy while calculating', async () => {
      let resolveTask!: (value: unknown) => void;
      mockWorkerPythonService.runTask.mockReturnValueOnce(new Promise((resolve) => (resolveTask = resolve)));
      fillRequiredFields();

      const pending = component.calculate();
      fixture.detectChanges();
      expect(component.isCalculating()).toBe(true);
      expect(getByTestId('cable-adjustment-form')?.getAttribute('aria-busy')).toBe('true');
      expect(component.canCalculate()).toBe(false);

      resolveTask({ result: ENGINE_RESULT, error: null, diagnostics: [] });
      await pending;
      expect(component.isCalculating()).toBe(false);
    });
  });

  describe('Results', () => {
    it('hides the results until a successful calculation', async () => {
      expect(getByTestId('results-frame')).toBeNull();

      fillRequiredFields();
      await calculate();
      expect(getByTestId('results-frame')).not.toBeNull();
    });

    it('hides the results again when an input changes', async () => {
      fillRequiredFields();
      await calculate();

      typeIn('adjustment-parameter-input', '1900');
      expect(getByTestId('results-frame')).toBeNull();
    });

    it('locks the inputs while calculating so results match them', async () => {
      let resolveTask!: (value: unknown) => void;
      mockWorkerPythonService.runTask.mockReturnValueOnce(new Promise((resolve) => (resolveTask = resolve)));
      fillRequiredFields();

      const pending = component.calculate();
      fixture.detectChanges();
      expect(component.form.disabled).toBe(true);
      expect((getByTestId('adjustment-parameter-input') as HTMLInputElement).disabled).toBe(true);

      resolveTask({ result: ENGINE_RESULT, error: null, diagnostics: [] });
      await pending;
      fixture.detectChanges();
      expect(component.form.enabled).toBe(true);
      expect(component.form.controls.support.enabled).toBe(true);
      expect(getByTestId('results-frame')).not.toBeNull();
    });

    it('show both angles rounded to the grade', async () => {
      fillRequiredFields();
      await calculate();

      expect(textOf('horizontal-sight-angle-value')).toBe('74 gr');
      expect(textOf('vertical-sight-angle-value')).toBe('97 gr');
    });

    it('are read-only', async () => {
      fillRequiredFields();
      await calculate();

      expect(getByTestId('horizontal-sight-angle-value')?.tagName).toBe('DD');
      expect(getByTestId('vertical-sight-angle-value')?.tagName).toBe('DD');
    });

    it.each([
      ['an engine error', () => Promise.resolve({ result: null, error: TaskError.CALCULATION_ERROR, diagnostics: [] })],
      ['a worker failure', () => Promise.reject(new Error('worker down'))]
    ])('notifies the user and shows no results on %s', async (_, answer) => {
      mockWorkerPythonService.runTask.mockImplementationOnce(answer);
      fillRequiredFields();
      await calculate();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to calculate the cable adjustment', expect.any(Error));
      expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to calculate the cable adjustment');
      expect(getByTestId('results-frame')).toBeNull();
      expect(component.isCalculating()).toBe(false);
    });
  });

  describe('Deferred actions', () => {
    it('shows the report button disabled', () => {
      const reportBtn = renderTemplate(component.footerTemplate()).querySelector<HTMLButtonElement>(
        '[data-testid="report-btn"]'
      );
      expect(reportBtn?.disabled).toBe(true);
    });

    it('US.REG.AID shows the help button disabled with an accessible name', () => {
      const helpBtn = getByTestId('help-btn') as HTMLButtonElement;
      expect(helpBtn.disabled).toBe(true);
      expect(helpBtn.getAttribute('aria-label')).toBe('Cable adjustment help');
    });
  });
});
