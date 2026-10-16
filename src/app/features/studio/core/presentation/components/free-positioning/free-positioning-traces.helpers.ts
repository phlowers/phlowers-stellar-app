/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Data, PlotData } from 'plotly.js-dist-min';
import { Side } from '@shared/types/plot.types';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { POINT_SELECTION_PIXEL_RADIUS } from './free-positioning.constantes';
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

const getTraceMode = (drawsLine: boolean, hasLabels: boolean): PlotData['mode'] => {
  if (drawsLine) {
    return hasLabels ? 'text+lines+markers' : 'lines+markers';
  }
  return hasLabels ? 'text+markers' : 'markers';
};

/**
 * Builds Plotly scatter traces for free-positioning points on the given plot side.
 * All points are rendered as marker symbols so they are geometrically centered on their
 * data point. The points of the floor are also joined by a line, in their order, like the floor
 * line of the section plot; the trace draws it under its own markers.
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
    const drawsLine = category === 'floor' && categoryPoints.length > 1;
    const drawing = PlotlyDrawings.freePositioning.category[category];
    const trace: Data = {
      type: 'scatter',
      mode: getTraceMode(drawsLine, hasLabels),
      name: `${category}-markers`,
      x: categoryPoints.map((p) => (side === 'profile' ? p.alongSpan : (p.lateral as number))),
      y: categoryPoints.map((p) => p.altitude),
      text: categoryPoints.map((p) => p.name ?? ''),
      textposition: 'top center',
      // Hover is disabled globally for free-positioning points
      hoverinfo: 'skip',
      showlegend: false,
      ...(drawsLine && {
        line: {
          color: PlotlyDrawings.freePositioning.floorLine.color,
          width: PlotlyDrawings.freePositioning.floorLine.width,
          dash: PlotlyDrawings.freePositioning.floorLine.style
        }
      }),
      marker: {
        size: categoryPoints.map((p) => (p.editable ? drawing.selected.size : drawing.unselected.size)),
        color: categoryPoints.map((p) => (p.editable ? drawing.selected.color : (p.color ?? drawing.unselected.color))),
        symbol: drawing.symbol,
        opacity: categoryPoints.map((p) => (p.pending ? PlotlyDrawings.freePositioning.pendingPointOpacity : 1)),
        line: {
          width: categoryPoints.map((p) =>
            p.editable ? drawing.selected.outlineWidth : drawing.unselected.outlineWidth
          ),
          color: categoryPoints.map((p) =>
            p.editable ? drawing.selected.outlineColor : drawing.unselected.outlineColor
          )
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
