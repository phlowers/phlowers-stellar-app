/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import Plotly, { type Config, type Dash, type Data, type Layout } from 'plotly.js-dist-min';
import type { Floor } from '@shared/domain/models/floor.model';
import type { Support } from '@shared/domain/models/support.model';
import { getPlotlyBaseLayout } from '@shared/constants/plotly-base-layout.constantes';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { PLOTLY_LINE_DASHES, PLOTLY_MARKER_SYMBOLS } from '@shared/constants/plotly-styles.constantes';
import type { ForestTrenchesSpanOutput, SliceGroundInput } from '@services/worker_python/tasks/types';
import {
  FOREST_TRENCHES_AXIS_POINT_MARKER,
  FOREST_TRENCHES_PLOT_COLORS,
  FOREST_TRENCHES_PLOT_ID
} from './forest-trenches.constantes';
import type {
  CatalogObstacleConformityConfigEntity,
  ForestTrenchesChartSeriesStyle
} from '@infrastructure/database/entities/catalog-obstacle-conformity-config.entity';
import type {
  ForestTrenchesChart,
  ForestTrenchesConfig,
  ForestTrenchesPlotOptions,
  ForestTrenchesRowsConfig,
  ForestTrenchesTableRow,
  ForestTrenchesTranslate
} from './forest-trenches.interfaces';

const HOVER_TEMPLATE = '%{x:.2f} m, %{y:.2f} m<extra></extra>';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isChartSeriesStyle = (value: unknown): value is ForestTrenchesChartSeriesStyle => {
  const style = value as Partial<ForestTrenchesChartSeriesStyle> | null | undefined;
  return (
    typeof style?.marker === 'string' &&
    Object.hasOwn(PLOTLY_MARKER_SYMBOLS, style.marker) &&
    typeof style.line === 'string' &&
    Object.hasOwn(PLOTLY_LINE_DASHES, style.line)
  );
};

const isChart = (value: unknown): value is ForestTrenchesChart => {
  const chart = value as Partial<ForestTrenchesChart> | null | undefined;
  return (
    isChartSeriesStyle(chart?.cable) &&
    isChartSeriesStyle(chart?.limit) &&
    (chart.overhang_color === null || typeof chart.overhang_color === 'string')
  );
};

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
    forest_trenches_chart: chart,
    floor_obstacle_red_zone: redZone,
    floor_obstacle_distances: floorDistances
  } = config as Partial<CatalogObstacleConformityConfigEntity>;

  if (
    !Array.isArray(nPointsChoices) ||
    nPointsChoices.length === 0 ||
    !nPointsChoices.every((count) => typeof count === 'number' && Number.isFinite(count)) ||
    !isStringArray(overhangRules) ||
    !isStringArray(lateralRules) ||
    !isChart(chart) ||
    typeof redZone !== 'boolean' ||
    !Array.isArray(floorDistances)
  ) {
    return null;
  }

  return { nPointsChoices, overhangRules, lateralRules, chart, redZone, floorDistances };
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
  const ruleByType = new Map(rules.ruleDefinitions.map((rule) => [rule.rule_type, rule]));
  const selectedRules = new Set(rules.selectedRules);
  const lateralRules = rules.lateralRules.filter((ruleType) => selectedRules.has(ruleType));
  const overhangRules = rules.overhangRules.filter((ruleType) => selectedRules.has(ruleType));
  const rows: ForestTrenchesTableRow[] = [];

  const addRow = (id: string, key: string, values: number[], params?: Record<string, string | number>): void => {
    rows.push({ id, label: t(key, params), unitKey: 'common.meter', values });
  };
  type Point = ForestTrenchesSpanOutput['points'][number];
  const overhangValues = (ruleType: string, value: (result: Point['overhang'][string]) => number): number[] =>
    span.points.map((point) => value(requireRuleValue(point.overhang[ruleType], ruleType, 'overhang')));
  const lateralValues = (ruleType: string, value: (result: Point['lateral'][string]) => number): number[] =>
    span.points.map((point) => value(requireRuleValue(point.lateral[ruleType], ruleType, 'lateral')));
  // Same temperature resolution as the engine scenarios: the rule temperature, else the form temperature.
  const overhangParams = (ruleType: string) => ({
    ruleName: ruleByType.get(ruleType)?.rule_name ?? ruleType,
    temperature: ruleByType.get(ruleType)?.overhang_point.temperature ?? rules.repartitionTemperature
  });
  const lateralParams = (ruleType: string) => ({
    ruleName: ruleByType.get(ruleType)?.rule_name ?? ruleType,
    temperature: ruleByType.get(ruleType)?.lateral_point.temperature ?? rules.lateralDistanceTemperature
  });

  addRow(
    'distance-to-left-support',
    'studio.forest-trenches.row-distance-to-left-support',
    span.points.map((point) => Math.abs(point.distanceToLeftSupport))
  );
  addRow(
    'ground-elevation',
    'studio.forest-trenches.row-ground-elevation',
    span.points.map((point) => point.groundElevation)
  );

  for (const ruleType of overhangRules) {
    addRow(
      `cable-altitude-overhang-${ruleType}`,
      'studio.forest-trenches.row-cable-altitude-overhang',
      overhangValues(ruleType, (result) => result.elevation),
      overhangParams(ruleType)
    );
  }
  for (const ruleType of lateralRules) {
    addRow(
      `cable-altitude-lateral-${ruleType}`,
      'studio.forest-trenches.row-cable-altitude-lateral',
      lateralValues(ruleType, (result) => result.elevation),
      lateralParams(ruleType)
    );
  }
  for (const ruleType of overhangRules) {
    addRow(
      `cable-height-overhang-${ruleType}`,
      'studio.forest-trenches.row-cable-height-overhang',
      overhangValues(ruleType, (result) => result.heightAboveGround),
      overhangParams(ruleType)
    );
  }
  for (const ruleType of overhangRules) {
    addRow(
      `overhang-compliance-limit-height-${ruleType}`,
      'studio.forest-trenches.row-overhang-compliance-limit-height',
      overhangValues(ruleType, (result) => result.complianceLimitHeightAboveGround),
      overhangParams(ruleType)
    );
  }
  for (const ruleType of lateralRules) {
    addRow(
      `axis-cable-lateral-${ruleType}`,
      'studio.forest-trenches.row-axis-cable-lateral',
      lateralValues(ruleType, (result) => result.axisDistance),
      lateralParams(ruleType)
    );
  }
  for (const ruleType of lateralRules) {
    addRow(
      `axis-lateral-limit-${ruleType}`,
      'studio.forest-trenches.row-axis-lateral-limit',
      lateralValues(ruleType, (result) => result.limitAxisDistance),
      lateralParams(ruleType)
    );
  }

  return rows;
}

function requireRuleValue<T>(value: T | undefined, ruleType: string, category: string): T {
  if (value === undefined) {
    throw new Error(`Missing ${category} result for rule "${ruleType}".`);
  }
  return value;
}

function scenarioTrace(
  points: ForestTrenchesSpanOutput['axis'],
  name: string,
  color: string,
  style: ForestTrenchesChartSeriesStyle,
  showLegend: boolean
): Data {
  const dash = PLOTLY_LINE_DASHES[style.line] ?? null;
  return {
    x: points.map((point) => point.x),
    y: points.map((point) => point.y),
    type: 'scatter',
    mode: dash === null ? 'markers' : 'lines+markers',
    ...(dash === null ? {} : { line: { color, width: 2, dash: dash as Dash } }),
    marker: {
      color,
      size: PlotlyDrawings.conformity.cablePoint.markerSize,
      symbol: PLOTLY_MARKER_SYMBOLS[style.marker],
      line: { color, width: 1.5 }
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
      legendgroup: 'axis',
      showlegend: showLegend
    },
    {
      x: span.points.map((point) => point.distanceToLeftSupport),
      y: span.points.map(() => 0),
      type: 'scatter',
      mode: 'markers',
      marker: {
        color: FOREST_TRENCHES_PLOT_COLORS.axis,
        symbol: FOREST_TRENCHES_AXIS_POINT_MARKER.symbol,
        size: FOREST_TRENCHES_AXIS_POINT_MARKER.size,
        line: { color: FOREST_TRENCHES_PLOT_COLORS.axis, width: FOREST_TRENCHES_AXIS_POINT_MARKER.lineWidth }
      },
      hovertemplate: HOVER_TEMPLATE,
      name: options.axisLabel,
      legendgroup: 'axis',
      showlegend: false
    }
  ];
  const ruleColor = (ruleType: string): string =>
    options.ruleColors[ruleType] ?? PlotlyDrawings.conformity.defaultZoneColor;
  const ruleName = (ruleType: string): string => options.ruleLabels[ruleType] ?? ruleType;
  const { cable, limit } = options.chart;

  for (const ruleType of options.overhangRuleTypes) {
    const overhang = requireRuleValue(span.plot.overhang[ruleType], ruleType, 'overhang plot');
    traces.push(
      scenarioTrace(
        overhang.cable,
        options.overhangCableLabel(ruleName(ruleType)),
        options.chart.overhang_color ?? ruleColor(ruleType),
        cable,
        showLegend
      )
    );
  }
  for (const ruleType of options.lateralRuleTypes) {
    const color = ruleColor(ruleType);
    const name = ruleName(ruleType);
    const lateral = requireRuleValue(span.plot.lateral[ruleType], ruleType, 'lateral plot');
    const lateralInverse = requireRuleValue(span.plot.lateralInverse[ruleType], ruleType, 'inverse lateral plot');
    traces.push(
      scenarioTrace(lateral.cable, options.lateralCableLabel(name), color, cable, showLegend),
      scenarioTrace(lateral.limit, options.lateralLimitLabel(name), color, limit, showLegend),
      scenarioTrace(lateralInverse.cable, options.lateralInverseCableLabel(name), color, cable, showLegend),
      scenarioTrace(lateralInverse.limit, options.lateralInverseLimitLabel(name), color, limit, showLegend)
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
