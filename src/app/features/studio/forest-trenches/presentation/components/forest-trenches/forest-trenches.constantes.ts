/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const FOREST_TRENCHES_PLOT_ID = 'forest-trenches-plot';

export const FOREST_TRENCHES_PLOT_COLORS = {
  axis: '#000000'
} as const;

/** Small thin cross drawn on the line axis at every ground slicing point. */
export const FOREST_TRENCHES_AXIS_POINT_MARKER = {
  symbol: 'x-thin',
  size: 7,
  lineWidth: 1.5
} as const;
