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
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import type { FloorAnnotationData } from './createFloorTraces.interfaces';
import { DataObject } from './createPlotDataObject';
import { Coord3 } from './distance.types';

/** Parameters for {@link createFloorTraces} and {@link createFloorAnnotations}. */
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

/** Floors whose span is inside the visible support window, paired with their rendered points. */
const getVisibleFloors = ({
  litData,
  floors,
  supports,
  startSupport,
  endSupport
}: CreateFloorTracesParams): { floor: Floor; points: Coord3[] }[] => {
  if (!floors?.length || !litData?.obstacles?.length) {
    return [];
  }
  // A floor is attached to its span's left support, which starts a span to the right;
  // endSupport belongs to the next span, so the slice excludes it — same rule as obstacles.
  const visibleSupportUuids = new Set((supports ?? []).slice(startSupport, endSupport).map((s) => s.uuid));
  const pointsByUuid = new Map(litData.obstacles.map((o) => [o.uuid, o.points]));

  return floors.flatMap((floor) => {
    const points = pointsByUuid.get(floor.uuid);
    return visibleSupportUuids.has(floor.supportUuid) && points?.length ? [{ floor, points }] : [];
  });
};

// The line is decorative: its points are drawn and picked as annotations (see createFloorAnnotations).
const createFloorLineTrace = (points: Coord3[], view: View, side: Side): DataObject => {
  const is3d = view === '3d';
  const mapped = points.map((point) => mapCoord(point, view, side));

  return {
    x: mapped.map((m) => m.x),
    y: mapped.map((m) => m.y),
    z: is3d ? mapped.map((m) => m.z) : undefined,
    type: is3d ? 'scatter3d' : 'scatter',
    mode: 'lines',
    line: { color: PlotlyDrawings.floor.line.color, width: PlotlyDrawings.floor.line.width[view] },
    hoverinfo: 'skip',
    showlegend: false,
    name: 'floor',
    supportUuid: undefined
  } as DataObject;
};

/**
 * Builds a mesh3d strip around the floor polyline so it reads with some depth in 3D.
 * It is purely visual: floor points are picked through their annotations, which sit above the
 * WebGL canvas, so the ribbon never hovers nor resolves a click. It bends at every point so it
 * follows the line wherever it angles.
 */
const createFloorRibbonTrace = (points: Coord3[], view: View): DataObject | null => {
  if (view !== '3d' || points.length < 2) {
    return null;
  }
  // Widen perpendicular to the span's horizontal direction, not along global Y: a span running
  // along Y would otherwise produce collinear vertices, i.e. zero-area triangles.
  const [x0, y0] = points[0];
  const [xN, yN] = points.at(-1)!;
  const dx = xN - x0;
  const dy = yN - y0;
  const len = Math.hypot(dx, dy);
  // Degenerate (all points stacked vertically): any horizontal direction works, keep Y.
  const [offX, offY] =
    len === 0
      ? [0, PlotlyDrawings.floor.ribbon.halfWidth]
      : [(-dy / len) * PlotlyDrawings.floor.ribbon.halfWidth, (dx / len) * PlotlyDrawings.floor.ribbon.halfWidth];

  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  points.forEach(([cx, cy, cz]) => {
    xs.push(cx + offX, cx - offX);
    ys.push(cy + offY, cy - offY);
    zs.push(cz, cz);
  });

  const iIdx: number[] = [];
  const jIdx: number[] = [];
  const kIdx: number[] = [];
  // One quad (two triangles) between consecutive points.
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
    color: PlotlyDrawings.floor.ribbon.color,
    opacity: PlotlyDrawings.floor.ribbon.opacity,
    hoverinfo: 'skip',
    showlegend: false,
    name: 'floor-ribbon',
    supportUuid: undefined
  } as unknown as DataObject;
};

/**
 * Builds Plotly traces for every floor whose span is inside the visible support window.
 * Each floor renders as a line in the floor color linking its points (like a cable), plus a 3D ribbon
 * for depth. Neither is interactive: the points themselves come from {@link createFloorAnnotations}.
 */
export const createFloorTraces = (params: CreateFloorTracesParams): DataObject[] =>
  getVisibleFloors(params).flatMap(({ points }) => {
    const ribbon = createFloorRibbonTrace(points, params.view);
    const line = createFloorLineTrace(points, params.view, params.side);
    return ribbon ? [line, ribbon] : [line];
  });

const getPointLook = (isFloorSelected: boolean, isActive: boolean) => {
  if (isActive) return PlotlyDrawings.floor.selected;
  return isFloorSelected ? PlotlyDrawings.floor.inactivePoint : PlotlyDrawings.floor.unselected;
};

/**
 * Creates the clickable floor point annotations, the way obstacle points are drawn.
 * Annotations are SVG laid over the plot, so in 3D they stay clickable (with a pointer cursor)
 * even behind the floor ribbon, which a WebGL marker cannot: the ribbon occludes it in the pick buffer.
 * The point active in the floor form is drawn in the `selected` look, with its name shown above it; the other
 * points of that floor in the `inactivePoint` look, and the points of the other floors in the `unselected` one.
 * @category Studio
 */
export const createFloorAnnotations = (params: CreateFloorTracesParams): Partial<Plotly.Annotations>[] => {
  const { view, side, selectedFloorUuid = null, selectedPointIndex = null, pointLabel } = params;

  return getVisibleFloors(params).flatMap(({ floor, points }) =>
    points.flatMap((point, pointIndex) => {
      const { x, y, z } = mapCoord(point, view, side);
      const isFloorSelected = floor.uuid === selectedFloorUuid;
      const isActive = isFloorSelected && pointIndex === selectedPointIndex;
      const look = getPointLook(isFloorSelected, isActive);
      const name = floorPointName(floor, pointIndex, pointLabel);
      const data: FloorAnnotationData = { type: 'floor', floorUuid: floor.uuid, pointIndex };
      // z and data are non-standard Plotly properties for 3D and click handling
      const marker = {
        x,
        y,
        z,
        showarrow: false,
        text: look.symbol,
        font: { color: look.color, size: look.size[view] },
        hovertext: name,
        captureevents: true,
        data
      } as Partial<Plotly.Annotations>;
      if (!isActive) {
        return [marker];
      }
      const label = {
        x,
        y,
        z,
        showarrow: false,
        text: name,
        yshift: PlotlyDrawings.floor.label.yShift[view],
        font: { color: PlotlyDrawings.floor.selected.color, size: PlotlyDrawings.floor.label.size[view] },
        captureevents: false,
        data
      } as Partial<Plotly.Annotations>;
      return [marker, label];
    })
  );
};
