/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  LeftSupportState,
  TangentAimingFieldRule,
  TangentAimingRuleField
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.interfaces';

/** Bounds, decimals and default of each kind of numeric input, shared by every tangent aiming form. */
export const TANGENT_AIMING_FIELD_RULES: Record<TangentAimingRuleField, TangentAimingFieldRule> = {
  spanLength: { min: 0, max: 5000, decimals: 2, default: 0 },
  hAccDistance: { min: 0, max: 1000, decimals: 2, default: 0 },
  verticalAccAngle: { min: -200, max: 200, decimals: 2, default: 0 },
  parameter: { min: 20, max: 5000, decimals: 0, default: 20 },
  tangentAngle: { min: -200, max: 200, decimals: 2, default: 0 }
};

/** Left support tracking before any resolution. */
export const INITIAL_LEFT_SUPPORT_STATE: LeftSupportState = { previous: null, memory: {} };
