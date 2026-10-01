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
import { mapAnchorToAxes, resolveAnchorCoord } from './spanAnchor';

type MappedAnchor = ReturnType<typeof mapAnchorToAxes>;

// Highest point of a support: the one its number is written on
const findSupportTop = (support: number[][] | undefined): number[] | null =>
  support?.length ? support.reduce((top, point) => (point[2] > top[2] ? point : top)) : null;

/**
 * Resolves the point the marking hangs from.
 *
 * @remarks
 * Without a distance, the marking stands above the reference support itself. With one, it hangs from the exact
 * point of the cable at that distance, found like the anchor of a cable modification or of a punctual load.
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
 * Dashed line from the anchor point up to the icon.
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

// Clicking the icon opens the RRTS tool: the hover label is also what makes it capture mouse events
const buildIcon = (
  anchor: MappedAnchor,
  translocoService?: CreatePlotParams['translocoService']
): Partial<Plotly.Annotations> =>
  ({
    ...atAnchor(anchor),
    showarrow: false,
    yshift: CUT_STRANDS_OFFSET_Y,
    text: CUT_STRANDS_ICON,
    hovertext: getCutStrandsLabel(translocoService),
    hoverlabel: {
      bgcolor: CUT_STRANDS_COLOR,
      bordercolor: CUT_STRANDS_COLOR,
      font: { color: CUT_STRANDS_HOVER_TEXT_COLOR }
    },
    bordercolor: CUT_STRANDS_COLOR,
    borderpad: CUT_STRANDS_ICON_PADDING,
    bgcolor: 'rgba(0,0,0,0)',
    font: {
      family: 'FontAwesome',
      color: CUT_STRANDS_COLOR,
      size: CUT_STRANDS_ICON_SIZE
    },
    data: { type: 'cutStrands' } satisfies CutStrandsAnnotationData
  }) as Partial<Plotly.Annotations>;

/**
 * Creates the Plotly annotations of the RRTS cut strands marking on the section plot: a scissors icon,
 * {@link CUT_STRANDS_OFFSET_Y} px above its anchor point and joined to it by a dashed line.
 *
 * @remarks
 * Pure function (no DI, no side effects) so it can be unit-tested in isolation.
 * Nothing is drawn unless the saved cut strands ask for a marking and are linked to a span that is
 * currently visible (within `startSupport` ≤ index < `endSupport`).
 *
 * The icon shows a "Cut strands" label on hover, and opens the RRTS tool when clicked (see `SectionPlotComponent`).
 *
 * @category Studio
 * @param plotParams - The plot parameters (view, side, support range, lit data, saved cut strands).
 * @returns The dashed line annotations followed by the icon annotation, or `[]` when there is no marking to draw.
 */
export const createCutStrandsAnnotations = (plotParams: CreatePlotParams): Partial<Plotly.Annotations>[] => {
  const { cutStrands, spanUuidToIndex, startSupport, endSupport, litData, view, side } = plotParams;
  if (!cutStrands?.addMarking || !cutStrands.spanUuid) return [];

  const spanIndex = spanUuidToIndex?.get(cutStrands.spanUuid);
  if (spanIndex === undefined || spanIndex < startSupport || spanIndex >= endSupport) return [];

  const anchor = resolveAnchor(litData, spanIndex, cutStrands);
  if (!anchor) return [];

  const mapped = mapAnchorToAxes(anchor, view, side);
  return [...buildDashedLine(mapped), buildIcon(mapped, plotParams.translocoService)];
};
