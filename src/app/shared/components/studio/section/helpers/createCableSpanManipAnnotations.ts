/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as Plotly from 'plotly.js-dist-min';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { CreatePlotParams } from './createPlot';
import { CableSpanManipAnnotationData } from './createCableSpanManipAnnotations.interfaces';
import { buildClickableIconAnnotation } from './createClickableIconAnnotation';
import { buildDashedIconLine, buildDashedIconLineShape } from './dashedIconLine.helpers';
import { findSupportTop, mapAnchorToAxes } from './spanAnchor.helpers';

type MappedAnchor = ReturnType<typeof mapAnchorToAxes>;

interface FixedPoint {
  spanUuid: string;
  anchor: MappedAnchor;
}

/**
 * Resolves the fixed point of every cable span manipulation drawn on the plot, with the span it belongs to.
 *
 * @remarks
 * The engine models each calculated manipulation as a virtual support standing in its span: the fixed point is the
 * top of that support, where the sling hangs from. `virtual_supports_span_indices` gives the span of each virtual
 * support, and only spans currently visible are kept (`startSupport` ≤ index < `endSupport`).
 */
const resolveFixedPoints = (plotParams: CreatePlotParams): FixedPoint[] => {
  const { litData, supports, startSupport, endSupport, view, side } = plotParams;
  const spanIndices = litData.coords.virtual_supports_span_indices ?? [];

  return spanIndices.flatMap((spanIndex, virtualIndex) => {
    if (spanIndex < startSupport || spanIndex >= endSupport) return [];
    const spanUuid = supports?.[spanIndex]?.uuid;
    const top = findSupportTop(litData.coords.virtual_supports?.[virtualIndex]);
    return spanUuid && top ? [{ spanUuid, anchor: mapAnchorToAxes(top, view, side) }] : [];
  });
};

// The dashed line is drawn apart, so the icon stands on its own
const buildIcon = ({ spanUuid, anchor: { x, y, z } }: FixedPoint, view: CreatePlotParams['view']) =>
  buildClickableIconAnnotation({
    showArrow: false,
    arrowTipX: x,
    arrowTipY: y,
    arrowTipZ: z,
    yShift: PlotlyDrawings.cableSpanManip.offsetY,
    icon: PlotlyDrawings.cableSpanManip.icon,
    iconSize: PlotlyDrawings.cableSpanManip.iconSize[view],
    borderPad: PlotlyDrawings.cableSpanManip.borderPad[view],
    color: PlotlyDrawings.cableSpanManip.unselected.color,
    data: { type: 'cableSpanManip', spanUuid } satisfies CableSpanManipAnnotationData
  });

/**
 * Creates the Plotly annotations of the calculated cable span manipulations on the section plot: a clickable icon
 * `PlotlyDrawings.cableSpanManip.offsetY` px straight above each manipulation fixed point, joined to it by a dashed line.
 *
 * @remarks
 * Pure function (no DI, no side effects) so it can be unit-tested in isolation.
 * The dashed line is only made of annotations in 3D: the 2D view draws it as a shape
 * (see {@link createCableSpanManipShapes}).
 *
 * Clicking an icon opens the "Cable span manipulation" tab on its span (see `SectionPlotComponent`).
 *
 * @category Studio
 * @param plotParams - The plot parameters (view, side, support range, lit data, supports).
 * @returns The 3D dashed line annotations followed by the icon of each manipulation, or only the icons in 2D.
 */
export const createCableSpanManipAnnotations = (plotParams: CreatePlotParams): Partial<Plotly.Annotations>[] =>
  resolveFixedPoints(plotParams).flatMap((fixedPoint) => {
    const icon = buildIcon(fixedPoint, plotParams.view);
    return plotParams.view === '3d'
      ? [...buildDashedIconLine(fixedPoint.anchor, PlotlyDrawings.cableSpanManip), icon]
      : [icon];
  });

/**
 * Creates the Plotly shapes of the calculated cable span manipulations on the 2D section plot: their dashed lines.
 *
 * @remarks
 * Shapes do not exist in 3D, where {@link createCableSpanManipAnnotations} draws the dashed lines.
 *
 * @category Studio
 * @param plotParams - The plot parameters (view, side, support range, lit data, supports).
 * @returns One dashed line shape per drawn manipulation, or `[]` in 3D.
 */
export const createCableSpanManipShapes = (plotParams: CreatePlotParams): Partial<Plotly.Shape>[] =>
  plotParams.view === '3d'
    ? []
    : resolveFixedPoints(plotParams).map(({ anchor }) =>
        buildDashedIconLineShape(anchor, PlotlyDrawings.cableSpanManip)
      );
