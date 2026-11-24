/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as Plotly from 'plotly.js-dist-min';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { RrtsCutStrandsData } from '@shared/domain/models/section.model';
import { CreatePlotParams } from './createPlot';
import { CutStrandsAnnotationData } from './createCutStrandsAnnotations.interfaces';
import { getCutStrandsLabel } from './createCutStrandsAnnotations.constantes';
import { buildClickableIconAnnotation } from './createClickableIconAnnotation';
import { buildDashedIconLine, buildDashedIconLineShape } from './dashedIconLine.helpers';
import { findSupportTop, mapAnchorToAxes, resolveAnchorCoord } from './spanAnchor.helpers';

type MappedAnchor = ReturnType<typeof mapAnchorToAxes>;

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

// Clicking the icon opens the RRTS tool. The dashed line is drawn apart, so the icon stands on its own
const buildIcon = (
  { x, y, z }: MappedAnchor,
  view: CreatePlotParams['view'],
  translocoService?: CreatePlotParams['translocoService']
): Partial<Plotly.Annotations> =>
  buildClickableIconAnnotation({
    showArrow: false,
    arrowTipX: x,
    arrowTipY: y,
    arrowTipZ: z,
    yShift: PlotlyDrawings.cutStrands.offsetY,
    icon: PlotlyDrawings.cutStrands.icon,
    iconSize: PlotlyDrawings.cutStrands.iconSize[view],
    borderPad: PlotlyDrawings.cutStrands.borderPad[view],
    color: PlotlyDrawings.cutStrands.unselected.color,
    hover: {
      text: getCutStrandsLabel(translocoService),
      backgroundColor: PlotlyDrawings.cutStrands.tooltipText.backgroundColor,
      textColor: PlotlyDrawings.cutStrands.tooltipText.textColor
    },
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
 * `PlotlyDrawings.cutStrands.offsetY` px above its anchor point and joined to it by a dashed line.
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

  const icon = buildIcon(anchor, plotParams.view, plotParams.translocoService);
  return plotParams.view === '3d' ? [...buildDashedIconLine(anchor, PlotlyDrawings.cutStrands), icon] : [icon];
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
  return anchor ? [buildDashedIconLineShape(anchor, PlotlyDrawings.cutStrands)] : [];
};
