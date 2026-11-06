/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Option of a select of the temperature estimation form. */
export interface TemperatureEstimationOption<T> {
  label: string;
  value: T;
}

/** Raw value of the temperature estimation form (disabled controls included). */
export interface TemperatureEstimationFormValue {
  obstacleUuid: string | null;
  pointIndex: number | null;
  targetDistance: number | null;
}
