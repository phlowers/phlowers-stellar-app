/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Tells whether a mouse press is one that Plotly treats as a "right click" (Ctrl+press or right button).
 *
 * @param event - The `mousedown` event received on the plot container.
 */
export const isPlotlyRightClickPress = (event: Pick<MouseEvent, 'ctrlKey' | 'buttons'>): boolean =>
  event.ctrlKey || event.buttons === 2;

/**
 * Works around a Plotly bug that makes a Ctrl+drag (or right-button drag) on a 2D plot reject with
 * `undefined` (`WARN: Relayout fail.` in the console, surfaced as an "unexpected error" by the app).
 *
 * @remarks
 * Plotly's `dragelement` treats Ctrl+press and right-button press as a "right click": its `mousemove`
 * handler does not pan, but it still flags the gesture as dragged. At `mouseup`, the drag-done handler
 * then calls `Plotly.relayout()` with an undefined update, which fails.
 *
 * The press itself is left untouched, so clicks, hover and the context menu keep working. Only the
 * `mousemove` events that follow are hidden from Plotly (capture phase on `window`, before Plotly's
 * `document` listener) until the button is released. Plotly then sees a click instead of a drag.
 *
 * @example Minimal reproduction with Plotly only
 * ```html
 * <div id="g" style="width:600px;height:400px"></div>
 * <script src="https://cdn.plot.ly/plotly-3.0.0.min.js"></script>
 * <script>
 *   Plotly.newPlot('g', [{ x: [0, 1, 2], y: [0, 1, 0] }], { dragmode: 'pan' });
 * </script>
 * <!-- Hold Ctrl, press on the plot, move a few pixels, release:
 *      the console logs "Relayout fail." and an unhandled rejection with `undefined`. -->
 * ```
 *
 * @param target - Window on which the temporary listeners are registered.
 */
export const hidePlotlyDragMoves = (target: Pick<Window, 'addEventListener' | 'removeEventListener'>): void => {
  const swallowMove = (moveEvent: Event): void => moveEvent.stopPropagation();
  const release = (): void => {
    target.removeEventListener('mousemove', swallowMove, true);
    target.removeEventListener('mouseup', release, true);
  };
  target.addEventListener('mousemove', swallowMove, true);
  target.addEventListener('mouseup', release, true);
};
