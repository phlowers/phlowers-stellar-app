/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ObstacleOutput } from '@services/worker_python/tasks/types';
import { DataObject } from './createPlotDataObject';
import { Coord3 } from './distance.types';

const ADDITIONAL_POINT_COLOR = '#ed6e13';
const ADDITIONAL_POINT_LINE_WIDTH = 4;
const ADDITIONAL_POINT_MARKER_SIZE = 5;

/**
 * Maps a 3D coordinate tuple to Plotly x/y(/z) values based on the current view and side.
 * Follows the same convention as `createDistanceTraces`:
 * - 3D:        x → x, y → y, z → z
 * - 2D profile: x → x, z → y
 * - 2D face:    y → x, z → y
 */
const mapCoord = (coord: Coord3, view: string, side: string): { x: number; y: number; z?: number } => {
  const [cx, cy, cz] = coord;
  if (view === '3d') {
    return { x: cx, y: cy, z: cz };
  }
  return {
    x: side === 'face' ? cy : cx,
    y: cz
  };
};

const createMarkerTrace = (point: Coord3, view: string, side: string): DataObject => {
  const mapped = mapCoord(point, view, side);
  const is3d = view === '3d';

  return {
    x: [mapped.x],
    y: [mapped.y],
    z: is3d ? [mapped.z] : undefined,
    type: is3d ? 'scatter3d' : 'scatter',
    mode: 'markers',
    marker: { color: ADDITIONAL_POINT_COLOR, size: ADDITIONAL_POINT_MARKER_SIZE, symbol: 'diamond' },
    showlegend: false,
    hoverinfo: 'skip',
    name: 'additional-point-marker',
    supportUuid: undefined
  } as DataObject;
};

const createLineTrace = (from: Coord3, to: Coord3, view: string, side: string): DataObject => {
  const fromMapped = mapCoord(from, view, side);
  const toMapped = mapCoord(to, view, side);
  const is3d = view === '3d';

  return {
    x: [fromMapped.x, toMapped.x],
    y: [fromMapped.y, toMapped.y],
    z: is3d ? [fromMapped.z, toMapped.z] : undefined,
    type: is3d ? 'scatter3d' : 'scatter',
    mode: 'lines',
    line: { color: ADDITIONAL_POINT_COLOR, width: ADDITIONAL_POINT_LINE_WIDTH, dash: 'dash' },
    showlegend: false,
    hoverinfo: 'skip',
    name: 'additional-point-line',
    supportUuid: undefined
  } as DataObject;
};

/**
 * Builds marker and connecting-line traces for the distance/angle measurement points
 * registered via the `addMeasureDistanceAnglePoints` task, following the same
 * trace-building conventions as `createDistanceTraces`.
 *
 * @param additionalPoints - Groups of registered measurement points (2 or 3 points each).
 * @param view - Current plot view ('2d' or '3d').
 * @param side - Current 2D side ('profile' or 'face'), ignored in 3D.
 */
export const createDistanceMeasuringPointsTraces = (
  additionalPoints: ObstacleOutput['obstacles'] | undefined,
  view: string,
  side: string
): DataObject[] => {
  const traces: DataObject[] = [];

  for (const group of additionalPoints ?? []) {
    const points = group.points;
    points.forEach((point) => traces.push(createMarkerTrace(point, view, side)));
    for (let i = 0; i < points.length - 1; i++) {
      traces.push(createLineTrace(points[i], points[i + 1], view, side));
    }
  }

  return traces;
};
