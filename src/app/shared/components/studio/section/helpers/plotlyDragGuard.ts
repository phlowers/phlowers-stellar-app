/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Tells whether a mouse press must be hidden from Plotly on a 2D (cartesian) plot.
 *
 * @remarks
 * Plotly treats Ctrl+press and right-button press as a "right click": it skips the pan/zoom move
 * handler but still runs the drag-done handler, which then calls `Plotly.relayout()` with an
 * undefined update. That logs `Relayout fail.` and rejects with `undefined`, surfacing as an
 * "unexpected error" in the app. These gestures have no meaning in the studio, so they are ignored.
 *
 * @param event - The `mousedown` event received on the plot container.
 * @returns `true` when the event must not reach Plotly.
 */
export const shouldBlockPlotlyDrag = (event: Pick<MouseEvent, 'ctrlKey' | 'buttons'>): boolean =>
  event.ctrlKey || event.buttons === 2;
