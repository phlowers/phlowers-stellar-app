/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as Plotly from 'plotly.js-dist-min';
import { CableModification } from '@shared/domain';
import { CreatePlotParams } from './createPlot';
import { CableModificationAnnotationData } from './createCableModificationAnnotations.interfaces';
import {
  CABLE_MOD_AX_OFFSET,
  CABLE_MOD_AY_OFFSET,
  CABLE_MOD_COLOR,
  CABLE_MOD_ICON
} from './createCableModificationAnnotations.constantes';

/** Base Plotly annotation shape shared by every cable modification annotation. */
const BASE_ANNOTATION: Partial<Plotly.Annotations> = {
  xref: 'x' as const,
  yref: 'y' as const,
  ax: CABLE_MOD_AX_OFFSET,
  ay: CABLE_MOD_AY_OFFSET,
  showarrow: true,
  arrowhead: 0,
  startarrowhead: 6,
  arrowcolor: CABLE_MOD_COLOR,
  captureevents: true,
  bordercolor: CABLE_MOD_COLOR,
  borderpad: 6,
  bgcolor: 'rgba(0,0,0,0)',
  font: {
    family: 'FontAwesome',
    color: CABLE_MOD_COLOR,
    size: 8
  },
  arrowwidth: 1
};

/**
 * Returns the 3D point located at `targetLength` along a span polyline,
 * measured as arc length from the first point.
 *
 * @remarks
 * - Returns `null` for empty polylines.
 * - Returns the first point when `targetLength <= 0` or the polyline has a
 *   single point.
 * - Clamps to the last point when `targetLength` exceeds the total length.
 */
const findPointAtArcLength = (polyline: number[][] | undefined, targetLength: number): number[] | null => {
  if (!polyline || polyline.length === 0) return null;
  if (polyline.length === 1 || targetLength <= 0) return polyline[0];

  let acc = 0;
  for (let i = 1; i < polyline.length; i++) {
    const [x0, y0, z0] = polyline[i - 1];
    const [x1, y1, z1] = polyline[i];
    const seg = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    if (acc + seg >= targetLength) {
      const t = seg === 0 ? 0 : (targetLength - acc) / seg;
      return [x0 + t * (x1 - x0), y0 + t * (y1 - y0), z0 + t * (z1 - z0)];
    }
    acc += seg;
  }
  return polyline[polyline.length - 1];
};

/**
 * Resolves the anchor coordinate for a cable modification annotation by
 * interpolating along the span polyline at the arc-length corresponding to
 * the modification's `supportRef` and `distanceSupportRef`.
 *
 * @remarks
 * - `supportRef === 'LEFT'`: distance is measured from the start of the
 *   polyline (left support).
 * - `supportRef === 'RIGHT'`: distance is measured from the end of the
 *   polyline (right support).
 */
const resolveAnchorCoord = (
  plotParams: CreatePlotParams,
  absoluteSpanIndex: number,
  modification: CableModification
): number[] | null => {
  const polyline = plotParams.litData.spans?.[absoluteSpanIndex];
  if (!polyline || polyline.length === 0) return null;

  const spanLength = plotParams.litData.span_length?.[absoluteSpanIndex] ?? 0;
  const distance = Math.max(0, modification.distanceSupportRef);
  const arc = modification.supportRef === 'LEFT' ? distance : Math.max(0, spanLength - distance);

  return findPointAtArcLength(polyline, arc);
};

/**
 * Creates Plotly annotation objects representing cable length modifications on the section plot.
 *
 * @remarks
 * Pure function (no DI, no side effects) so it can be unit-tested in isolation.
 * Only renders annotations for modifications whose span is currently visible
 * (within `startSupport` ≤ index < `endSupport`). The icon is anchored at the
 * exact point on the cable polyline corresponding to (`supportRef`,
 * `distanceSupportRef`), so it moves whenever those values change.
 *
 * @category Studio
 * @param plotParams - The plot parameters (view, side, support range, lit data).
 * @param cableModifications - The persisted cable modifications to render.
 * @param spanUuidToIndex - Lookup mapping a `spanUuid` to its absolute support index.
 * @returns An array of Plotly `Annotations` for the cable modification icons.
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

    annotations.push({
      ...BASE_ANNOTATION,
      x: side === 'face' && view === '2d' ? anchor[1] : anchor[0],
      y: view === '2d' ? anchor[2] : anchor[1],
      // z and data are non-standard Plotly annotation properties used for 3D rendering and event handling
      z: anchor[2],
      text: CABLE_MOD_ICON,
      data: {
        type: 'cableModification',
        spanUuid: modification.spanUuid,
        cableModificationUuid: modification.uuid
      } as CableModificationAnnotationData
    } as Partial<Plotly.Annotations>);
  });

  return annotations;
};
