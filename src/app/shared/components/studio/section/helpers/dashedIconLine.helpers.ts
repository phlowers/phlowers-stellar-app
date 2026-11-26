/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import * as Plotly from 'plotly.js-dist-min';
import { View } from '@shared/types/plot.types';
import { DashedIconLineStyle } from './dashedIconLine.interfaces';
import { mapAnchorToAxes } from './spanAnchor.helpers';

type MappedAnchor = ReturnType<typeof mapAnchorToAxes>;

// Plotly's default annotation border width, which the icon keeps
const ICON_BORDER_WIDTH = 1;

/**
 * Length of the dashed line, from the anchor point up to the bottom edge of the icon box (pixels, whatever the zoom).
 *
 * @remarks
 * The icon box is centered `offsetY` px above the anchor. Its half height is half the glyph, its padding and its
 * border, taken up to the next whole pixel: Plotly sizes the glyph box from the font metrics, up to 1 px taller than
 * the icon size (13 px for a 12 px icon).
 *
 * @category Studio
 */
export const getDashedIconLineLength = (style: DashedIconLineStyle, view: View): number => {
  const iconHalfHeight = Math.floor(style.iconSize[view] / 2 + style.borderPad[view] + ICON_BORDER_WIDTH) + 1;
  return style.offsetY - iconHalfHeight;
};

/**
 * Dashed line of the 3D view, from the anchor point up to the icon.
 *
 * @remarks
 * A Plotly annotation arrow cannot be dashed, and shapes do not exist in 3D. Each dash is therefore its own
 * arrow-only annotation: its tail sits `end` pixels above the anchor and `standoff` pulls its tip `start` pixels
 * away from the anchor. Both offsets are in pixels, so the line keeps its length at any zoom level or camera angle.
 *
 * @category Studio
 */
export const buildDashedIconLine = (
  { x, y, z }: MappedAnchor,
  style: DashedIconLineStyle
): Partial<Plotly.Annotations>[] => {
  const dashes: Partial<Plotly.Annotations>[] = [];
  const lineLength = getDashedIconLineLength(style, '3d');
  for (let start = 0; start < lineLength; start += style.dashLength + style.dashGap) {
    const end = Math.min(start + style.dashLength, lineLength);
    dashes.push({
      xref: 'x',
      yref: 'y',
      x,
      y,
      // non-standard Plotly annotation property used for 3D rendering
      z,
      ax: 0,
      ay: -end,
      standoff: start,
      text: '',
      showarrow: true,
      // A dash, not an arrow: never a head
      arrowhead: 0,
      arrowcolor: style.unselected.color,
      arrowwidth: style.lineWidth['3d'],
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
 *
 * @category Studio
 */
export const buildDashedIconLineShape = (
  { x, y }: MappedAnchor,
  style: DashedIconLineStyle
): Partial<Plotly.Shape> => ({
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
  y1: getDashedIconLineLength(style, '2d'),
  line: {
    color: style.unselected.color,
    width: style.lineWidth['2d'],
    // Plotly takes a dash pattern in pixels, which its typings do not list
    dash: `${style.dashLength}px,${style.dashGap}px` as Plotly.Dash
  }
});
