/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import Plotly, { type Config, type Data, type Layout } from 'plotly.js-dist-min';
import type { Floor } from '@shared/domain/models/floor.model';
import type { Support } from '@shared/domain/models/support.model';
import { getPlotlyBaseLayout } from '@shared/constants/plotly-base-layout.constantes';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import type { ForestTrenchesSpanOutput, SliceGroundInput } from '@services/worker_python/tasks/types';
import { FOREST_TRENCHES_PLOT_COLORS, FOREST_TRENCHES_PLOT_ID } from './forest-trenches.constantes';
import type { CatalogObstacleConformityConfigEntity } from '@infrastructure/database/entities/catalog-obstacle-conformity-config.entity';
import type {
  ForestTrenchesConfig,
  ForestTrenchesPlotOptions,
  ForestTrenchesRowsConfig,
  ForestTrenchesTableRow,
  ForestTrenchesTranslate
} from './forest-trenches.interfaces';

const HOVER_TEMPLATE = '%{x:.2f} m, %{y:.2f} m<extra></extra>';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/**
 * Extracts the forest-trenches settings from the stored conformity config. Returns null when any
 * field is missing or malformed (e.g. a row imported before these fields existed).
 */
export function getForestTrenchesConfig(
  config: CatalogObstacleConformityConfigEntity | null | undefined
): ForestTrenchesConfig | null {
  if (!config) return null;
  const {
    forest_trenches_n_points_choices: nPointsChoices,
    forest_trenches_overhang_rules: overhangRules,
    forest_trenches_lateral_rules: lateralRules,
    forest_trenches_base_case: baseCase,
    floor_obstacle_red_zone: redZone,
    floor_obstacle_distances: floorDistances
  } = config as Partial<CatalogObstacleConformityConfigEntity>;

  if (
    !Array.isArray(nPointsChoices) ||
    nPointsChoices.length === 0 ||
    !nPointsChoices.every((count) => typeof count === 'number' && Number.isFinite(count)) ||
    !isStringArray(overhangRules) ||
    !isStringArray(lateralRules) ||
    typeof baseCase?.name !== 'string' ||
    typeof baseCase.temperature !== 'number' ||
    typeof baseCase.wind !== 'number' ||
    typeof redZone !== 'boolean' ||
    !Array.isArray(floorDistances)
  ) {
    return null;
  }

  return { nPointsChoices, overhangRules, lateralRules, baseCase, redZone, floorDistances };
}

export function spansInInterval(
  supports: readonly Support[],
  firstSupportUuid: string,
  lastSupportUuid: string
): number[] {
  const firstIndex = supports.findIndex((support) => support.uuid === firstSupportUuid);
  const lastIndex = supports.findIndex((support) => support.uuid === lastSupportUuid);

  if (firstIndex < 0 || lastIndex < 0) {
    throw new RangeError('Both interval supports must exist in the section.');
  }
  if (lastIndex <= firstIndex) {
    throw new RangeError('The last support must follow the first support.');
  }

  return Array.from({ length: lastIndex - firstIndex }, (_, index) => firstIndex + index);
}

export function toSliceGroundInput(
  floor: Floor | null | undefined,
  spanIndex: number,
  nPoints: number
): SliceGroundInput {
  return {
    spanIndex,
    nPoints,
    referenceSupport: floor?.referenceSupport ?? 'LEFT',
    floorPoints:
      floor?.points.map((point) => ({
        distance: point.distanceToRefSupport,
        altitude: point.altitude
      })) ?? []
  };
}

export function fractionLabel(k: number, n: number): string {
  if (!Number.isInteger(n) || n < 2 || !Number.isInteger(k) || k < 0 || k >= n) {
    throw new RangeError('Fraction point index must be an integer within a point set of size 2 or greater.');
  }

  const denominator = n - 1;
  if (k === 0) return '0';
  if (k === denominator) return '1';

  const divisor = greatestCommonDivisor(k, denominator);
  return `${k / divisor}/${denominator / divisor}`;
}

export function forestTrenchesXTickLabels(
  firstSupportName: string,
  lastSupportName: string,
  nPoints: number
): string[] {
  if (!firstSupportName || !lastSupportName) {
    throw new Error('Both support names are required for the plot axis.');
  }
  if (!Number.isInteger(nPoints) || nPoints < 2) {
    throw new RangeError('At least two slicing points are required for the plot axis.');
  }

  return Array.from({ length: nPoints }, (_, index) => {
    if (index === 0) return firstSupportName;
    if (index === nPoints - 1) return lastSupportName;
    return fractionLabel(index, nPoints);
  });
}

function greatestCommonDivisor(a: number, b: number): number {
  let left = a;
  let right = b;
  while (right !== 0) {
    [left, right] = [right, left % right];
  }
  return left;
}

export function buildForestTrenchesRows(
  span: ForestTrenchesSpanOutput,
  rules: ForestTrenchesRowsConfig,
  t: ForestTrenchesTranslate
): ForestTrenchesTableRow[] {
  const ruleNames = new Map(rules.ruleDefinitions.map((rule) => [rule.rule_type, rule.rule_name]));
  const selectedRules = new Set(rules.selectedRules);
  const lateralRules = rules.lateralRules.filter((ruleType) => selectedRules.has(ruleType));
  const overhangRules = rules.overhangRules.filter((ruleType) => selectedRules.has(ruleType));
  const rows: ForestTrenchesTableRow[] = [];

  const addRow = (id: string, key: string, values: number[], params?: Record<string, string | number>): void => {
    rows.push({ id, label: t(key, params), unitKey: 'common.meter', values });
  };
  const pointValues = (value: (point: ForestTrenchesSpanOutput['points'][number]) => number): number[] =>
    span.points.map(value);
  const absolute = (values: number[]): number[] => values.map(Math.abs);
  const ruleName = (ruleType: string): string => ruleNames.get(ruleType) ?? ruleType;

  addRow(
    'distance-to-left-support',
    'studio.forest-trenches.row-distance-to-left-support',
    absolute(pointValues((point) => point.distanceToLeftSupport))
  );
  addRow(
    'ground-elevation',
    'studio.forest-trenches.row-ground-elevation',
    pointValues((point) => point.groundElevation)
  );
  addRow(
    'axis-cable-repartition',
    'studio.forest-trenches.row-axis-cable-repartition',
    absolute(pointValues((point) => point.repartition.axisDistance)),
    { temperature: rules.repartitionTemperature }
  );
  addRow(
    'axis-cable-base-case',
    'studio.forest-trenches.row-axis-cable-base-case',
    absolute(pointValues((point) => point.baseCase.axisDistance)),
    { temperature: rules.baseCase.temperature, caseName: rules.baseCase.name }
  );

  for (const ruleType of lateralRules) {
    const name = ruleName(ruleType);
    addRow(
      `axis-cable-lateral-${ruleType}`,
      'studio.forest-trenches.row-axis-cable-lateral',
      absolute(span.points.map((point) => requireRuleValue(point.lateral[ruleType], ruleType, 'lateral').axisDistance)),
      { ruleName: name, temperature: rules.lateralDistanceTemperature }
    );
  }
  for (const ruleType of lateralRules) {
    const name = ruleName(ruleType);
    addRow(
      `axis-lateral-limit-${ruleType}`,
      'studio.forest-trenches.row-axis-lateral-limit',
      absolute(
        span.points.map((point) => requireRuleValue(point.lateral[ruleType], ruleType, 'lateral').limitAxisDistance)
      ),
      { ruleName: name }
    );
  }

  addRow(
    'cable-height-repartition',
    'studio.forest-trenches.row-cable-height-repartition',
    pointValues((point) => point.repartition.heightAboveGround),
    { temperature: rules.repartitionTemperature }
  );
  addRow(
    'cable-height-base-case',
    'studio.forest-trenches.row-cable-height-base-case',
    pointValues((point) => point.baseCase.heightAboveGround),
    { temperature: rules.baseCase.temperature, caseName: rules.baseCase.name }
  );

  for (const ruleType of overhangRules) {
    const name = ruleName(ruleType);
    addRow(
      `overhang-compliance-limit-height-${ruleType}`,
      'studio.forest-trenches.row-overhang-compliance-limit-height',
      span.points.map(
        (point) => requireRuleValue(point.overhang[ruleType], ruleType, 'overhang').complianceLimitHeightAboveGround
      ),
      { ruleName: name }
    );
  }
  for (const ruleType of lateralRules) {
    const name = ruleName(ruleType);
    addRow(
      `cable-elevation-lateral-${ruleType}`,
      'studio.forest-trenches.row-cable-elevation-lateral',
      span.points.map((point) => requireRuleValue(point.lateral[ruleType], ruleType, 'lateral').elevation),
      { ruleName: name, temperature: rules.lateralDistanceTemperature }
    );
  }
  addRow(
    'cable-elevation-repartition',
    'studio.forest-trenches.row-cable-elevation-repartition',
    pointValues((point) => point.repartition.elevation),
    { temperature: rules.repartitionTemperature }
  );
  addRow(
    'cable-elevation-base-case',
    'studio.forest-trenches.row-cable-elevation-base-case',
    pointValues((point) => point.baseCase.elevation),
    { temperature: rules.baseCase.temperature, caseName: rules.baseCase.name }
  );

  return rows;
}

function requireRuleValue<T>(value: T | undefined, ruleType: string, category: string): T {
  if (value === undefined) {
    throw new Error(`Missing ${category} result for rule "${ruleType}".`);
  }
  return value;
}

function pointTrace(
  points: ForestTrenchesSpanOutput['axis'],
  name: string,
  color: string,
  symbol: string,
  showLegend: boolean
): Data {
  return {
    x: points.map((point) => point.x),
    y: points.map((point) => point.y),
    type: 'scatter',
    mode: 'markers',
    marker: {
      color,
      size: PlotlyDrawings.conformity.cablePoint.markerSize,
      symbol,
      line: { color, width: 1.5 }
    },
    hovertemplate: HOVER_TEMPLATE,
    name,
    showlegend: showLegend
  };
}

function lineTrace(points: ForestTrenchesSpanOutput['axis'], name: string, color: string, showLegend: boolean): Data {
  return {
    x: points.map((point) => point.x),
    y: points.map((point) => point.y),
    type: 'scatter',
    mode: 'lines+markers',
    line: { color, width: 2 },
    marker: {
      color,
      size: PlotlyDrawings.conformity.cablePoint.markerSize,
      symbol: 'circle'
    },
    hovertemplate: HOVER_TEMPLATE,
    name,
    showlegend: showLegend
  };
}

export function createForestTrenchesPlot(
  documentRef: Document,
  span: ForestTrenchesSpanOutput,
  options: ForestTrenchesPlotOptions
): void {
  if (!documentRef.getElementById(FOREST_TRENCHES_PLOT_ID)) return;

  const showLegend = options.showLegend ?? false;
  const traces: Data[] = [
    {
      x: span.axis.map((point) => point.x),
      y: span.axis.map((point) => point.y),
      type: 'scatter',
      mode: 'lines',
      line: { color: FOREST_TRENCHES_PLOT_COLORS.axis, width: 1.5, dash: 'dash' },
      hoverinfo: 'skip',
      name: options.axisLabel,
      showlegend: showLegend
    },
    lineTrace(span.plot.repartition, options.repartitionLabel, FOREST_TRENCHES_PLOT_COLORS.repartition, showLegend),
    lineTrace(span.plot.baseCase, options.baseCaseLabel, FOREST_TRENCHES_PLOT_COLORS.baseCase, showLegend)
  ];

  for (const ruleType of options.lateralRuleTypes) {
    const color = options.ruleColors[ruleType] ?? PlotlyDrawings.conformity.defaultZoneColor;
    const ruleName = options.ruleLabels[ruleType] ?? ruleType;
    const lateral = requireRuleValue(span.plot.lateral[ruleType], ruleType, 'lateral plot');
    const lateralInverse = requireRuleValue(span.plot.lateralInverse[ruleType], ruleType, 'inverse lateral plot');
    traces.push(
      pointTrace(lateral.cable, options.lateralCableLabel(ruleName), color, 'circle-open', showLegend),
      pointTrace(lateral.limit, options.lateralLimitLabel(ruleName), color, 'diamond', showLegend),
      pointTrace(lateralInverse.cable, options.lateralInverseCableLabel(ruleName), color, 'circle-open', showLegend),
      pointTrace(lateralInverse.limit, options.lateralInverseLimitLabel(ruleName), color, 'diamond', showLegend)
    );
  }

  const layout: Partial<Layout> = {
    ...getPlotlyBaseLayout(),
    dragmode: 'zoom',
    hovermode: 'closest',
    margin: { l: 55, r: 15, t: 15, b: 45 },
    xaxis: {
      title: { text: options.xAxisTitle },
      zeroline: false,
      tickmode: 'array',
      tickvals: span.points.map((point) => point.distanceToLeftSupport),
      ticktext: [...options.xTickLabels]
    },
    // Positive wind gives a positive axis distance, drawn below the axis.
    yaxis: {
      title: { text: options.yAxisTitle },
      zeroline: true,
      autorange: 'reversed',
      scaleanchor: 'x',
      scaleratio: 1
    },
    showlegend: showLegend,
    legend: {
      x: 0.01,
      y: 0.99,
      xanchor: 'left',
      yanchor: 'top',
      bgcolor: 'rgba(255, 255, 255, 0.8)'
    }
  };

  const config: Partial<Config> = {
    displayModeBar: true,
    displaylogo: false,
    responsive: true,
    staticPlot: false,
    scrollZoom: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d']
  };

  void Plotly.react(FOREST_TRENCHES_PLOT_ID, traces, layout, config);
}

export function resizeForestTrenchesPlot(documentRef: Document): void {
  if (documentRef.getElementById(FOREST_TRENCHES_PLOT_ID)) {
    Plotly.Plots.resize(FOREST_TRENCHES_PLOT_ID);
  }
}

export function purgeForestTrenchesPlot(documentRef: Document): void {
  if (documentRef.getElementById(FOREST_TRENCHES_PLOT_ID)) {
    Plotly.purge(FOREST_TRENCHES_PLOT_ID);
  }
}
