/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Dash, Data, PlotData } from 'plotly.js-dist-min';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { getLine, getMarker } from '@shared/components/studio/section/helpers/createPlotDataObject';
import { PlotObjectsType, Side, View } from '@shared/types/plot.types';

const RGBA_PATTERN = /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/;

/**
 * Color of the shadow traces, and the trace opacity that goes with it.
 *
 * @remarks
 * Every shadow trace uses the span shadow color, alpha included. The 2D view (SVG) draws it as is. Plotly's WebGL
 * renderer (3D) does not apply the alpha of a color: it blends the color as if its alpha was already applied, which
 * washes it out. In 3D, an `rgba()` color is therefore split into its opaque color and its alpha, given as the trace
 * opacity: the only transparency WebGL blends correctly. Either way the alpha is applied once, never stacked.
 */
const getShadowLook = (view: View): { color: string; opacity?: number } => {
  if (view === '2d') return { color: PlotlyDrawings.span.shadow.color2d };
  const color = PlotlyDrawings.span.shadow.color3d;
  const rgba = RGBA_PATTERN.exec(color);
  return rgba ? { color: `rgb(${rgba[1]}, ${rgba[2]}, ${rgba[3]})`, opacity: Number(rgba[4]) } : { color };
};

/**
 * Creates line style for shadow traces.
 * Uses the same width as normal traces for a perfect overlay, in the shadow color.
 */
const getShadowLine = (
  type: PlotObjectsType,
  view: View,
  color: string
): {
  color: string;
  dash: Dash;
  width: number;
} => ({ ...getLine(type, view), color });

/** Creates marker style for shadow traces: same size as normal traces, in the shadow color. */
const getShadowMarker = (type: PlotObjectsType, view: View, color: string): PlotData['marker'] => ({
  ...getMarker(type, view),
  color
});

/**
 * Creates an array of shadow Plotly data objects from raw 3D coordinate arrays
 * for a specific section object type. Shadow objects use a uniform, translucent color
 * to serve as background reference traces.
 * @category Studio
 * @param data - Array of polyline coordinate arrays (`[x, y, z][][]`).
 * @param startSupport - Zero-based index of the first support to include.
 * @param endSupport - Zero-based index of the last support to include.
 * @param type - The section object type being rendered.
 * @param view - The rendering dimension (`'2d'` or `'3d'`).
 * @param side - The viewing side (`'profile'` or `'face'`).
 * @returns An array of Plotly `Data` entries for shadow traces.
 */
export const createShadowDataObject = (
  data: number[][][],
  startSupport: number,
  endSupport: number,
  type: PlotObjectsType,
  view: View,
  side: Side
): Data[] => {
  const slidedData = data.slice(startSupport, type === 'spans' ? endSupport : endSupport + 1);
  const shadow = getShadowLook(view);
  return slidedData.map((points) => {
    const x = points.map((point) => point[0]);
    const y = points.map((point) => point[1]);
    const z = points.map((point) => point[2]);
    const dataObject: Data = {
      x: side === 'face' && view === '2d' ? y : x,
      z: view === '3d' ? z : y,
      y: view === '3d' ? y : z,
      type: view === '3d' ? 'scatter3d' : 'scatter',
      mode: 'lines+markers',
      line: getShadowLine(type, view, shadow.color),
      marker: getShadowMarker(type, view, shadow.color),
      ...(shadow.opacity !== undefined && { opacity: shadow.opacity }),
      hoverinfo: 'skip',
      showlegend: false,
      name: `Base ${type}`
    };
    return dataObject;
  });
};
