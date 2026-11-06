/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as Plotly from 'plotly.js-dist-min';
import { CableSupportManipulation } from '@shared/domain';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { CreatePlotParams } from './createPlot';
import { CableSupportManipAnnotationData } from './createCableSupportManipAnnotations.interfaces';
import { buildClickableIconAnnotation } from './createClickableIconAnnotation';
import { findSupportTop, mapAnchorToAxes } from './spanAnchor.helpers';

/**
 * Creates Plotly annotation objects representing saved cable support manipulations on the section plot.
 *
 * @remarks
 * Pure function (no DI, no side effects) so it can be unit-tested in isolation.
 * One clickable icon per manipulation, drawn like the load icons (solid arrow line without head, FontAwesome glyph
 * in a border), in its own `PlotlyDrawings.cableSupportManip` look. The arrow tail is anchored on the top of the
 * support the manipulation applies to, and only supports currently visible are drawn
 * (`startSupport` ≤ index ≤ `endSupport`, like the support traces).
 *
 * The manipulations are expected to belong to the displayed load case: the caller filters them.
 *
 * @category Studio
 * @param plotParams - The plot parameters (view, side, support range, lit data).
 * @param cableSupportManips - The saved cable support manipulations to render.
 * @param supportUuidToIndex - Lookup mapping a `supportUuid` to its absolute support index.
 * @returns An array of Plotly `Annotations`, one icon per drawn manipulation.
 */
export const createCableSupportManipAnnotations = (
  plotParams: CreatePlotParams,
  cableSupportManips: readonly CableSupportManipulation[],
  supportUuidToIndex: ReadonlyMap<string, number>
): Partial<Plotly.Annotations>[] => {
  const { side, view, startSupport, endSupport, litData } = plotParams;
  const annotations: Partial<Plotly.Annotations>[] = [];

  cableSupportManips.forEach((manip) => {
    const supportIndex = supportUuidToIndex.get(manip.supportUuid);
    if (supportIndex === undefined || supportIndex < startSupport || supportIndex > endSupport) return;

    const top = findSupportTop(litData.coords.supports?.[supportIndex]);
    if (!top) return;

    const { x, y, z } = mapAnchorToAxes(top, view, side);
    annotations.push(
      buildClickableIconAnnotation({
        arrowTipX: x,
        arrowTipY: y,
        arrowTipZ: z,
        icon: PlotlyDrawings.cableSupportManip.icon,
        iconSize: PlotlyDrawings.cableSupportManip.iconSize[view],
        borderPad: PlotlyDrawings.cableSupportManip.borderPad[view],
        arrowWidth: PlotlyDrawings.cableSupportManip.arrowWidth[view],
        color: PlotlyDrawings.cableSupportManip.unselected.color,
        arrowYOffset: PlotlyDrawings.cableSupportManip.arrowYOffset,
        data: {
          type: 'cableSupportManip',
          supportUuid: manip.supportUuid,
          cableSupportManipUuid: manip.uuid
        } satisfies CableSupportManipAnnotationData
      })
    );
  });

  return annotations;
};
