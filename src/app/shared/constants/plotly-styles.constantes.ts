/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Catalog style names mapped to Plotly values. The catalog names are the Plotly names of today: if Plotly renames a
// value, only the mapped value changes here and the catalog files stay valid.

/** Marker symbols accepted in the catalog configuration. */
export const PLOTLY_MARKER_SYMBOLS: Readonly<Record<string, string>> = {
  circle: 'circle',
  'circle-open': 'circle-open',
  square: 'square',
  'square-open': 'square-open',
  diamond: 'diamond',
  'diamond-open': 'diamond-open',
  cross: 'cross',
  'cross-open': 'cross-open',
  x: 'x',
  'x-open': 'x-open',
  'triangle-up': 'triangle-up',
  'triangle-up-open': 'triangle-up-open',
  'triangle-down': 'triangle-down',
  'triangle-down-open': 'triangle-down-open',
  star: 'star',
  'star-open': 'star-open'
};

/** Connecting line styles accepted in the catalog configuration; `null` draws the markers only. */
export const PLOTLY_LINE_DASHES: Readonly<Record<string, string | null>> = {
  none: null,
  solid: 'solid',
  dot: 'dot',
  dash: 'dash',
  longdash: 'longdash',
  dashdot: 'dashdot',
  longdashdot: 'longdashdot'
};
