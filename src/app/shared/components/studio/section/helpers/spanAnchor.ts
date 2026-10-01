/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { Side, View } from '@shared/types/plot.types';

/**
 * Position of a point along a span, measured from one of its two supports.
 * @category Studio
 */
export interface SpanAnchorRef {
  /** Support the distance is measured from. */
  supportRef: 'LEFT' | 'RIGHT';
  /** Horizontal distance from `supportRef` (m). */
  distanceSupportRef: number;
}

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
 * Resolves the point on a span polyline located at `distanceSupportRef` from
 * `supportRef`, by interpolating at the matching horizontal abscissa.
 *
 * @remarks
 * - `supportRef === 'LEFT'`: abscissa starts at the left support
 *   (`polyline[0].x`).
 * - `supportRef === 'RIGHT'`: abscissa starts at the right support
 *   (`polyline[last].x`).
 * - Matches the semantics of `loadPosition` used by mechaphlowers, so an
 *   annotation placed with it shares the exact same anchor as a punctual load
 *   placed at the same distance from the same reference support.
 *
 * @category Studio
 * @param litData - Raw section output, whose `coords.spans` holds the polylines.
 * @param absoluteSpanIndex - Absolute index of the span (its left support index).
 * @param anchorRef - Reference support and distance from it.
 * @returns The `[x, y, z]` point, or `null` when the span has no polyline.
 */
export const resolveAnchorCoord = (
  litData: GetSectionOutput,
  absoluteSpanIndex: number,
  anchorRef: SpanAnchorRef
): number[] | null => {
  const polyline = litData.coords.spans?.[absoluteSpanIndex];
  if (!polyline || polyline.length === 0) return null;

  const distance = Math.max(0, anchorRef.distanceSupportRef);
  const leftX = polyline[0][0];
  const rightX = polyline.at(-1)![0];
  // Line direction sign: +1 when x increases from left to right, -1 otherwise.
  const direction = rightX >= leftX ? 1 : -1;
  const targetX = anchorRef.supportRef === 'LEFT' ? leftX + direction * distance : rightX - direction * distance;

  return findPointAtAbscissa(polyline, targetX);
};

/**
 * Maps a 3D anchor `[x,y,z]` to the active 2D/3D plot axes.
 * @category Studio
 */
export const mapAnchorToAxes = (anchor: number[], view: View, side: Side): { x: number; y: number; z: number } => ({
  x: side === 'face' && view === '2d' ? anchor[1] : anchor[0],
  y: view === '2d' ? anchor[2] : anchor[1],
  z: anchor[2]
});
