/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as Plotly from 'plotly.js-dist-min';
import { CableModification } from '@shared/domain';
import { CreatePlotParams } from './createPlot';
import {
  CABLE_MOD_ARROW_X_OFFSET,
  CABLE_MOD_ARROW_Y_OFFSET,
  CABLE_MOD_COLOR,
  CABLE_MOD_ICON,
  CABLE_MOD_LABEL_Y_SHIFT,
  getCableModificationLabel
} from './createCableModificationAnnotations.constantes';
import { buildClickableIconAnnotation } from './createClickableIconAnnotation';

/**
 * Returns the 3D point on a span polyline whose horizontal abscissa
 * (`coord[0]`, world x along the line) matches `targetX`.
 *
 * @remarks
 * Cable abscissa (the same semantics used by `loadPosition` /
 * `distanceSupportRef` in mechaphlowers) maps to horizontal x distance from
 * the left support, **not** to arc length along the sagging cable. Using arc
 * length puts the anchor too far down the curve. Interpolating by `x` keeps
 * the cable modification icon on the same data point as a punctual load
 * placed at the same `loadPosition`.
 *
 * - Returns `null` for empty polylines.
 * - Returns the single point when the polyline has only one sample.
 * - Clamps to the first/last point when `targetX` is outside the polyline range.
 * - Handles both increasing and decreasing x ordering (line direction
 *   independent).
 */
const findPointAtAbscissa = (polyline: number[][] | undefined, targetX: number): number[] | null => {
  if (!polyline || polyline.length === 0) return null;
  if (polyline.length === 1) return polyline[0];

  for (let i = 1; i < polyline.length; i++) {
    const p0 = polyline[i - 1];
    const p1 = polyline[i];
    const x0 = p0[0];
    const x1 = p1[0];
    const lo = Math.min(x0, x1);
    const hi = Math.max(x0, x1);
    if (targetX >= lo && targetX <= hi) {
      const dx = x1 - x0;
      const t = dx === 0 ? 0 : (targetX - x0) / dx;
      return [x0 + t * (x1 - x0), p0[1] + t * (p1[1] - p0[1]), p0[2] + t * (p1[2] - p0[2])];
    }
  }
  // Clamp: pick the endpoint whose x is closest to targetX.
  const first = polyline[0];
  const last = polyline.at(-1)!;
  return Math.abs(targetX - first[0]) <= Math.abs(targetX - last[0]) ? first : last;
};

/**
 * Resolves the anchor coordinate for a cable modification annotation by
 * interpolating along the span polyline at the horizontal abscissa
 * corresponding to the modification's `supportRef` and `distanceSupportRef`.
 *
 * @remarks
 * - `supportRef === 'LEFT'`: abscissa starts at the left support
 *   (`polyline[0].x`).
 * - `supportRef === 'RIGHT'`: abscissa starts at the right support
 *   (`polyline[last].x`).
 * - Matches the semantics of `loadPosition` used by mechaphlowers so the
 *   cable modification icon shares the exact same anchor as a punctual load
 *   placed at the same distance from the same reference support.
 */
const resolveAnchorCoord = (
  plotParams: CreatePlotParams,
  absoluteSpanIndex: number,
  modification: CableModification
): number[] | null => {
  const polyline = plotParams.litData.coords.spans?.[absoluteSpanIndex];
  if (!polyline || polyline.length === 0) return null;

  const distance = Math.max(0, modification.distanceSupportRef);
  const leftX = polyline[0][0];
  const rightX = polyline.at(-1)![0];
  // Line direction sign: +1 when x increases from left to right, -1 otherwise.
  const direction = rightX >= leftX ? 1 : -1;
  const targetX = modification.supportRef === 'LEFT' ? leftX + direction * distance : rightX - direction * distance;

  return findPointAtAbscissa(polyline, targetX);
};

/** Maps a 3D anchor `[x,y,z]` to the active 2D/3D plot axes. */
const mapAnchorToAxes = (
  anchor: number[],
  view: CreatePlotParams['view'],
  side: CreatePlotParams['side']
): { x: number; y: number; z: number } => ({
  x: side === 'face' && view === '2d' ? anchor[1] : anchor[0],
  y: view === '2d' ? anchor[2] : anchor[1],
  z: anchor[2]
});

/**
 * Icon annotation (FontAwesome glyph) with an arrow line connecting it back
 * to the manipulated point on the cable polyline. Same arrow style as the
 * load annotation.
 */
const buildIconAnnotation = (
  anchor: number[],
  modification: CableModification,
  view: CreatePlotParams['view'],
  side: CreatePlotParams['side']
): Partial<Plotly.Annotations> => {
  const mapped = mapAnchorToAxes(anchor, view, side);
  return buildClickableIconAnnotation({
    arrowTipX: mapped.x,
    arrowTipY: mapped.y,
    arrowTipZ: mapped.z,
    icon: CABLE_MOD_ICON,
    color: CABLE_MOD_COLOR,
    arrowYOffset: CABLE_MOD_ARROW_Y_OFFSET,
    arrowXOffset: CABLE_MOD_ARROW_X_OFFSET,
    data: {
      type: 'cableModification',
      spanUuid: modification.spanUuid,
      cableModificationUuid: modification.uuid
    }
  });
};

/**
 * Label annotation ("Raccourcissement" / "Allongement") shown just above
 * the icon. Uses `showarrow: false` with a positive `yshift` so its vertical
 * position relative to the anchor stays constant in pixels, keeping a fixed
 * gap with the icon at any zoom.
 */
const buildLabelAnnotation = (
  anchor: number[],
  modification: CableModification,
  view: CreatePlotParams['view'],
  side: CreatePlotParams['side']
): Partial<Plotly.Annotations> => {
  const mapped = mapAnchorToAxes(anchor, view, side);
  return {
    xref: 'x' as const,
    yref: 'y' as const,
    x: mapped.x,
    y: mapped.y,
    // z is a non-standard Plotly annotation property used for 3D rendering
    z: mapped.z,
    showarrow: false,
    xshift: CABLE_MOD_ARROW_X_OFFSET,
    yshift: CABLE_MOD_LABEL_Y_SHIFT,
    text: getCableModificationLabel(modification.widthCable),
    captureevents: false,
    bgcolor: 'rgba(0,0,0,0)',
    font: {
      family: 'Arial, sans-serif',
      color: CABLE_MOD_COLOR,
      size: 11
    }
  } as Partial<Plotly.Annotations>;
};

/**
 * Creates Plotly annotation objects representing cable length modifications on the section plot.
 *
 * @remarks
 * Pure function (no DI, no side effects) so it can be unit-tested in isolation.
 * Only renders annotations for modifications whose span is currently visible
 * (within `startSupport` ≤ index < `endSupport`). The arrow tail of the icon
 * is anchored at the exact point on the cable polyline corresponding to
 * (`supportRef`, `distanceSupportRef`), so the connecting line moves whenever
 * those values change.
 *
 * The icon uses the same visual style as the load annotation (solid arrow,
 * no head, `arrowwidth: 1`, same color/border/font). The only difference is
 * `ay: -90` instead of `ay: -50`, guaranteeing a 40 px gap so the two icons
 * never overlap when both anchor on the same data point.
 *
 * For each modification two annotations are emitted: the icon (clickable)
 * and a non-clickable text label ("Raccourcissement" / "Allongement") sitting
 * just above the icon.
 *
 * @category Studio
 * @param plotParams - The plot parameters (view, side, support range, lit data).
 * @param cableModifications - The persisted cable modifications to render.
 * @param spanUuidToIndex - Lookup mapping a `spanUuid` to its absolute support index.
 * @returns An array of Plotly `Annotations` for the cable modification icons + labels.
 */
export const createCableModificationAnnotations = (
  plotParams: CreatePlotParams,
  cableModifications: readonly CableModification[],
  spanUuidToIndex: ReadonlyMap<string, number>
): Partial<Plotly.Annotations>[] => {
  const { side, view, startSupport, endSupport } = plotParams;
  const annotations: Partial<Plotly.Annotations>[] = [];

  cableModifications.forEach((modification) => {
    const absoluteSpanIndex = spanUuidToIndex.get(modification.spanUuid);
    if (absoluteSpanIndex === undefined || absoluteSpanIndex < 0) return;
    if (absoluteSpanIndex < startSupport || absoluteSpanIndex >= endSupport) return;

    const anchor = resolveAnchorCoord(plotParams, absoluteSpanIndex, modification);
    if (!anchor) return;

    annotations.push(
      buildIconAnnotation(anchor, modification, view, side),
      buildLabelAnnotation(anchor, modification, view, side)
    );
  });

  return annotations;
};
