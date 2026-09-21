/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FreePositioningCategory } from './free-positioning.interfaces';

/** Shared by every free-positioning plot: obstacle, floor, loads, and distance. */
export const DEBOUNCED_REFRESH_STUDIO_DELAY = 400;
export const DEBOUNCED_UPDATE_SELECTED_POSITION_MARKERS_DELAY = 100;

export const FREE_POSITIONING_CATEGORIES: readonly FreePositioningCategory[] = [
  'obstacle',
  'floor',
  'distance',
  'loads'
] as const;

export const CATEGORY_COLORS: Record<FreePositioningCategory, string> = {
  obstacle: '#e11d48',
  floor: '#16a34a',
  distance: '#2563eb',
  loads: '#9333ea'
};

export const CATEGORY_SYMBOLS: Record<FreePositioningCategory, string> = {
  obstacle: 'circle',
  floor: 'triangle-up',
  distance: 'diamond',
  loads: 'square'
};

export const EDITABLE_POINT_COLOR = '#dc2626';
export const EDITABLE_POINT_SIZE = 14;
export const DEFAULT_POINT_SIZE = 10;
export const POINT_SELECTION_PIXEL_RADIUS = 15;

export const CORE_FREE_POSITIONING_PLOT_IDS = {
  PROFILE: 'plotly-output-free-positioning-profile',
  FACE: 'plotly-output-free-positioning-face'
} as const;
