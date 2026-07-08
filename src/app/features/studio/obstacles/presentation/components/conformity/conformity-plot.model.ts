/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Contract for the conformity graph data the python task returns, consumed by the
 * `#conformity-plot` Plotly cross-section. Values are a fixed mock today
 * (`CONFORMITY_PLOT_MOCK`); the real calculation will populate this same shape, making it a
 * drop-in replacement. Colors are the only styling sourced outside this response (from the
 * catalog rule definitions, keyed by `rule_type`).
 */

/** A point in the sliced (2D) view: x = distance to line axis (m), y = altitude (m). */
export interface ConformityPlotXY {
  x: number;
  y: number;
}

/** A cable candidate point, carrying the disk radius (m) used by `cable_track`. */
export interface ConformityCablePoint extends ConformityPlotXY {
  radius: number;
}

/** Name of a zone corner. */
export type ConformityCornerName = 'UpperLeft' | 'UpperRight' | 'LowerRight' | 'LowerLeft';

/** One zone corner, delivered as a single-key object e.g. `{ LowerLeft: { x, y } }`. */
export type ConformityZoneCorner = Partial<Record<ConformityCornerName, ConformityPlotXY>>;

/** Geometry of a rule's conformity zone. */
export interface ConformityZonePlot {
  /** Ordered polygon corners (fill outline). */
  zonePoints: ConformityZoneCorner[];
  /** Bright-border polyline, already trimmed by the task to the edges to highlight. */
  zoneBorder: ConformityPlotXY[];
}

/** One conformity rule: its zone geometry and candidate cable points. */
export interface ConformityRulePlot {
  zonePlot: ConformityZonePlot;
  points: ConformityCablePoint[];
}

/** The obstacle and its own point(s), always drawn regardless of conformity type. */
export interface ConformityPlotObstacle {
  name: string;
  points: ConformityPlotXY[];
}

/** Full response the conformity calculation returns for the graph. */
export interface ConformityPlotResponse {
  obstacle: ConformityPlotObstacle;
  /** Rules keyed by `rule_type` (e.g. `'RULE_1'`). Key order is the stacking priority. */
  conformity: Record<string, ConformityRulePlot>;
}
