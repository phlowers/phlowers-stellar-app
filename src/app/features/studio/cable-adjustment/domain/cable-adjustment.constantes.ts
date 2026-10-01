/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  CableAdjustmentAngleField,
  CableAdjustmentSupportOption
} from '@features/studio/cable-adjustment/domain/cable-adjustment.interfaces';

export const ANGLE_MIN = -200;
export const ANGLE_MAX = 200;
export const ANGLE_DECIMALS = 2;
export const ANGLE_DEFAULT = 0;

export const DISTANCE_MIN = 0;
export const DISTANCE_MAX = 5000;
export const DISTANCE_DECIMALS = 2;

export const PARAMETER_MIN = 20;
export const PARAMETER_MAX = 5000;
export const PARAMETER_DECIMALS = 0;

export const SUPPORT_OPTIONS: readonly CableAdjustmentSupportOption[] = [
  { labelKey: 'common.left', value: 'LEFT' },
  { labelKey: 'common.right', value: 'RIGHT' }
];

export const ANGLE_FIELDS: readonly CableAdjustmentAngleField[] = [
  {
    controlName: 'leftHorizontalAngle',
    id: 'left-horizontal-angle',
    labelKey: 'studio.cable-adjustment.left-horizontal-angle-label'
  },
  {
    controlName: 'rightHorizontalAngle',
    id: 'right-horizontal-angle',
    labelKey: 'studio.cable-adjustment.right-horizontal-angle-label'
  },
  {
    controlName: 'leftVerticalAngle',
    id: 'left-vertical-angle',
    labelKey: 'studio.cable-adjustment.left-vertical-angle-label'
  },
  {
    controlName: 'rightVerticalAngle',
    id: 'right-vertical-angle',
    labelKey: 'studio.cable-adjustment.right-vertical-angle-label'
  }
];
