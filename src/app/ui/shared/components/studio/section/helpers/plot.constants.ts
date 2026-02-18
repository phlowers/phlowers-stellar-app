/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Color constants for plot traces
 */
export const SPAN_COLOR = 'dodgerblue';
export const SPAN_COLOR_RGB = '30,144,255'; // RGB values for dodgerblue
export const SHADOW_OPACITY = 0.3;

/**
 * Returns the shadow color.
 * For 2D: rgba() with opacity.
 * For 3D: base color (opacity is applied at trace level for scatter3d).
 */
export const getShadowColor = (view: '2d' | '3d'): string => {
  return view === '3d'
    ? SPAN_COLOR
    : `rgba(${SPAN_COLOR_RGB},${SHADOW_OPACITY})`;
};
