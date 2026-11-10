/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { type Mock, vi } from 'vitest';
import Plotly, { type Data, type Layout } from 'plotly.js-dist-min';
import type { CatalogObstacleRuleDefinitionEntity } from '@infrastructure/database/entities/catalog-obstacle-rule-definition.entity';
import type { CatalogObstacleConformityConfigEntity } from '@infrastructure/database/entities/catalog-obstacle-conformity-config.entity';
import type { Floor } from '@shared/domain/models/floor.model';
import type { Support } from '@shared/domain/models/support.model';
import type { ForestTrenchesSpanOutput } from '@services/worker_python/tasks/types';
import { FOREST_TRENCHES_PLOT_ID } from './forest-trenches.constantes';
import {
  buildForestTrenchesRows,
  createForestTrenchesPlot,
  fractionLabel,
  getForestTrenchesConfig,
  forestTrenchesXTickLabels,
  purgeForestTrenchesPlot,
  resizeForestTrenchesPlot,
  spansInInterval,
  toSliceGroundInput
} from './forest-trenches.helpers';

vi.mock('plotly.js-dist-min', () => ({
  __esModule: true,
  default: {
    react: vi.fn(),
    purge: vi.fn(),
    Plots: { resize: vi.fn() }
  }
}));

describe('forest trenches helpers', () => {
  describe('getForestTrenchesConfig', () => {
    const validConfig = {
      forest_trenches_n_points_choices: [3, 5],
      forest_trenches_overhang_rules: ['AT'],
      forest_trenches_lateral_rules: ['AT'],
      forest_trenches_base_case: { name: 'Base', temperature: 15, wind: 0 },
      floor_obstacle_red_zone: false,
      floor_obstacle_distances: [{ rule_type: 'AT', active: true, overhang: null, lateral: null }]
    } as unknown as CatalogObstacleConformityConfigEntity;

    it('maps a complete config', () => {
      expect(getForestTrenchesConfig(validConfig)).toEqual({
        nPointsChoices: [3, 5],
        overhangRules: ['AT'],
        lateralRules: ['AT'],
        baseCase: { name: 'Base', temperature: 15, wind: 0 },
        redZone: false,
        floorDistances: validConfig.floor_obstacle_distances
      });
    });

    it('returns null for a missing or stale config', () => {
      expect(getForestTrenchesConfig(null)).toBeNull();
      expect(getForestTrenchesConfig({ wind_zone_default: 'A' } as CatalogObstacleConformityConfigEntity)).toBeNull();
    });

    it.each([
      ['empty choices', { forest_trenches_n_points_choices: [] }],
      ['non numeric choices', { forest_trenches_n_points_choices: ['3'] }],
      ['bad overhang rules', { forest_trenches_overhang_rules: [1] }],
      ['missing lateral rules', { forest_trenches_lateral_rules: undefined }],
      ['base case without name', { forest_trenches_base_case: { temperature: 1, wind: 0 } }],
      ['base case without temperature', { forest_trenches_base_case: { name: 'B', wind: 0 } }],
      ['base case without wind', { forest_trenches_base_case: { name: 'B', temperature: 1 } }],
      ['missing red zone', { floor_obstacle_red_zone: undefined }],
      ['missing distances', { floor_obstacle_distances: undefined }]
    ])('returns null for %s', (_label, override) => {
      expect(
        getForestTrenchesConfig({ ...validConfig, ...override } as unknown as CatalogObstacleConformityConfigEntity)
      ).toBeNull();
    });
  });

  describe('spansInInterval', () => {
    const supports = [{ uuid: 's0' }, { uuid: 's1' }, { uuid: 's2' }, { uuid: 's3' }] as Support[];

    it('returns each span index between the selected supports', () => {
      expect(spansInInterval(supports, 's1', 's3')).toEqual([1, 2]);
    });

    it('rejects unknown and non-increasing support intervals', () => {
      expect(() => spansInInterval(supports, 'missing', 's3')).toThrow(RangeError);
      expect(() => spansInInterval(supports, 's3', 's1')).toThrow(RangeError);
      expect(() => spansInInterval(supports, 's1', 's1')).toThrow(RangeError);
    });
  });

  describe('toSliceGroundInput', () => {
    const floor: Floor = {
      uuid: 'floor-1',
      supportUuid: 's1',
      referenceSupport: 'RIGHT',
      points: [
        { distanceToRefSupport: 10, altitude: 20 },
        { distanceToRefSupport: null, altitude: null }
      ]
    };

    it('maps a floor profile to the worker input', () => {
      expect(toSliceGroundInput(floor, 1, 5)).toEqual({
        spanIndex: 1,
        nPoints: 5,
        referenceSupport: 'RIGHT',
        floorPoints: [
          { distance: 10, altitude: 20 },
          { distance: null, altitude: null }
        ]
      });
    });

    it('uses the left reference and an empty profile when no floor exists', () => {
      expect(toSliceGroundInput(undefined, 2, 9)).toEqual({
        spanIndex: 2,
        nPoints: 9,
        referenceSupport: 'LEFT',
        floorPoints: []
      });
    });
  });

  describe('fractionLabel', () => {
    it('returns reduced fractions for interior slicing points', () => {
      expect(fractionLabel(1, 5)).toBe('1/4');
      expect(fractionLabel(2, 7)).toBe('1/3');
      expect(fractionLabel(3, 5)).toBe('3/4');
    });

    describe('forestTrenchesXTickLabels', () => {
      it('uses support names at the ends and reduced fractions between them', () => {
        expect(forestTrenchesXTickLabels('Start', 'End', 5)).toEqual(['Start', '1/4', '1/2', '3/4', 'End']);
      });

      it('rejects missing support names and invalid point counts', () => {
        expect(() => forestTrenchesXTickLabels('', 'End', 5)).toThrow();
        expect(() => forestTrenchesXTickLabels('Start', 'End', 1)).toThrow(RangeError);
      });
    });

    it('labels the support endpoints and rejects invalid point indices', () => {
      expect(fractionLabel(0, 5)).toBe('0');
      expect(fractionLabel(4, 5)).toBe('1');
      expect(() => fractionLabel(1, 1)).toThrow(RangeError);
      expect(() => fractionLabel(5, 5)).toThrow(RangeError);
    });
  });

  describe('buildForestTrenchesRows', () => {
    const rules: CatalogObstacleRuleDefinitionEntity[] = [
      ruleDefinition('RULE_1', 'Rule one'),
      ruleDefinition('RULE_2', 'Rule two'),
      ruleDefinition('RULE_3', 'Rule three')
    ];
    const span = makeSpan();
    const translate = (key: string, params?: Record<string, string | number>) =>
      `${key}:${params ? Object.values(params).join(',') : ''}`;

    it('returns rows in the prescribed order, filters rules, and uses absolute distance values', () => {
      const rows = buildForestTrenchesRows(
        span,
        {
          selectedRules: ['RULE_2', 'RULE_1'],
          lateralRules: ['RULE_1', 'RULE_2', 'RULE_3'],
          overhangRules: ['RULE_3', 'RULE_2'],
          ruleDefinitions: rules,
          repartitionTemperature: 10,
          lateralDistanceTemperature: 15,
          baseCase: { name: 'Base case', temperature: 15, wind: 0 }
        },
        translate
      );

      expect(rows.map((row) => row.id)).toEqual([
        'distance-to-left-support',
        'ground-elevation',
        'axis-cable-repartition',
        'axis-cable-base-case',
        'axis-cable-lateral-RULE_1',
        'axis-cable-lateral-RULE_2',
        'axis-lateral-limit-RULE_1',
        'axis-lateral-limit-RULE_2',
        'cable-height-repartition',
        'cable-height-base-case',
        'overhang-compliance-limit-height-RULE_2',
        'cable-elevation-lateral-RULE_1',
        'cable-elevation-lateral-RULE_2',
        'cable-elevation-repartition',
        'cable-elevation-base-case'
      ]);
      expect(rows[0].values).toEqual([2, 8]);
      expect(rows[1].values).toEqual([-10, 12]);
      expect(rows[2].values).toEqual([3, 4]);
      expect(rows[4].label).toContain('Rule one,15');
      expect(rows[10].label).toContain('Rule two');
      expect(rows.every((row) => row.unitKey === 'common.meter')).toBe(true);
    });

    it('rejects a selected rule whose result is missing from the span', () => {
      const malformedSpan = makeSpan();
      delete malformedSpan.points[0].lateral.RULE_1;

      expect(() =>
        buildForestTrenchesRows(
          malformedSpan,
          {
            selectedRules: ['RULE_1'],
            lateralRules: ['RULE_1'],
            overhangRules: [],
            ruleDefinitions: rules,
            repartitionTemperature: 10,
            lateralDistanceTemperature: 15,
            baseCase: { name: 'Base case', temperature: 15, wind: 0 }
          },
          translate
        )
      ).toThrow('Missing lateral result for rule "RULE_1".');
    });
  });

  describe('createForestTrenchesPlot', () => {
    const span = makeSpan();
    const options = {
      lateralRuleTypes: ['RULE_1'],
      ruleColors: { RULE_1: '#ff0000' },
      ruleLabels: { RULE_1: 'Rule one' },
      xAxisTitle: 'Distance',
      xTickLabels: ['Start', 'End'],
      yAxisTitle: 'Lateral distance',
      axisLabel: 'Line axis',
      repartitionLabel: 'Repartition',
      baseCaseLabel: 'Base case',
      lateralCableLabel: (ruleName: string) => `${ruleName} cable`,
      lateralInverseCableLabel: (ruleName: string) => `${ruleName} inverse cable`,
      lateralLimitLabel: (ruleName: string) => `${ruleName} limit`,
      lateralInverseLimitLabel: (ruleName: string) => `${ruleName} inverse limit`
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('draws the axis, climate cases, and lateral points with their required markers', () => {
      createForestTrenchesPlot(mockDocument(), span, options);

      const traces = (Plotly.react as Mock).mock.calls[0][1] as Data[];
      expect(traces).toHaveLength(7);
      expect(traces[0].line).toMatchObject({ color: '#000000', dash: 'dash' });
      expect(traces[1].line).toMatchObject({ color: '#2563eb' });
      expect(traces[2].line).toMatchObject({ color: '#1e3a8a' });
      expect(traces[3].marker).toMatchObject({ symbol: 'circle-open', color: '#ff0000' });
      expect(traces[4].marker).toMatchObject({ symbol: 'diamond', color: '#ff0000' });
      expect(traces[5].marker).toMatchObject({ symbol: 'circle-open', color: '#ff0000' });
      expect(traces[6].marker).toMatchObject({ symbol: 'diamond', color: '#ff0000' });
      expect((Plotly.react as Mock).mock.calls[0][2].xaxis).toMatchObject({
        tickvals: [2, 8],
        ticktext: ['Start', 'End']
      });
    });

    it('draws the positive-wind side below the axis (reversed y axis)', () => {
      createForestTrenchesPlot(mockDocument(), span, options);

      expect((Plotly.react as Mock).mock.calls[0][2].yaxis).toMatchObject({ autorange: 'reversed' });
    });

    it('uses a fresh layout for every plot call and guards DOM-dependent operations', () => {
      const documentRef = mockDocument();
      createForestTrenchesPlot(documentRef, span, options);
      createForestTrenchesPlot(documentRef, span, options);

      const layouts = (Plotly.react as Mock).mock.calls.map((call) => call[2] as Layout);
      expect(layouts[0]).not.toBe(layouts[1]);
      expect(layouts[0].font).not.toBe(layouts[1].font);

      const missingPlot = { getElementById: vi.fn(() => null) } as unknown as Document;
      createForestTrenchesPlot(missingPlot, span, options);
      resizeForestTrenchesPlot(missingPlot);
      purgeForestTrenchesPlot(missingPlot);
      expect(Plotly.react).toHaveBeenCalledTimes(2);
      expect(Plotly.Plots.resize).not.toHaveBeenCalled();
      expect(Plotly.purge).not.toHaveBeenCalled();
    });

    it('resizes and purges the plot when it exists', () => {
      const documentRef = mockDocument();
      resizeForestTrenchesPlot(documentRef);
      purgeForestTrenchesPlot(documentRef);

      expect(Plotly.Plots.resize).toHaveBeenCalledWith(FOREST_TRENCHES_PLOT_ID);
      expect(Plotly.purge).toHaveBeenCalledWith(FOREST_TRENCHES_PLOT_ID);
    });
  });
});

function ruleDefinition(ruleType: string, ruleName: string): CatalogObstacleRuleDefinitionEntity {
  return {
    rule_type: ruleType,
    rule_name: ruleName,
    color: '#ff0000',
    lateral_point: { temperature: 15, pressure: 0, red_zone: false },
    overhang_point: { temperature: null, pressure: 0, red_zone: false }
  };
}

function makeSpan(): ForestTrenchesSpanOutput {
  const makePoint = (distance: number): ForestTrenchesSpanOutput['points'][number] => ({
    distanceToLeftSupport: distance === 2 ? 2 : 8,
    groundElevation: distance === 2 ? -10 : 12,
    baseCase: { axisDistance: -4, elevation: 30, heightAboveGround: 20 },
    repartition: { axisDistance: distance === 2 ? -3 : 4, elevation: 29, heightAboveGround: 19 },
    lateral: {
      RULE_1: { axisDistance: -5, elevation: 31, limitAxisDistance: -6 },
      RULE_2: { axisDistance: 7, elevation: 32, limitAxisDistance: 8 }
    },
    lateralInverse: {
      RULE_1: { axisDistance: 5, elevation: 31, limitAxisDistance: 6 },
      RULE_2: { axisDistance: -7, elevation: 32, limitAxisDistance: -8 }
    },
    overhang: {
      RULE_2: { elevation: 32, complianceLimitHeightAboveGround: -2 },
      RULE_3: { elevation: 33, complianceLimitHeightAboveGround: 3 }
    }
  });

  return {
    spanIndex: 1,
    length: 10,
    medianF1: 2.5,
    axis: [
      { x: 0, y: 0 },
      { x: 10, y: 0 }
    ],
    plot: {
      baseCase: [
        { x: 0, y: -4 },
        { x: 10, y: -4 }
      ],
      repartition: [
        { x: 0, y: -3 },
        { x: 10, y: -3 }
      ],
      lateral: {
        RULE_1: {
          cable: [{ x: 0, y: -5 }],
          limit: [{ x: 0, y: -6 }]
        }
      },
      lateralInverse: {
        RULE_1: {
          cable: [{ x: 10, y: 5 }],
          limit: [{ x: 10, y: 6 }]
        }
      }
    },
    points: [makePoint(2), makePoint(8)]
  };
}

function mockDocument(): Document {
  const element = document.createElement('div');
  element.id = FOREST_TRENCHES_PLOT_ID;
  return {
    getElementById: vi.fn((id: string) => (id === FOREST_TRENCHES_PLOT_ID ? element : null))
  } as unknown as Document;
}
