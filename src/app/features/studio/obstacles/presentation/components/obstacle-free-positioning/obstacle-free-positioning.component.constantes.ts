/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { FreePositioningConfig } from '@features/studio/core/presentation/components/free-positioning-plot/free-positioning-plot.interfaces';

export const OBSTACLE_FREE_POSITIONING_CONFIG: FreePositioningConfig = {
  showFace: true,
  editableCategory: 'obstacle',
  defaultVisibleCategories: ['obstacle']
};

/** Transloco key for the warning shown when the obstacle frame differs from the forced fp frame. */
export const OBSTACLE_FP_FORCED_FRAME_WARNING_KEY = 'studio.obstacles-form.free-positioning-forced-frame-warning';
