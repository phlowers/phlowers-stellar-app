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
import { mapAnchorToAxes, resolveAnchorCoord } from './spanAnchor';

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
  side: CreatePlotParams['side'],
  translocoService?: CreatePlotParams['translocoService']
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
    text: getCableModificationLabel(modification.modificationType, translocoService),
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

    const anchor = resolveAnchorCoord(plotParams.litData, absoluteSpanIndex, modification);
    if (!anchor) return;

    annotations.push(
      buildIconAnnotation(anchor, modification, view, side),
      buildLabelAnnotation(anchor, modification, view, side, plotParams.translocoService)
    );
  });

  return annotations;
};
