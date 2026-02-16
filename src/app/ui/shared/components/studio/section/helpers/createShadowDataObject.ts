/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Dash, Data, PlotData } from 'plotly.js-dist-min';
import { getShadowColor, SHADOW_OPACITY } from './plot.constants';
import { PlotObjectsType, Side, View } from './types';

/**
 * Creates line style for shadow traces.
 * Uses same width as normal traces but with reduced opacity for overlay effect.
 * All shadow traces use the same color as spans (dodgerblue) for consistency.
 */
const getShadowLine = (
  view: View
): {
  color: string;
  dash: Dash;
  width: number;
} => {
  // Same width as normal traces (8 for 3d, 4 for 2d) for perfect overlay
  const width = view === '3d' ? 8 : 4;

  return {
    color: getShadowColor(view),
    dash: 'solid',
    width
  };
};

/**
 * Creates marker style for shadow traces.
 * Uses same size as normal traces but with reduced opacity.
 * All shadow traces use the same color as spans (dodgerblue) for consistency.
 */
const getShadowMarker = (
  type: PlotObjectsType,
  view: View
): PlotData['marker'] => {
  let size: number;
  switch (type) {
    case 'spans':
      size = view === '3d' ? 3 : 5;
      break;
    case 'supports':
      size = view === '3d' ? 3 : 4;
      break;
    case 'insulators':
      size = view === '3d' ? 4 : 6;
      break;
    default:
      size = 3;
  }
  return {
    size,
    opacity: SHADOW_OPACITY,
    color: getShadowColor(view)
  };
};

export const createShadowDataObject = (
  data: number[][][],
  startSupport: number,
  endSupport: number,
  type: PlotObjectsType,
  view: View,
  side: Side
): Data[] => {
  const slidedData = data.slice(
    startSupport,
    type === 'spans' ? endSupport : endSupport + 1
  );
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
      line: getShadowLine(view),
      marker: getShadowMarker(type, view),
      opacity: view === '3d' ? SHADOW_OPACITY : undefined,
      hoverinfo: 'skip',
      showlegend: false,
      name: `Base ${type}`
    };
    return dataObject;
  });
};
