/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { MousePosition, PlotElement, PlotLayout } from './free-positioning.interfaces';

/** Pixel offset of a mouse event within a plot's drawing area (mouse position minus the layout margin). */
export const getPixelOffset = (evt: MouseEvent, layout: PlotLayout): { x: number; y: number } => ({
  x: evt.layerX - layout.margin.l,
  y: evt.layerY - layout.margin.t
});

/** Whether a pixel offset falls outside the plot's drawing area (margins excluded). */
export const isOutsidePlotBounds = (x: number, y: number, layout: PlotLayout, plotElement: PlotElement): boolean => {
  const plotWidth = plotElement.clientWidth - layout.margin.l - layout.margin.r;
  const plotHeight = plotElement.clientHeight - layout.margin.t - layout.margin.b;
  return x < 0 || x > plotWidth || y < 0 || y > plotHeight;
};

/** Converts a pixel offset to the plot's data coordinates, formatted for display. */
export const toMousePosition = (layout: PlotLayout, x: number, y: number): MousePosition => ({
  x: Number(layout.xaxis.p2c(x)).toFixed(1),
  z: Number(layout.yaxis.p2c(y)).toFixed(1)
});

/**
 * Attaches mousemove/click listeners to a plot element and returns a function to detach them.
 * Plot containers are static template elements that survive Plotly.purge(), so listeners must be
 * removed on every recreation — otherwise each refresh adds another handler.
 */
export const attachPlotEventListeners = (
  plotElement: PlotElement,
  handlers: { onMouseMove: (evt: MouseEvent) => void; onClick: (evt: MouseEvent) => void }
): (() => void) => {
  plotElement.addEventListener('mousemove', handlers.onMouseMove);
  plotElement.addEventListener('click', handlers.onClick);
  return () => {
    plotElement.removeEventListener('mousemove', handlers.onMouseMove);
    plotElement.removeEventListener('click', handlers.onClick);
  };
};
