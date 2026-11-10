/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { EstimationTab, EstimationTabValue } from '@features/studio/estimations/domain/estimations.interfaces';

export const TARGET_DISTANCE_DECIMALS = 2;
// Strictly positive: the smallest value with 2 decimals (the engine rejects a zero distance)
export const TARGET_DISTANCE_MIN = 10 ** -TARGET_DISTANCE_DECIMALS;
export const TARGET_DISTANCE_MAX = 150;

export const TARGET_DISTANCE_LIMITS = {
  min: TARGET_DISTANCE_MIN,
  max: TARGET_DISTANCE_MAX,
  step: 10 ** -TARGET_DISTANCE_DECIMALS
} as const;

/** Search interval (°C) of the conformity temperature, also its displayed range. */
export const CONFORMITY_TEMPERATURE_BOUNDS: readonly [number, number] = [-50, 250];

/** Number format of the conformity temperature: always 2 decimals. */
export const CONFORMITY_TEMPERATURE_FORMAT = '1.2-2';

export const DEFAULT_ESTIMATION_TAB: EstimationTabValue = 'temperature';

export const ESTIMATION_TABS: readonly EstimationTab[] = [
  {
    value: 'temperature',
    labelKey: 'studio.estimations.conformity-temperature-label',
    disabled: false,
    testId: 'temperature-tab'
  },
  {
    value: 'wind-pressure',
    labelKey: 'studio.estimations.wind-pressure-tab',
    disabled: true,
    testId: 'wind-pressure-tab'
  },
  {
    value: 'vertical-effort',
    labelKey: 'studio.estimations.vertical-effort-tab',
    disabled: true,
    testId: 'vertical-effort-tab'
  }
];
