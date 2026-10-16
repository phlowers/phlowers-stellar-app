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

export const POINT_SELECTION_PIXEL_RADIUS = 15;
