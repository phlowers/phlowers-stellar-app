/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import Plotly, { Config, Data, Layout, Shape } from 'plotly.js-dist-min';
import { ObstacleConformityType } from '@infrastructure/database/entities/catalog-obstacle-configuration.entity';
import {
  ConformityCablePoint,
  ConformityPlotResponse,
  ConformityPlotXY,
  ConformityZoneCorner
} from '../conformity-plot.model';

/** Id of the div the conformity cross-section renders into (see conformity.component.html). */
export const CONFORMITY_PLOT_ID = 'conformity-plot';

/** Opacity of a zone / disk fill (the "background"). */
const FILL_OPACITY = 0.2;
/** Width (px) of the bright hard borders. */
const BORDER_WIDTH = 2;
/** Marker size (px) for cable candidate points. */
const CABLE_MARKER_SIZE = 7;
/** Marker size (px) for the hoverable border-intersection points. */
const BORDER_MARKER_SIZE = 4;
/** Single color of every overhang / vegetation cable candidate point. */
const CABLE_POINT_COLOR = '#017aa3';
/** Obstacle point marker color. */
const OBSTACLE_COLOR = '#1f2937';
/** Fallback zone color when a rule has no catalog color. */
const DEFAULT_ZONE_COLOR = '#888888';

const HOVER_TEMPLATE = '%{x:.2f} m, %{y:.2f} m<extra></extra>';

/** Reactive inputs that condition the rendering, resolved from the component. */
export interface ConformityPlotOptions {
  /** Rule types currently selected in the conformity multiselect (drives what is drawn). */
  selectedRuleTypes: string[];
  /** Zone color per rule type, from the catalog rule definitions. */
  ruleColors: Record<string, string>;
  /** Obstacle conformity type, selecting the zone / disk styling. */
  conformityType: ObstacleConformityType;
}

/** Convert a `#rrggbb` hex color to an `rgba()` string with the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Extract the single `{ x, y }` payload of a corner entry (e.g. `{ LowerLeft: { x, y } }`). */
function cornerXY(corner: ConformityZoneCorner): ConformityPlotXY {
  return Object.values(corner)[0] as ConformityPlotXY;
}

/** Filled zone background from the ordered corner polygon (no visible outline of its own). */
function zoneFillTrace(zonePoints: ConformityZoneCorner[], color: string): Data {
  const coords = zonePoints.map(cornerXY);
  const x = coords.map((c) => c.x);
  const y = coords.map((c) => c.y);
  return {
    x: [...x, x[0]],
    y: [...y, y[0]],
    type: 'scatter',
    mode: 'lines',
    fill: 'toself',
    fillcolor: hexToRgba(color, FILL_OPACITY),
    line: { width: 0 },
    hoverinfo: 'skip',
    showlegend: false
  };
}

/**
 * Bright hard border traced along the task-provided `zoneBorder` polyline, with a hoverable
 * marker at every intersection (vertex).
 */
function zoneBorderTrace(zoneBorder: ConformityPlotXY[], color: string): Data {
  return {
    x: zoneBorder.map((p) => p.x),
    y: zoneBorder.map((p) => p.y),
    type: 'scatter',
    mode: 'lines+markers',
    line: { color, width: BORDER_WIDTH },
    marker: { color, size: BORDER_MARKER_SIZE },
    hovertemplate: HOVER_TEMPLATE,
    showlegend: false
  };
}

/** Cable candidate points of a zone (overhang / vegetation), all in the single cable color. */
function zonePointsTrace(points: ConformityCablePoint[]): Data {
  return {
    x: points.map((p) => p.x),
    y: points.map((p) => p.y),
    type: 'scatter',
    mode: 'markers',
    marker: { color: CABLE_POINT_COLOR, size: CABLE_MARKER_SIZE },
    hovertemplate: HOVER_TEMPLATE,
    showlegend: false
  };
}

/** `cable_track` disks (data-unit radius) drawn behind the traces, in the rule color. */
function diskShapes(points: ConformityCablePoint[], color: string): Partial<Shape>[] {
  return points.map((p) => ({
    type: 'circle',
    xref: 'x',
    yref: 'y',
    layer: 'below',
    x0: p.x - p.radius,
    x1: p.x + p.radius,
    y0: p.y - p.radius,
    y1: p.y + p.radius,
    fillcolor: hexToRgba(color, FILL_OPACITY),
    line: { color, width: BORDER_WIDTH }
  }));
}

/** Center markers of the `cable_track` disks, in the single cable color (like `zonePointsTrace`). */
function diskCentersTrace(points: ConformityCablePoint[]): Data {
  return {
    x: points.map((p) => p.x),
    y: points.map((p) => p.y),
    type: 'scatter',
    mode: 'markers',
    marker: { color: CABLE_POINT_COLOR, size: CABLE_MARKER_SIZE },
    hovertemplate: HOVER_TEMPLATE,
    showlegend: false
  };
}

/** Obstacle point(s), drawn on top for every conformity type. */
function obstacleTrace(response: ConformityPlotResponse): Data {
  return {
    x: response.obstacle.points.map((p) => p.x),
    y: response.obstacle.points.map((p) => p.y),
    type: 'scatter',
    mode: 'markers',
    marker: { color: OBSTACLE_COLOR, size: 10, symbol: 'diamond' },
    hovertemplate: `${response.obstacle.name}: ${HOVER_TEMPLATE}`,
    showlegend: false
  };
}

/**
 * Render the conformity cross-section into the `#conformity-plot` div.
 *
 * Only the rules selected in the multiselect are drawn, stacked so the first rule key in
 * `response.conformity` sits on top of the following ones. Styling depends on the conformity type:
 * - `overhang` / `vegetation`: filled zone with a bright border following the task's
 *   `zoneBorder`; cable points as `#017aa3` markers.
 * - `cable_track`: no zone box; cable points drawn as rule-colored disks sized by `radius`.
 */
export function createConformityPlot(
  documentRef: Document,
  response: ConformityPlotResponse,
  options: ConformityPlotOptions
): void {
  if (!documentRef.getElementById(CONFORMITY_PLOT_ID)) return;

  const isCableTrack = options.conformityType === 'cable_track';
  // Response key order is the stacking priority; draw reversed so the first key lands on top.
  const ruleTypes = Object.keys(response.conformity).filter((rt) => options.selectedRuleTypes.includes(rt));

  const traces: Data[] = [];
  const shapes: Partial<Shape>[] = [];

  // Zones / disks first (reversed → higher-priority rule on top).
  for (const ruleType of [...ruleTypes].reverse()) {
    const rule = response.conformity[ruleType];
    const color = options.ruleColors[ruleType] ?? DEFAULT_ZONE_COLOR;
    if (isCableTrack) {
      shapes.push(...diskShapes(rule.points, color));
    } else {
      traces.push(zoneFillTrace(rule.zonePlot.zonePoints, color), zoneBorderTrace(rule.zonePlot.zoneBorder, color));
    }
  }

  // Cable points on top of every zone fill.
  for (const ruleType of ruleTypes) {
    const rule = response.conformity[ruleType];
    traces.push(isCableTrack ? diskCentersTrace(rule.points) : zonePointsTrace(rule.points));
  }

  traces.push(obstacleTrace(response));

  const layout: Partial<Layout> = {
    autosize: true,
    showlegend: false,
    dragmode: false,
    hovermode: 'closest',
    margin: { l: 55, r: 15, t: 15, b: 45 },
    xaxis: { fixedrange: true, zeroline: false },
    yaxis: {
      fixedrange: true,
      zeroline: false,
      scaleanchor: 'x',
      scaleratio: 1
    },
    shapes
  };

  const config: Partial<Config> = {
    displayModeBar: false,
    displaylogo: false,
    responsive: true,
    staticPlot: false,
    scrollZoom: false
  };

  // Plotly.react creates the plot if it doesn't exist yet, or efficiently updates it in place
  // (rather than fully tearing down and rebuilding) when only the rule selection changed.
  void Plotly.react(CONFORMITY_PLOT_ID, traces, layout, config);
}

/** Remove the conformity plot from the DOM, guarding on the div's existence. */
export function purgeConformityPlot(documentRef: Document): void {
  if (documentRef.getElementById(CONFORMITY_PLOT_ID)) Plotly.purge(CONFORMITY_PLOT_ID);
}
