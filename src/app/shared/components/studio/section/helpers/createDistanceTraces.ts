import { Dash } from 'plotly.js-dist-min';
import { Distance, DistancePoint, GetSectionOutput } from '@services/worker_python/tasks/types';
import { CreatePlotParams } from './createPlot';
import { DataObject } from './createPlotDataObject';

const DISTANCE_COLOR = '#674883';
const DISTANCE_LINE_WIDTH = 4;
const LINE_POINT_MARKER_SIZE = 6;

type Coord3 = [number, number, number];

/**
 * Maps a 3D coordinate tuple to Plotly x/y(/z) values based on the current view and side.
 * Follows the same convention as createDataObject:
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

const midpoint3d = (a: Coord3, b: Coord3): Coord3 => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
  (a[2] + b[2]) / 2
];

const createLineTrace = (from: Coord3, to: Coord3, view: string, side: string, dash: Dash): DataObject => {
  const fromMapped = mapCoord(from, view, side);
  const toMapped = mapCoord(to, view, side);
  const is3d = view === '3d';

  return {
    x: [fromMapped.x, toMapped.x],
    y: [fromMapped.y, toMapped.y],
    z: is3d ? [fromMapped.z, toMapped.z] : undefined,
    type: is3d ? 'scatter3d' : 'scatter',
    mode: 'lines',
    line: { color: DISTANCE_COLOR, width: DISTANCE_LINE_WIDTH, dash },
    showlegend: false,
    hoverinfo: 'skip',
    name: 'distance-line',
    supportUuid: undefined
  } as DataObject;
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
    marker: { color: DISTANCE_COLOR, size: LINE_POINT_MARKER_SIZE, symbol: 'circle' },
    showlegend: false,
    hoverinfo: 'skip',
    name: 'distance-marker',
    supportUuid: undefined
  } as DataObject;
};

interface PointVisuals {
  traces: DataObject[];
  annotation: Partial<Plotly.Annotations> | null;
}

/**
 * Builds distance line/marker traces and a distance value annotation for one obstacle point.
 *
 * Segment patterns per distance type:
 * - oblique:    solid line directly from linePoint → obstaclePoint
 * - vertical:   dotted line from linePoint → virtualPointVertical (horizontal segment at wire altitude),
 *               solid line from virtualPointVertical → obstaclePoint (vertical drop)
 * - horizontal: dotted line from linePoint → virtualPointHorizontal (vertical segment),
 *               solid line from virtualPointHorizontal → obstaclePoint (horizontal span)
 *
 * The numeric distance value is shown as an annotation at the midpoint of the solid segment.
 */
const createPointVisuals = (
  obstacleCoord: Coord3,
  distancePoint: DistancePoint,
  distanceType: 'oblique' | 'vertical' | 'horizontal',
  view: string,
  side: string
): PointVisuals => {
  const { linePoint, virtualPointHorizontal, virtualPointVertical } = distancePoint;
  const traces: DataObject[] = [];

  if (distanceType === 'oblique') {
    traces.push(createLineTrace(linePoint, obstacleCoord, view, side, 'solid'));
  } else if (distanceType === 'vertical') {
    // Dotted: linePoint → virtualPointVertical (horizontal segment at wire altitude)
    // Solid:  virtualPointVertical → obstacleCoord (vertical drop)
    traces.push(
      createLineTrace(linePoint, virtualPointVertical, view, side, 'dot'),
      createLineTrace(virtualPointVertical, obstacleCoord, view, side, 'solid')
    );
  } else {
    // Dotted: linePoint → virtualPointHorizontal (vertical segment)
    // Solid:  virtualPointHorizontal → obstacleCoord (horizontal span)
    traces.push(
      createLineTrace(linePoint, virtualPointHorizontal, view, side, 'dot'),
      createLineTrace(virtualPointHorizontal, obstacleCoord, view, side, 'solid')
    );
  }

  traces.push(createMarkerTrace(linePoint, view, side));

  // Annotation at midpoint of the solid segment with the numeric distance value
  let solidMid: Coord3;
  let distanceValue: number;
  if (distanceType === 'vertical') {
    solidMid = midpoint3d(virtualPointVertical, obstacleCoord);
    distanceValue = distancePoint.distanceVertical;
  } else if (distanceType === 'horizontal') {
    solidMid = midpoint3d(virtualPointHorizontal, obstacleCoord);
    distanceValue = distancePoint.distanceHorizontal;
  } else {
    solidMid = midpoint3d(linePoint, obstacleCoord);
    distanceValue = distancePoint.distanceDiagonal;
  }

  const solidMidMapped = mapCoord(solidMid, view, side);
  const is3d = view === '3d';

  const annotation = {
    showarrow: false,
    text: `${distanceValue.toFixed(2)} m`,
    font: { color: DISTANCE_COLOR, size: 11 },
    x: solidMidMapped.x,
    y: solidMidMapped.y,
    ...(is3d ? { z: solidMidMapped.z } : {}),
    xshift: 10,
    captureevents: false
  } as Partial<Plotly.Annotations>;

  return { traces, annotation };
};

const buildDistanceVisuals = (
  distances: Distance[],
  distanceType: 'oblique' | 'vertical' | 'horizontal',
  litData: GetSectionOutput,
  view: string,
  side: string
): { traces: DataObject[]; annotations: Partial<Plotly.Annotations>[] } => {
  const traces: DataObject[] = [];
  const annotations: Partial<Plotly.Annotations>[] = [];

  for (const distance of distances) {
    if (!distance.obstacleUuid || !distance.points?.length) {
      continue;
    }

    const obstacle = litData.obstacles?.find((o) => o.name === distance.obstacleUuid);
    if (!obstacle) {
      continue;
    }

    for (const distancePoint of distance.points) {
      const obstacleCoord = obstacle.points[distancePoint.pointIndex];
      if (!obstacleCoord) {
        continue;
      }

      const result = createPointVisuals(obstacleCoord as Coord3, distancePoint, distanceType, view, side);
      traces.push(...result.traces);
      if (result.annotation) {
        annotations.push(result.annotation);
      }
    }
  }

  return { traces, annotations };
};

/**
 * Creates Plotly data traces for obstacle distance visualization.
 * For each distance entry, looks up the obstacle's absolute coordinates
 * from litData and draws lines/markers based on the selected distance type.
 */
export const createDistanceTraces = (plotParams: CreatePlotParams): DataObject[] => {
  const { distances, distanceType, litData, view, side } = plotParams;

  if (!distances?.length || !litData?.obstacles?.length || !distanceType) {
    return [];
  }

  return buildDistanceVisuals(distances, distanceType, litData, view, side).traces;
};

/**
 * Creates Plotly annotations displaying distance values near the solid measurement segment.
 * Intended to be included in the layout annotations (both 2D and 3D scene annotations).
 */
export const createDistanceAnnotations = (plotParams: CreatePlotParams): Partial<Plotly.Annotations>[] => {
  const { distances, distanceType, litData, view, side } = plotParams;

  if (!distances?.length || !litData?.obstacles?.length || !distanceType) {
    return [];
  }

  return buildDistanceVisuals(distances, distanceType, litData, view, side).annotations;
};
