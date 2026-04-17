import { Dash } from 'plotly.js-dist-min';
import { Distance, DistancePoint, GetSectionOutput } from '@services/worker_python/tasks/types';
import { CreatePlotParams } from './createPlot';
import { DataObject } from './createPlotDataObject';
import { Coord3, PointVisuals } from './distance.types';

const DISTANCE_COLOR = '#674883';
const DISTANCE_LINE_WIDTH = 4;
const LINE_POINT_MARKER_SIZE = 6;

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

const midpoint3d = (a: Coord3, b: Coord3): Coord3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

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

/**
 * Creates a text-only 2D scatter trace at the midpoint of the solid segment.
 * Using a trace with `mode: 'text'` and `textposition` offsets the label in
 * screen space (pixels), so it always appears beside the line regardless of
 * its angle — no manual perpendicular-offset math needed.
 */
const createTextTrace = (mid: { x: number; y: number }, text: string): DataObject =>
  ({
    x: [mid.x],
    y: [mid.y],
    type: 'scatter',
    mode: 'text',
    text: [text],
    textposition: 'top center',
    textfont: { color: DISTANCE_COLOR, size: 11 },
    showlegend: false,
    hoverinfo: 'skip',
    name: 'distance-label',
    supportUuid: undefined
  }) as DataObject;

/**
 * Builds distance line/marker traces and a distance value label for one obstacle point.
 *
 * Segment patterns per distance type:
 * - oblique:    solid line directly from linePoint → obstaclePoint
 * - vertical:   dotted line from linePoint → virtualPointVertical (horizontal segment at wire altitude),
 *               solid line from virtualPointVertical → obstaclePoint (vertical drop)
 * - horizontal: dotted line from linePoint → virtualPointHorizontal (vertical segment),
 *               solid line from virtualPointHorizontal → obstaclePoint (horizontal span)
 *
 * In 2D the distance value is rendered as a text-only scatter trace (textposition offsets
 * it in screen-pixel space, keeping it beside the line for any orientation).
 * In 3D it falls back to a scene annotation with a diagonal pixel shift.
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

  // Resolve the midpoint and distance value for the solid segment label
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
  const labelText = `${distanceValue.toFixed(2)} m`;

  if (view !== '3d') {
    // 2D: use a text-only scatter trace — textposition handles the screen-space offset
    traces.push(createTextTrace(solidMidMapped as { x: number; y: number }, labelText));
    return { traces, annotation: null };
  }

  // 3D: scene annotations support xshift/yshift for a diagonal pixel offset
  const annotation = {
    showarrow: false,
    text: labelText,
    font: { color: DISTANCE_COLOR, size: 11 },
    x: solidMidMapped.x,
    y: solidMidMapped.y,
    z: solidMidMapped.z,
    xshift: 10,
    yshift: 10,
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

    const obstacle = litData.obstacles?.find((o) => o.uuid === distance.obstacleUuid);
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
 * Builds all distance traces and annotations in a single pass.
 * Prefer this over calling `createDistanceTraces` and `createDistanceAnnotations`
 * separately to avoid computing `buildDistanceVisuals` twice per render.
 */
export const createDistanceVisuals = (
  plotParams: CreatePlotParams
): { traces: DataObject[]; annotations: Partial<Plotly.Annotations>[] } => {
  const { distances, distanceType, litData, view, side, currentObstacleUuid } = plotParams;

  if (!distances?.length || !litData?.obstacles?.length || !distanceType || !currentObstacleUuid) {
    return { traces: [], annotations: [] };
  }

  const selectedDistances = distances.filter((d) => d.obstacleUuid === currentObstacleUuid);
  return buildDistanceVisuals(selectedDistances, distanceType, litData, view, side);
};

/**
 * Creates Plotly data traces for obstacle distance visualization.
 * For each distance entry, looks up the obstacle's absolute coordinates
 * from litData and draws lines/markers based on the selected distance type.
 */
export const createDistanceTraces = (plotParams: CreatePlotParams): DataObject[] =>
  createDistanceVisuals(plotParams).traces;

/**
 * Creates Plotly annotations displaying distance values near the solid measurement segment.
 * Intended to be included in the layout annotations (both 2D and 3D scene annotations).
 */
export const createDistanceAnnotations = (plotParams: CreatePlotParams): Partial<Plotly.Annotations>[] =>
  createDistanceVisuals(plotParams).annotations;
