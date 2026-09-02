/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { Floor } from '@shared/domain/models/floor.model';
import { Support } from '@shared/domain/models/support.model';
import { Side, View } from '@shared/types/plot.types';
import { DataObject } from './createPlotDataObject';
import { Coord3 } from './distance.types';

/** Parameters for {@link createFloorTraces}. */
export interface CreateFloorTracesParams {
  /** Section output; floor points are read from `litData.obstacles` by uuid. */
  litData: GetSectionOutput | null;
  /** Domain floors, used to identify floor uuids and resolve point names. */
  floors: Floor[] | undefined;
  /** Support models used to resolve the visible span window. */
  supports: Support[] | undefined;
  /** Zero-based index of the first visible support. */
  startSupport: number;
  /** Zero-based index of the last visible support (exclusive for spans). */
  endSupport: number;
  /** Current plot view ('2d' or '3d'). */
  view: View;
  /** Current 2D side ('profile' or 'face'), ignored in 3D. */
  side: Side;
  /** UUID of the floor whose point is active in the floor form, or `null`. */
  selectedFloorUuid?: string | null;
  /** Index of the active point within the selected floor, or `null`. */
  selectedPointIndex?: number | null;
  /** Builds the localized hover label of a point from its distance to the reference support. */
  pointLabel: FloorPointLabel;
}

/** Formats a floor point's hover label — localized by the caller, so this helper holds no UI text. */
export type FloorPointLabel = (distanceToRefSupport: number | null) => string;

const FLOOR_COLOR = '#f6ab4d';
/** Highlight color for the floor point currently active in the floor form. */
const FLOOR_SELECTED_COLOR = '#ed6e13';
const FLOOR_LINE_WIDTH_3D = 0;
const FLOOR_LINE_WIDTH_2D = 4;
const FLOOR_MARKER_SIZE_3D = 6;
const FLOOR_MARKER_SIZE_2D = 5;
const FLOOR_SELECTED_MARKER_SIZE_3D = 8;
const FLOOR_SELECTED_MARKER_SIZE_2D = 12;
/** Lateral half-width (meters) giving the 3D floor ribbon its forward/backward depth. */
const FLOOR_RIBBON_HALF_WIDTH = 10;
const FLOOR_RIBBON_OPACITY = 0.6;
// mesh3d always writes to the 3D pick buffer (hoverinfo 'skip' only hides its own label), so it
// occludes coplanar floor markers. Recess the ribbon just below the line to keep markers hoverable.
const FLOOR_RIBBON_Z_OFFSET = -0.15;

/** Maps an absolute [x, y, z] coord to plot axes, mirroring `createObstaclesAnnotations`. */
const mapCoord = (coord: Coord3, view: View, side: Side): { x: number; y: number; z: number } => {
  const [cx, cy, cz] = coord;
  return {
    x: view === '2d' && side === 'face' ? cy : cx,
    y: view === '3d' ? cy : cz,
    z: cz
  };
};

const floorPointName = (floor: Floor, index: number, pointLabel: FloorPointLabel): string =>
  pointLabel(floor.points[index]?.distanceToRefSupport ?? null);

const createFloorLineTrace = (
  points: Coord3[],
  floor: Floor,
  view: View,
  side: Side,
  selectedPointIndex: number | null,
  pointLabel: FloorPointLabel
): DataObject => {
  const is3d = view === '3d';
  const mapped = points.map((point) => mapCoord(point, view, side));
  const hovertext = points.map((_, index) => floorPointName(floor, index, pointLabel));
  const baseSize = is3d ? FLOOR_MARKER_SIZE_3D : FLOOR_MARKER_SIZE_2D;
  const selectedSize = is3d ? FLOOR_SELECTED_MARKER_SIZE_3D : FLOOR_SELECTED_MARKER_SIZE_2D;
  const markerSize = points.map((_, index) => (index === selectedPointIndex ? selectedSize : baseSize));
  const markerColor = points.map((_, index) => (index === selectedPointIndex ? FLOOR_SELECTED_COLOR : FLOOR_COLOR));

  return {
    x: mapped.map((m) => m.x),
    y: mapped.map((m) => m.y),
    z: is3d ? mapped.map((m) => m.z) : undefined,
    type: is3d ? 'scatter3d' : 'scatter',
    mode: 'lines+markers',
    line: { color: FLOOR_COLOR, width: is3d ? FLOOR_LINE_WIDTH_3D : FLOOR_LINE_WIDTH_2D },
    marker: { color: markerColor, size: markerSize },
    // Per-point identity so a plot click can resolve the floor and point it belongs to.
    customdata: points.map((_, index) => [floor.uuid, index]),
    hovertext,
    hoverinfo: 'text',
    showlegend: false,
    name: 'floor',
    supportUuid: undefined
  } as DataObject;
};

/**
 * Builds a mesh3d strip around the floor polyline so it reads with some depth in 3D.
 * The ribbon is what the mouse actually lands on in gl3d (it covers far more screen area
 * than the thin markers), so each vertex carries the same hovertext/customdata as its
 * source point — hovering or clicking the ribbon resolves to the nearest floor point.
 */
const createFloorRibbonTrace = (
  points: Coord3[],
  floor: Floor,
  view: View,
  pointLabel: FloorPointLabel
): DataObject | null => {
  if (view !== '3d' || points.length < 2) {
    return null;
  }
  // Widen perpendicular to the span's horizontal direction, not along global Y: a span running
  // along Y would otherwise produce collinear vertices, i.e. zero-area triangles and no hit target.
  const [x0, y0] = points[0];
  const [xN, yN] = points.at(-1)!;
  const dx = xN - x0;
  const dy = yN - y0;
  const len = Math.hypot(dx, dy);
  // Degenerate (all points stacked vertically): any horizontal direction works, keep Y.
  const [offX, offY] =
    len === 0
      ? [0, FLOOR_RIBBON_HALF_WIDTH]
      : [(-dy / len) * FLOOR_RIBBON_HALF_WIDTH, (dx / len) * FLOOR_RIBBON_HALF_WIDTH];

  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  const hovertext: string[] = [];
  const customdata: [string, number][] = [];
  points.forEach(([cx, cy, cz], index) => {
    xs.push(cx + offX, cx - offX);
    ys.push(cy + offY, cy - offY);
    zs.push(cz + FLOOR_RIBBON_Z_OFFSET, cz + FLOOR_RIBBON_Z_OFFSET);
    hovertext.push(floorPointName(floor, index, pointLabel), floorPointName(floor, index, pointLabel));
    customdata.push([floor.uuid, index], [floor.uuid, index]);
  });

  const iIdx: number[] = [];
  const jIdx: number[] = [];
  const kIdx: number[] = [];
  for (let p = 0; p < points.length - 1; p++) {
    const front0 = 2 * p;
    const back0 = 2 * p + 1;
    const front1 = 2 * (p + 1);
    const back1 = 2 * (p + 1) + 1;
    iIdx.push(front0, back0);
    jIdx.push(back0, back1);
    kIdx.push(front1, front1);
  }

  return {
    type: 'mesh3d',
    x: xs,
    y: ys,
    z: zs,
    i: iIdx,
    j: jIdx,
    k: kIdx,
    color: FLOOR_COLOR,
    opacity: FLOOR_RIBBON_OPACITY,
    hovertext,
    hoverinfo: 'text',
    customdata,
    showlegend: false,
    name: 'floor-ribbon',
    supportUuid: undefined
  } as unknown as DataObject;
};

/**
 * Builds Plotly traces for every floor whose span is inside the visible support window.
 * Each floor renders as a `#f6ab4d` line linking its points (like a cable), with the point
 * name built by `pointLabel` shown only on hover, plus a 3D ribbon for depth.
 * The point matching `selectedPointIndex` on the `selectedFloorUuid` floor is highlighted.
 */
export const createFloorTraces = ({
  litData,
  floors,
  supports,
  startSupport,
  endSupport,
  view,
  side,
  selectedFloorUuid = null,
  selectedPointIndex = null,
  pointLabel
}: CreateFloorTracesParams): DataObject[] => {
  if (!floors?.length || !litData?.obstacles?.length) {
    return [];
  }
  // A floor is attached to its span's left support, which starts a span to the right;
  // endSupport belongs to the next span, so the slice excludes it — same rule as obstacles.
  const visibleSupportUuids = new Set((supports ?? []).slice(startSupport, endSupport).map((s) => s.uuid));
  const pointsByUuid = new Map(litData.obstacles.map((o) => [o.uuid, o.points as Coord3[]]));

  const traces: DataObject[] = [];
  for (const floor of floors) {
    if (!visibleSupportUuids.has(floor.supportUuid)) {
      continue;
    }
    const points = pointsByUuid.get(floor.uuid);
    if (!points?.length) {
      continue;
    }
    const activePointIndex = floor.uuid === selectedFloorUuid ? selectedPointIndex : null;
    traces.push(createFloorLineTrace(points, floor, view, side, activePointIndex, pointLabel));
    const ribbon = createFloorRibbonTrace(points, floor, view, pointLabel);
    if (ribbon) {
      traces.push(ribbon);
    }
  }
  return traces;
};
