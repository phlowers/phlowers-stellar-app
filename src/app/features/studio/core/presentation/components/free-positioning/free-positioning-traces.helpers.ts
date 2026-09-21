/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Data } from 'plotly.js-dist-min';
import { Side } from '@shared/types/plot.types';
import {
  CATEGORY_COLORS,
  CATEGORY_SYMBOLS,
  DEFAULT_POINT_SIZE,
  EDITABLE_POINT_COLOR,
  EDITABLE_POINT_SIZE,
  POINT_SELECTION_PIXEL_RADIUS
} from './free-positioning.constantes';
import { FreePositioningCategory, FreePositioningPoint, PlotLayout } from './free-positioning.interfaces';

/**
 * Filters and validates points for the specified plot side and visible categories.
 */
export const filterPointsForSide = (
  points: readonly FreePositioningPoint[],
  side: Side,
  visibleCategories: ReadonlySet<FreePositioningCategory> | readonly FreePositioningCategory[]
): FreePositioningPoint[] => {
  const visibleSet = visibleCategories instanceof Set ? visibleCategories : new Set(visibleCategories);

  return points.filter((point) => {
    if (!visibleSet.has(point.category)) {
      return false;
    }
    if (typeof point.altitude !== 'number' || Number.isNaN(point.altitude)) {
      return false;
    }
    if (side === 'profile') {
      return typeof point.alongSpan === 'number' && !Number.isNaN(point.alongSpan);
    }
    return point.lateral !== null && typeof point.lateral === 'number' && !Number.isNaN(point.lateral);
  });
};

/**
 * Builds Plotly scatter traces for free-positioning points on the given plot side.
 * All points are rendered as marker symbols so they are geometrically centered on their
 * data point.
 */
export const buildFreePositioningTraces = (
  points: readonly FreePositioningPoint[],
  side: Side,
  visibleCategories: ReadonlySet<FreePositioningCategory> | readonly FreePositioningCategory[]
): Data[] => {
  const validPoints = filterPointsForSide(points, side, visibleCategories);
  if (validPoints.length === 0) {
    return [];
  }

  // Group by category
  const categoriesPresent = Array.from(new Set(validPoints.map((p) => p.category)));
  const traces: Data[] = [];

  for (const category of categoriesPresent) {
    const categoryPoints = validPoints.filter((p) => p.category === category);
    const hasLabels = categoryPoints.some((p) => Boolean(p.name));
    const trace: Data = {
      type: 'scatter',
      mode: hasLabels ? 'text+markers' : 'markers',
      name: `${category}-markers`,
      x: categoryPoints.map((p) => (side === 'profile' ? p.alongSpan : (p.lateral as number))),
      y: categoryPoints.map((p) => p.altitude),
      text: categoryPoints.map((p) => p.name ?? ''),
      textposition: 'top center',
      hovertext: categoryPoints.map((p) => p.name ?? category),
      hoverinfo: 'x+y+text',
      showlegend: false,
      marker: {
        size: categoryPoints.map((p) => (p.editable ? EDITABLE_POINT_SIZE : DEFAULT_POINT_SIZE)),
        color: categoryPoints.map((p) => (p.editable ? EDITABLE_POINT_COLOR : (p.color ?? CATEGORY_COLORS[category]))),
        symbol: CATEGORY_SYMBOLS[category],
        line: {
          width: categoryPoints.map((p) => (p.editable ? 2 : 1)),
          color: categoryPoints.map((p) => (p.editable ? '#7f1d1d' : '#1f2937'))
        }
      }
    };
    traces.push(trace);
  }

  return traces;
};

/**
 * Finds the nearest point within selection radius to the given pixel click coordinates.
 * Returns `null` if no point is within radius.
 */
export const findNearestPointAtPixel = (
  points: readonly FreePositioningPoint[],
  side: Side,
  layout: PlotLayout,
  clickX: number,
  clickY: number,
  visibleCategories: ReadonlySet<FreePositioningCategory> | readonly FreePositioningCategory[],
  maxRadius = POINT_SELECTION_PIXEL_RADIUS
): FreePositioningPoint | null => {
  const candidates = filterPointsForSide(points, side, visibleCategories);
  let nearestPoint: FreePositioningPoint | null = null;
  let nearestDistance = maxRadius;

  for (const point of candidates) {
    const dataX = side === 'profile' ? point.alongSpan : (point.lateral as number);
    const dataY = point.altitude;

    const pixelX = layout.xaxis.c2p(dataX);
    const pixelY = layout.yaxis.c2p(dataY);

    const distance = Math.hypot(pixelX - clickX, pixelY - clickY);
    if (distance <= nearestDistance) {
      nearestDistance = distance;
      nearestPoint = point;
    }
  }

  return nearestPoint;
};
