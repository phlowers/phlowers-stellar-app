/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { Section } from '@shared/domain';
import { StorageService } from '@services/storage/storage.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { SectionService } from '@services/section/section.service';
import { TaskTimeoutError, WorkerPythonService } from '@services/worker_python/worker-python.service';
import { PythonErrorCode, Task, TaskError } from '@services/worker_python/tasks/types';
import { NotificationService } from '@services/notification/notification.service';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { ForestTrenchesComponent } from './forest-trenches.component';
import { FOREST_TRENCHES_CALCULATION_TIMEOUT_MS } from './forest-trenches.constantes';
import { createForestTrenchesPlot } from './forest-trenches.helpers';

vi.mock('./forest-trenches.helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./forest-trenches.helpers')>();
  return {
    ...actual,
    createForestTrenchesPlot: vi.fn(),
    purgeForestTrenchesPlot: vi.fn(),
    resizeForestTrenchesPlot: vi.fn()
  };
});

describe('ForestTrenchesComponent', () => {
  let fixture: ComponentFixture<ForestTrenchesComponent>;
  let component: ForestTrenchesComponent;
  let section: Section;
  let sectionSignal: ReturnType<typeof signal<Section | null>>;
  let workerPython: { runTask: ReturnType<typeof vi.fn>; runTaskWithTimeout: ReturnType<typeof vi.fn> };
  let sectionService: { createOrUpdateSection: ReturnType<typeof vi.fn> };
  let notificationService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let logger: { error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };

  async function createComponent(
    initialSection = makeSection(),
    configOverride: Record<string, unknown> | null = {}
  ): Promise<void> {
    section = initialSection;
    sectionSignal = signal(section);
    sectionService = { createOrUpdateSection: vi.fn().mockResolvedValue({ removedGeometryBoundObjects: false }) };
    notificationService = { success: vi.fn(), error: vi.fn() };
    logger = { error: vi.fn(), warn: vi.fn() };
    workerPython = {
      runTask: vi.fn().mockResolvedValue({
        result: { distances: [0, 100], altitudes: [10, 12], length: 100 },
        error: null,
        diagnostics: []
      }),
      runTaskWithTimeout: vi.fn().mockResolvedValue({
        result: { spans: [makeSpanOutput(0), makeSpanOutput(1)] },
        error: null,
        diagnostics: []
      })
    };

    await TestBed.configureTestingModule({
      imports: [
        ForestTrenchesComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
        })
      ],
      providers: [
        { provide: StorageService, useValue: { db: makeDb(configOverride) } },
        { provide: PlotService, useValue: { study: signal({ uuid: 'study-1', sections: [section] }) } },
        { provide: PlotSpanService, useValue: { section: sectionSignal } },
        { provide: SectionService, useValue: sectionService },
        { provide: WorkerPythonService, useValue: workerPython },
        { provide: NotificationService, useValue: notificationService },
        { provide: LoggerService, useValue: logger }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForestTrenchesComponent);
    component = fixture.componentInstance;
    for (let index = 0; index < 3; index++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the support, slicing, and conformity form controls', async () => {
    await createComponent();

    expect(getByTestId('forest-trenches-form')).not.toBeNull();
    expect(getByTestId('forest-trenches-first-support-select')).not.toBeNull();
    expect(getByTestId('forest-trenches-last-support-select')).not.toBeNull();
    expect(getByTestId('forest-trenches-n-points-select')).not.toBeNull();
    expect(getByTestId('forest-trenches-rules-multiselect')).not.toBeNull();
    expect(component.form.getRawValue()).toMatchObject({
      firstSupportUuid: 'support-1',
      lastSupportUuid: 'support-3',
      nPoints: 3,
      selectedRules: ['RULE_1']
    });
    expect(component.canCalculate()).toBe(true);
  });

  it('renders the header template and registers it in the toolbar dialog', async () => {
    await createComponent();
    const toolbarDialog = TestBed.inject(ToolbarDialogService);

    expect(component.headerTemplate()).toBeDefined();
    expect(toolbarDialog.templates().header).toBe(component.headerTemplate());
    expect(getByTestId('forest-trenches-missing-configuration')).toBeNull();
    expect(getByTestId('forest-trenches-median-f1')).toBeNull();
  });

  it('keeps Calculate disabled and warns once when the stored config predates forest trenches fields', async () => {
    await createComponent(makeSection(), {
      forest_trenches_n_points_choices: undefined,
      forest_trenches_overhang_rules: undefined,
      forest_trenches_lateral_rules: undefined,
      forest_trenches_chart: undefined,
      floor_obstacle_red_zone: undefined,
      floor_obstacle_distances: undefined
    });

    expect(getByTestId('forest-trenches-missing-configuration')?.getAttribute('role')).toBe('alert');
    expect(component.canCalculate()).toBe(false);
    expect(component.form.controls.windZone.value).toBe('Zone 1');
    expect(component.form.controls.repartitionTemperature.value).toBe(10);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    await component.calculate();
    expect(workerPython.runTask).not.toHaveBeenCalled();
  });

  it('shows the missing configuration error when the config row is absent', async () => {
    await createComponent(makeSection(), null);

    expect(getByTestId('forest-trenches-missing-configuration')).not.toBeNull();
    expect(component.canCalculate()).toBe(false);
  });

  it('slices each span, calculates results, and persists the successful form inputs', async () => {
    await createComponent();

    await component.calculate();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(workerPython.runTask.mock.calls.map(([task]) => task)).toEqual([Task.sliceGround, Task.sliceGround]);
    expect(workerPython.runTaskWithTimeout).toHaveBeenCalledTimes(1);
    expect(workerPython.runTaskWithTimeout.mock.calls[0][0]).toBe(Task.getForestTrenches);
    expect(workerPython.runTaskWithTimeout.mock.calls[0][2]).toBe(FOREST_TRENCHES_CALCULATION_TIMEOUT_MS);
    expect(workerPython.runTask.mock.calls[0][1]).toMatchObject({
      spanIndex: 0,
      nPoints: 3,
      referenceSupport: 'LEFT',
      floorPoints: [{ distance: 25, altitude: 11 }]
    });
    expect(workerPython.runTaskWithTimeout.mock.calls[0][1]).toMatchObject({
      electricTension: '400 kV',
      overhangRules: ['RULE_1'],
      lateralRules: ['RULE_1'],
      spans: [
        { spanIndex: 0, distances: [0, 100], altitudes: [10, 12] },
        { spanIndex: 1, distances: [0, 100], altitudes: [10, 12] }
      ]
    });
    expect(workerPython.runTaskWithTimeout.mock.calls[0][1]).not.toHaveProperty('baseCase');
    expect(sectionService.createOrUpdateSection).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        forest_trenches: expect.objectContaining({
          firstSupportUuid: 'support-1',
          lastSupportUuid: 'support-3',
          nPoints: 3,
          selectedRules: ['RULE_1']
        })
      })
    );
    expect(sectionSignal()).toMatchObject({
      forest_trenches: expect.objectContaining({ firstSupportUuid: 'support-1' })
    });
    expect(getByTestId('forest-trenches-results-table')).not.toBeNull();
    expect(getByTestId('forest-trenches-result-span-select')).not.toBeNull();
    expect(getByTestId('forest-trenches-median-f1')?.textContent).toContain('2.50');
    expect(fixture.nativeElement.textContent).toContain('2.50');
    const displayedRowCount = component.tableRows().length;
    component.form.controls.selectedRules.setValue([]);
    expect(component.tableRows()).toHaveLength(displayedRowCount);
    expect(notificationService.success).toHaveBeenCalled();
  });

  it('calculates with the inputs the run started with when the form is edited while the ground is sliced', async () => {
    await createComponent();
    const startingPressure = component.effectiveWindPressure();
    let finishSlice!: () => void;
    workerPython.runTask.mockReturnValueOnce(
      new Promise((resolve) => {
        finishSlice = () =>
          resolve({ result: { distances: [0, 100], altitudes: [10, 12], length: 100 }, error: null, diagnostics: [] });
      })
    );

    const calculation = component.calculate();
    await vi.waitFor(() => expect(workerPython.runTask).toHaveBeenCalledTimes(1));
    component.form.controls.redZonePresence.setValue(true);
    expect(component.effectiveWindPressure()).not.toBe(startingPressure);
    finishSlice();
    await calculation;

    expect(workerPython.runTaskWithTimeout.mock.calls[0][1].form).toMatchObject({
      windPressure: startingPressure,
      redZonePresence: false
    });
    expect(sectionSignal()?.forest_trenches).toMatchObject({ redZonePresence: false });
  });

  it('redraws the plot with the legend only while the graph is enlarged', async () => {
    await createComponent();
    await component.calculate();
    fixture.detectChanges();
    await fixture.whenStable();
    const plotMock = vi.mocked(createForestTrenchesPlot);
    const lastShowLegend = (): boolean | undefined => plotMock.mock.lastCall?.[2].showLegend;
    expect(lastShowLegend()).toBe(false);

    component.toggleGraphSize();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(lastShowLegend()).toBe(true);

    component.toggleGraphSize();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(lastShowLegend()).toBe(false);
  });

  it('hides the median F1 when no overhang rule was calculated', async () => {
    await createComponent();
    workerPython.runTaskWithTimeout.mockResolvedValue({
      result: { spans: [{ ...makeSpanOutput(0), medianF1: null }] },
      error: null
    });

    await component.calculate();
    fixture.detectChanges();

    expect(getByTestId('forest-trenches-results-table')).not.toBeNull();
    expect(getByTestId('forest-trenches-median-f1')).toBeNull();
  });

  it('labels supports and spans with the support number, not the support name', async () => {
    await createComponent();
    const translate = vi.spyOn(TestBed.inject(TranslocoService), 'translate');

    await component.calculate();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.supportOptions().map((option) => option.label)).toEqual(['1', '2', '3']);
    expect(component.resultSpanOptions()).toHaveLength(2);
    expect(translate).toHaveBeenCalledWith('studio.forest-trenches.span-option', {
      firstSupport: '1',
      lastSupport: '2'
    });
    expect(translate).toHaveBeenCalledWith('studio.forest-trenches.span-option', {
      firstSupport: '2',
      lastSupport: '3'
    });
    expect(vi.mocked(createForestTrenchesPlot).mock.lastCall?.[2].xTickLabels).toEqual(['1', '2']);
  });

  it('falls back to the 1-based support index when a support has no number', async () => {
    const unnumberedSection = makeSection();
    unnumberedSection.supports = unnumberedSection.supports.map((support) => ({ ...support, number: null }));
    await createComponent(unnumberedSection);

    expect(component.supportOptions().map((option) => option.label)).toEqual(['1', '2', '3']);
  });

  it('steps through the result spans with the previous and next buttons', async () => {
    await createComponent();
    await component.calculate();
    fixture.detectChanges();
    const previousButton = getByTestId('forest-trenches-prev-span-btn') as HTMLButtonElement;
    const nextButton = getByTestId('forest-trenches-next-span-btn') as HTMLButtonElement;

    expect(component.selectedSpan()?.spanIndex).toBe(0);
    expect(previousButton.disabled).toBe(true);
    expect(nextButton.disabled).toBe(false);

    nextButton.click();
    fixture.detectChanges();
    expect(component.selectedSpan()?.spanIndex).toBe(1);
    expect(previousButton.disabled).toBe(false);
    expect(nextButton.disabled).toBe(true);

    previousButton.click();
    fixture.detectChanges();
    expect(component.selectedSpan()?.spanIndex).toBe(0);
    expect(previousButton.disabled).toBe(true);
  });

  it('does not calculate an interval whose last support precedes the first', async () => {
    await createComponent();
    component.form.controls.firstSupportUuid.setValue('support-3');
    component.form.controls.lastSupportUuid.setValue('support-1');

    expect(component.canCalculate()).toBe(false);
    await component.calculate();
    expect(workerPython.runTask).not.toHaveBeenCalled();
  });

  describe('when the calculation fails', () => {
    // Without translations, `translate` returns the key: the error shown is the key of the message the user gets
    async function expectFailure(expectedMessageKey: string): Promise<void> {
      await component.calculate();
      fixture.detectChanges();

      expect(component.calculationError()).toBe(expectedMessageKey);
      expect(notificationService.error).toHaveBeenCalledTimes(1);
      expect(getByTestId('forest-trenches-calculation-error')).not.toBeNull();
      expect(sectionService.createOrUpdateSection).not.toHaveBeenCalled();
    }

    it('shows the translated task error and logs its technical identifier', async () => {
      await createComponent();
      workerPython.runTask.mockResolvedValueOnce({ result: null, error: TaskError.CALCULATION_ERROR, diagnostics: [] });

      await expectFailure('shared.studio.calculation-error');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to calculate forest trenches',
        expect.objectContaining({ message: expect.stringContaining(TaskError.CALCULATION_ERROR) })
      );
    });

    it('prefers the message of the Python error raised by the task', async () => {
      await createComponent();
      workerPython.runTask.mockResolvedValueOnce({
        result: null,
        error: TaskError.CALCULATION_ERROR,
        diagnostics: [
          {
            code: PythonErrorCode.SupportOutOfRangeError,
            severity: 'error',
            origin: 'exception',
            rawText: 'SupportOutOfRangeError: spanIndex 5 is out of range'
          }
        ]
      });

      await expectFailure('shared.python-errors.support-out-of-range-error');
    });

    it('shows the message of the Python error raised by the forest trenches task', async () => {
      await createComponent();
      workerPython.runTaskWithTimeout.mockResolvedValue({
        result: null,
        error: TaskError.CALCULATION_ERROR,
        diagnostics: [
          {
            code: PythonErrorCode.ConformityInputError,
            severity: 'error',
            origin: 'exception',
            rawText: 'ConformityInputError: spans must be a non-empty list'
          }
        ]
      });

      await expectFailure('shared.python-errors.conformity-input-error');
    });

    it('asks to update the catalogs when a selected rule has no floor-obstacle distance', async () => {
      await createComponent(makeSection(), { floor_obstacle_distances: [] });
      component.form.controls.selectedRules.setValue(['RULE_1']);

      await expectFailure('studio.forest-trenches.missing-configuration');

      expect(workerPython.runTask).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to calculate forest trenches',
        expect.objectContaining({ message: expect.stringContaining('RULE_1') })
      );
    });

    it('shows a calculation error when the task returns no span results', async () => {
      await createComponent();
      workerPython.runTaskWithTimeout.mockResolvedValue({ result: { spans: [] }, error: null, diagnostics: [] });

      await expectFailure('shared.studio.calculation-error');
    });

    it('shows the time limit when the calculation times out', async () => {
      await createComponent();
      const translate = vi.spyOn(TestBed.inject(TranslocoService), 'translate');
      workerPython.runTaskWithTimeout.mockRejectedValue(
        new TaskTimeoutError(Task.getForestTrenches, FOREST_TRENCHES_CALCULATION_TIMEOUT_MS)
      );

      await expectFailure('studio.forest-trenches.calculation-timeout');

      expect(translate).toHaveBeenCalledWith('studio.forest-trenches.calculation-timeout', {
        seconds: FOREST_TRENCHES_CALCULATION_TIMEOUT_MS / 1000
      });
    });

    it('only shows an unknown error for an unexpected failure, and logs its details', async () => {
      await createComponent();
      const failure = new Error('Python worker is not initialized. Call setup() before running tasks.');
      workerPython.runTask.mockRejectedValueOnce(failure);

      await expectFailure('shared.studio.unknown-error');

      expect(logger.error).toHaveBeenCalledWith('Failed to calculate forest trenches', failure);
    });
  });

  it('ignores saved support uuids that are not in the current section', async () => {
    const savedSection = makeSection();
    savedSection.forest_trenches = {
      firstSupportUuid: 'unknown-first',
      lastSupportUuid: 'unknown-last',
      nPoints: 3,
      windZone: 'Zone 1',
      windMinus: true,
      redZonePresence: true,
      repartitionTemperature: 20,
      lateralDistanceTemperature: 15,
      selectedRules: ['RULE_1']
    };
    await createComponent(savedSection);

    expect(component.form.controls.firstSupportUuid.value).toBe('support-1');
    expect(component.form.controls.lastSupportUuid.value).toBe('support-3');
    expect(component.form.controls.windMinus.value).toBe(true);
  });

  describe('when the section or the dialog changes during the calculation', () => {
    // Holds the calculation task until the returned function is called, to act while a run is in flight
    function holdCalculation(): () => void {
      let release!: () => void;
      workerPython.runTaskWithTimeout.mockReturnValue(
        new Promise((resolve) => {
          release = () => resolve({ result: { spans: [makeSpanOutput(0)] }, error: null });
        })
      );
      return release;
    }

    it('does not save nor publish a calculation that ends after the dialog is closed', async () => {
      await createComponent();
      const release = holdCalculation();

      const calculation = component.calculate();
      await vi.waitFor(() => expect(workerPython.runTaskWithTimeout).toHaveBeenCalled());
      fixture.destroy();
      release();
      await calculation;

      expect(sectionService.createOrUpdateSection).not.toHaveBeenCalled();
      expect(sectionSignal()).toBe(section);
      expect(notificationService.success).not.toHaveBeenCalled();
    });

    it('stops slicing the remaining spans once the dialog is closed', async () => {
      await createComponent();
      let finishSlice!: () => void;
      workerPython.runTask.mockReturnValueOnce(
        new Promise((resolve) => {
          finishSlice = () =>
            resolve({ result: { distances: [0, 100], altitudes: [10, 12], length: 100 }, error: null });
        })
      );

      const calculation = component.calculate();
      await vi.waitFor(() => expect(workerPython.runTask).toHaveBeenCalledTimes(1));
      fixture.destroy();
      finishSlice();
      await calculation;

      expect(workerPython.runTask).toHaveBeenCalledTimes(1);
      expect(workerPython.runTaskWithTimeout).not.toHaveBeenCalled();
      expect(sectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });

    it('merges the inputs into the section as it was edited during the calculation', async () => {
      await createComponent();
      const release = holdCalculation();

      const calculation = component.calculate();
      await vi.waitFor(() => expect(workerPython.runTaskWithTimeout).toHaveBeenCalled());
      sectionSignal.set({ ...section, name: 'Edited while calculating' });
      release();
      await calculation;

      const savedSection = sectionService.createOrUpdateSection.mock.calls[0][1];
      expect(savedSection).toMatchObject({
        name: 'Edited while calculating',
        forest_trenches: expect.objectContaining({ firstSupportUuid: 'support-1', lastSupportUuid: 'support-3' })
      });
      expect(sectionSignal()).toBe(savedSection);
    });

    it('does not save nor publish over another section opened during the calculation', async () => {
      await createComponent();
      const release = holdCalculation();

      const calculation = component.calculate();
      await vi.waitFor(() => expect(workerPython.runTaskWithTimeout).toHaveBeenCalled());
      const otherSection = { ...makeSection(), uuid: 'section-2' };
      sectionSignal.set(otherSection);
      release();
      await calculation;

      expect(sectionService.createOrUpdateSection).not.toHaveBeenCalled();
      expect(sectionSignal()).toBe(otherSection);
      expect(notificationService.success).not.toHaveBeenCalled();
    });
  });

  function getByTestId(id: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }
});

function makeDb(configOverride: Record<string, unknown> | null = {}) {
  return {
    catObstacleWindZones: {
      toArray: () => Promise.resolve([{ label: 'Zone 1', normal: 100, red_zone: 250 }])
    },
    catObstacleConformityConfig: {
      get: () =>
        Promise.resolve(
          configOverride === null
            ? undefined
            : {
                key: 'main',
                repartition_temperature_default: 10,
                lateral_temperature_default: 15,
                lateral_temperature_rule_type: 'RULE_1',
                lateral_temperature_message: 'Use rule temperature',
                wind_zone_default: 'Zone 1',
                intermediate_point_positions: [],
                forest_trenches_n_points_choices: [3, 5],
                forest_trenches_overhang_rules: ['RULE_1'],
                forest_trenches_lateral_rules: ['RULE_1'],
                forest_trenches_chart: {
                  cable: { marker: 'circle', line: 'solid' },
                  limit: { marker: 'square-open', line: 'dash' },
                  overhang_color: null
                },
                floor_obstacle_red_zone: false,
                floor_obstacle_distances: [
                  { rule_type: 'RULE_1', active: true, overhang: { distance: 2 }, lateral: { distance: 3 } }
                ],
                ...configOverride
              }
        )
    },
    catObstacleRuleDefinitions: {
      toArray: () => Promise.resolve([makeRule()])
    }
  };
}

function makeRule() {
  return {
    rule_type: 'RULE_1',
    rule_name: 'Rule one',
    color: '#ff0000',
    lateral_point: { temperature: 15, pressure: 100, red_zone: false },
    overhang_point: { temperature: null, pressure: 100, red_zone: false }
  };
}

function makeSection(): Section {
  return {
    uuid: 'section-1',
    voltage_idr: '400 kV',
    supports: [
      { uuid: 'support-1', name: 'Support 1', number: '1' },
      { uuid: 'support-2', name: 'Support 2', number: '2' },
      { uuid: 'support-3', name: 'Support 3', number: '3' }
    ],
    floors: [
      {
        uuid: 'floor-1',
        supportUuid: 'support-1',
        referenceSupport: 'LEFT',
        points: [{ distanceToRefSupport: 25, altitude: 11 }]
      }
    ]
  } as Section;
}

function makeSpanOutput(spanIndex: number) {
  return {
    spanIndex,
    length: 100,
    medianF1: 2.5,
    axis: [
      { x: 0, y: 0 },
      { x: 100, y: 0 }
    ],
    plot: {
      lateral: { RULE_1: { cable: [{ x: 0, y: 5 }], limit: [{ x: 0, y: 6 }] } },
      lateralInverse: { RULE_1: { cable: [{ x: 100, y: -5 }], limit: [{ x: 100, y: -6 }] } },
      overhang: { RULE_1: { cable: [{ x: 0, y: 0 }] } }
    },
    points: [makeForestPoint(0), makeForestPoint(100)]
  };
}

function makeForestPoint(distance: number) {
  return {
    distanceToLeftSupport: distance,
    groundElevation: 10,
    lateral: { RULE_1: { axisDistance: 5, elevation: 31, limitAxisDistance: 6 } },
    lateralInverse: { RULE_1: { axisDistance: -5, elevation: 31, limitAxisDistance: -6 } },
    overhang: { RULE_1: { elevation: 32, heightAboveGround: 22, complianceLimitHeightAboveGround: 20 } }
  };
}
