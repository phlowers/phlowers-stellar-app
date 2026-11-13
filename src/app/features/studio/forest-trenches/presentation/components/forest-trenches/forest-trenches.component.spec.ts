/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Section } from '@shared/domain';
import { StorageService } from '@services/storage/storage.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { SectionService } from '@services/section/section.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task } from '@services/worker_python/tasks/types';
import { NotificationService } from '@services/notification/notification.service';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { ForestTrenchesComponent } from './forest-trenches.component';
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
  let workerPython: { runTask: ReturnType<typeof vi.fn> };
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
      runTask: vi.fn().mockImplementation((task: Task) => {
        if (task === Task.sliceGround) {
          return Promise.resolve({
            result: { distances: [0, 100], altitudes: [10, 12], length: 100 },
            error: null
          });
        }
        return Promise.resolve({ result: { spans: [makeSpanOutput(0), makeSpanOutput(1)] }, error: null });
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

    expect(workerPython.runTask.mock.calls.map(([task]) => task)).toEqual([
      Task.sliceGround,
      Task.sliceGround,
      Task.getForestTrenches
    ]);
    expect(workerPython.runTask.mock.calls[0][1]).toMatchObject({
      spanIndex: 0,
      nPoints: 3,
      referenceSupport: 'LEFT',
      floorPoints: [{ distance: 25, altitude: 11 }]
    });
    expect(workerPython.runTask.mock.calls[2][1]).toMatchObject({
      electricTension: '400 kV',
      overhangRules: ['RULE_1'],
      lateralRules: ['RULE_1'],
      spans: [
        { spanIndex: 0, distances: [0, 100], altitudes: [10, 12] },
        { spanIndex: 1, distances: [0, 100], altitudes: [10, 12] }
      ]
    });
    expect(workerPython.runTask.mock.calls[2][1]).not.toHaveProperty('baseCase');
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
    workerPython.runTask.mockImplementation((task: Task) =>
      Promise.resolve(
        task === Task.sliceGround
          ? { result: { distances: [0, 100], altitudes: [10, 12], length: 100 }, error: null }
          : { result: { spans: [{ ...makeSpanOutput(0), medianF1: null }] }, error: null }
      )
    );

    await component.calculate();
    fixture.detectChanges();

    expect(getByTestId('forest-trenches-results-table')).not.toBeNull();
    expect(getByTestId('forest-trenches-median-f1')).toBeNull();
  });

  it('does not calculate an interval whose last support precedes the first', async () => {
    await createComponent();
    component.form.controls.firstSupportUuid.setValue('support-3');
    component.form.controls.lastSupportUuid.setValue('support-1');

    expect(component.canCalculate()).toBe(false);
    await component.calculate();
    expect(workerPython.runTask).not.toHaveBeenCalled();
  });

  it('logs and displays worker errors without saving the inputs', async () => {
    await createComponent();
    workerPython.runTask.mockResolvedValueOnce({ result: null, error: 'Ground slicing failed' });

    await component.calculate();
    fixture.detectChanges();

    expect(logger.error).toHaveBeenCalledWith('Failed to calculate forest trenches', expect.any(Error));
    expect(notificationService.error).toHaveBeenCalled();
    expect(getByTestId('forest-trenches-calculation-error')).not.toBeNull();
    expect(sectionService.createOrUpdateSection).not.toHaveBeenCalled();
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
