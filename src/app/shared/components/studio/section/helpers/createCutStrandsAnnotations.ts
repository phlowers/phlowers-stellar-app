/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as Plotly from 'plotly.js-dist-min';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { RrtsCutStrandsData } from '@shared/domain/models/section.model';
import { CreatePlotParams } from './createPlot';
import { CutStrandsAnnotationData } from './createCutStrandsAnnotations.interfaces';
import {
  CUT_STRANDS_COLOR,
  CUT_STRANDS_DASH_GAP,
  CUT_STRANDS_DASH_LENGTH,
  CUT_STRANDS_HOVER_TEXT_COLOR,
  CUT_STRANDS_ICON,
  CUT_STRANDS_ICON_PADDING,
  CUT_STRANDS_ICON_SIZE,
  CUT_STRANDS_LINE_LENGTH,
  CUT_STRANDS_OFFSET_Y,
  getCutStrandsLabel
} from './createCutStrandsAnnotations.constantes';
import { buildClickableIconAnnotation } from './createClickableIconAnnotation';
import { mapAnchorToAxes, resolveAnchorCoord } from './spanAnchor';

type MappedAnchor = ReturnType<typeof mapAnchorToAxes>;

// Highest point of a support: the one its number is written on
const findSupportTop = (support: number[][] | undefined): number[] | null =>
  support?.length ? support.reduce((top, point) => (point[2] > top[2] ? point : top)) : null;

/**
 * Resolves the point the marking hangs from.
 *
 * @remarks
 * Without a distance, the marking stands above the reference support itself. With one, it hangs from the point of
 * the cable found like the anchor of a cable modification, which only approximates where the engine places a load
 * at the same distance (see `resolveAnchorCoord`).
 */
const resolveAnchor = (
  litData: GetSectionOutput,
  spanIndex: number,
  cutStrands: RrtsCutStrandsData
): number[] | null => {
  const supportRef = cutStrands.supportRef ?? 'LEFT';
  if (cutStrands.distanceSupportRef === null) {
    return findSupportTop(litData.coords.supports?.[supportRef === 'LEFT' ? spanIndex : spanIndex + 1]);
  }
  return resolveAnchorCoord(litData, spanIndex, { supportRef, distanceSupportRef: cutStrands.distanceSupportRef });
};

// z is a non-standard Plotly annotation property used for 3D rendering
const atAnchor = ({ x, y, z }: MappedAnchor) => ({ xref: 'x' as const, yref: 'y' as const, x, y, z });

/**
 * Dashed line of the 3D view, from the anchor point up to the icon.
 *
 * @remarks
 * A Plotly annotation arrow cannot be dashed, and shapes do not exist in 3D. Each dash is therefore its own
 * arrow-only annotation: its tail sits `end` pixels above the anchor and `standoff` pulls its tip `start` pixels
 * away from the anchor. Both offsets are in pixels, so the line keeps its length at any zoom level or camera angle.
 */
const buildDashedLine = (anchor: MappedAnchor): Partial<Plotly.Annotations>[] => {
  const dashes: Partial<Plotly.Annotations>[] = [];
  for (let start = 0; start < CUT_STRANDS_LINE_LENGTH; start += CUT_STRANDS_DASH_LENGTH + CUT_STRANDS_DASH_GAP) {
    const end = Math.min(start + CUT_STRANDS_DASH_LENGTH, CUT_STRANDS_LINE_LENGTH);
    dashes.push({
      ...atAnchor(anchor),
      ax: 0,
      ay: -end,
      standoff: start,
      text: '',
      showarrow: true,
      arrowhead: 0,
      arrowcolor: CUT_STRANDS_COLOR,
      arrowwidth: 1,
      captureevents: false
    } as Partial<Plotly.Annotations>);
  }
  return dashes;
};

/**
 * Dashed line of the 2D view, from the anchor point up to the icon.
 *
 * @remarks
 * A single shape, anchored on the data point and sized in pixels: the line keeps its length at any zoom level, like
 * the 3D one.
 */
const buildDashedLineShape = ({ x, y }: MappedAnchor): Partial<Plotly.Shape> => ({
  type: 'line',
  xref: 'x',
  yref: 'y',
  xsizemode: 'pixel',
  ysizemode: 'pixel',
  xanchor: x,
  yanchor: y,
  x0: 0,
  x1: 0,
  y0: 0,
  y1: CUT_STRANDS_LINE_LENGTH,
  line: {
    color: CUT_STRANDS_COLOR,
    width: 1,
    // Plotly takes a dash pattern in pixels, which its typings do not list
    dash: `${CUT_STRANDS_DASH_LENGTH}px,${CUT_STRANDS_DASH_GAP}px` as Plotly.Dash
  }
});

// Clicking the icon opens the RRTS tool. The dashed line is drawn apart, so the icon stands on its own
const buildIcon = (
  { x, y, z }: MappedAnchor,
  translocoService?: CreatePlotParams['translocoService']
): Partial<Plotly.Annotations> =>
  buildClickableIconAnnotation({
    showArrow: false,
    arrowTipX: x,
    arrowTipY: y,
    arrowTipZ: z,
    yShift: CUT_STRANDS_OFFSET_Y,
    icon: CUT_STRANDS_ICON,
    iconSize: CUT_STRANDS_ICON_SIZE,
    borderPad: CUT_STRANDS_ICON_PADDING,
    color: CUT_STRANDS_COLOR,
    hover: { text: getCutStrandsLabel(translocoService), textColor: CUT_STRANDS_HOVER_TEXT_COLOR },
    data: { type: 'cutStrands' } satisfies CutStrandsAnnotationData
  });

/**
 * Resolves where the marking is drawn, on the plot axes.
 *
 * @remarks
 * Nothing is drawn unless the saved cut strands ask for a marking and are linked to a span that is
 * currently visible (within `startSupport` ≤ index < `endSupport`).
 */
const resolveMarkingAnchor = (plotParams: CreatePlotParams): MappedAnchor | null => {
  const { cutStrands, spanUuidToIndex, startSupport, endSupport, litData, view, side } = plotParams;
  if (!cutStrands?.addMarking || !cutStrands.spanUuid) return null;

  const spanIndex = spanUuidToIndex?.get(cutStrands.spanUuid);
  if (spanIndex === undefined || spanIndex < startSupport || spanIndex >= endSupport) return null;

  const anchor = resolveAnchor(litData, spanIndex, cutStrands);
  return anchor ? mapAnchorToAxes(anchor, view, side) : null;
};

/**
 * Creates the Plotly annotations of the RRTS cut strands marking on the section plot: a scissors icon,
 * {@link CUT_STRANDS_OFFSET_Y} px above its anchor point and joined to it by a dashed line.
 *
 * @remarks
 * Pure function (no DI, no side effects) so it can be unit-tested in isolation.
 * The dashed line is only made of annotations in 3D: the 2D view draws it as a shape (see {@link createCutStrandsShapes}).
 *
 * The icon shows a "Cut strands" label on hover, and opens the RRTS tool when clicked (see `SectionPlotComponent`).
 *
 * @category Studio
 * @param plotParams - The plot parameters (view, side, support range, lit data, saved cut strands).
 * @returns The 3D dashed line annotations followed by the icon annotation, or `[]` when there is no marking to draw.
 */
export const createCutStrandsAnnotations = (plotParams: CreatePlotParams): Partial<Plotly.Annotations>[] => {
  const anchor = resolveMarkingAnchor(plotParams);
  if (!anchor) return [];

  const icon = buildIcon(anchor, plotParams.translocoService);
  return plotParams.view === '3d' ? [...buildDashedLine(anchor), icon] : [icon];
};

/**
 * Creates the Plotly shapes of the RRTS cut strands marking on the 2D section plot: its dashed line.
 *
 * @remarks
 * Shapes do not exist in 3D, where {@link createCutStrandsAnnotations} draws the dashed line.
 *
 * @category Studio
 * @param plotParams - The plot parameters (view, side, support range, lit data, saved cut strands).
 * @returns The dashed line shape, or `[]` in 3D or when there is no marking to draw.
 */
export const createCutStrandsShapes = (plotParams: CreatePlotParams): Partial<Plotly.Shape>[] => {
  if (plotParams.view === '3d') return [];
  const anchor = resolveMarkingAnchor(plotParams);
  return anchor ? [buildDashedLineShape(anchor)] : [];
};
