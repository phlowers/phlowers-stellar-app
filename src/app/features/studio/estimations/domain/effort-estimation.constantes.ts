/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CableEffortDirection } from '@shared/domain';
import { EffortEstimationDirectionOption } from '@features/studio/estimations/domain/effort-estimation.interfaces';

export const DISTANCE_MIN = -100;
export const DISTANCE_MAX = 5000;
export const DISTANCE_DECIMALS = 2;
export const DISTANCE_DEFAULT = 0;

export const TEMPERATURE_MIN = -50;
export const TEMPERATURE_MAX = 250;
export const TEMPERATURE_DECIMALS = 2;
export const TEMPERATURE_DEFAULT = 15;

export const DISPLACEMENT_MIN = 0;
export const DISPLACEMENT_MAX = 150;
export const DISPLACEMENT_DECIMALS = 0;
export const DISPLACEMENT_DEFAULT = 0;

export const RESULT_DECIMALS = 2;

export const DEFAULT_DIRECTION: CableEffortDirection = 'UP';

export const INPUT_LIMITS = {
  distance: { min: DISTANCE_MIN, max: DISTANCE_MAX, step: 10 ** -DISTANCE_DECIMALS },
  temperature: { min: TEMPERATURE_MIN, max: TEMPERATURE_MAX, step: 10 ** -TEMPERATURE_DECIMALS },
  displacement: { min: DISPLACEMENT_MIN, max: DISPLACEMENT_MAX, step: 1 }
} as const;

export const DIRECTION_OPTIONS: EffortEstimationDirectionOption[] = [
  { labelKey: 'studio.effort-estimation.up', value: 'UP' },
  { labelKey: 'studio.effort-estimation.down', value: 'DOWN' }
];
