/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Plotly, { PlotlyHTMLElement } from 'plotly.js-dist-min';

export {
  attachPlotEventListeners,
  getPixelOffset,
  isOutsidePlotBounds,
  toMousePosition
} from '../free-positioning/free-positioning.helpers';

/**
 * Extracts all finite Y values from a plot's traces.
 */
export const extractYValues = (plot: PlotlyHTMLElement): number[] =>
  plot.data
    .flatMap((trace) => {
      const y = (trace as Plotly.ScatterData).y;
      if (y == null) return [];
      return Array.from(y as ArrayLike<number>);
    })
    .filter((v) => typeof v === 'number' && Number.isFinite(v));

/**
 * Computes a padded [min, max] range from an array of Y values.
 * Returns null if the array is empty.
 */
export const computePaddedYRange = (yValues: number[]): [number, number] | null => {
  if (yValues.length === 0) return null;

  let minY = Infinity;
  let maxY = -Infinity;
  for (const v of yValues) {
    if (v < minY) minY = v;
    if (v > maxY) maxY = v;
  }
  const padding = Math.max((maxY - minY) * 0.05, 1);
  return [minY - padding, maxY + padding];
};

/**
 * Applies a shared Y axis range to the given plots.
 */
export const applySharedYRange = (plots: PlotlyHTMLElement[], range: [number, number]): void => {
  for (const plot of plots) {
    void Plotly.relayout(plot, { 'yaxis.range': range, 'yaxis.autorange': false });
  }
};
