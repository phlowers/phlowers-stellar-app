/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const TARGET_DISTANCE_MIN = 0;
export const TARGET_DISTANCE_MAX = 150;
export const TARGET_DISTANCE_DECIMALS = 2;

export const TEMPERATURE_INPUT_LIMITS = {
  targetDistance: { min: TARGET_DISTANCE_MIN, max: TARGET_DISTANCE_MAX, step: 10 ** -TARGET_DISTANCE_DECIMALS }
} as const;
