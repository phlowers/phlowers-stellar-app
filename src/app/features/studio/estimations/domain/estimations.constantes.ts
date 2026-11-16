/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { EstimationTab, EstimationTabValue } from '@features/studio/estimations/domain/estimations.interfaces';

export const TARGET_DISTANCE_DECIMALS = 2;
// Strictly positive: the smallest value with 2 decimals. The engine accepts a zero distance but never
// reaches it (the cable cannot touch the obstacle point): it answers EstimationNotConvergedError.
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

export const CABLE_TEMPERATURE_DECIMALS = 2;

/** Cable temperature (°C) entered for an estimation: the conformity temperature range. */
export const CABLE_TEMPERATURE_LIMITS = {
  min: CONFORMITY_TEMPERATURE_BOUNDS[0],
  max: CONFORMITY_TEMPERATURE_BOUNDS[1],
  step: 10 ** -CABLE_TEMPERATURE_DECIMALS
} as const;

/** Search interval (Pa) of the wind pressure giving the minimum distance, also its displayed range. */
export const MINIMUM_DISTANCE_WIND_PRESSURE_BOUNDS: readonly [number, number] = [-3000, 3000];

/** Number format of the wind pressure giving the minimum distance: no decimal. */
export const MINIMUM_DISTANCE_WIND_PRESSURE_FORMAT = '1.0-0';

/** Number format of the minimum oblique distance: always 2 decimals. */
export const MINIMUM_OBLIQUE_DISTANCE_FORMAT = '1.2-2';

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
    disabled: false,
    testId: 'wind-pressure-tab'
  },
  {
    value: 'vertical-effort',
    labelKey: 'studio.estimations.vertical-effort-tab',
    disabled: true,
    testId: 'vertical-effort-tab'
  }
];
