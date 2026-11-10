/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Tabs of the estimations dialog. */
export type EstimationTabValue = 'temperature' | 'wind-pressure' | 'vertical-effort';

/** Display metadata of an estimations dialog tab. */
export interface EstimationTab {
  value: EstimationTabValue;
  labelKey: string;
  /** Tabs specified by another user story are shown but not usable yet. */
  disabled: boolean;
  testId: string;
}

/** Option of the obstacle select: the obstacle name, valued by its uuid. */
export interface EstimationObstacleOption {
  label: string;
  value: string;
}

/** Option of the obstacle point select, valued by the point index. */
export interface EstimationPointOption {
  label: string;
  value: number;
}

/** Raw value of the temperature estimation form. */
export interface TemperatureEstimationFormValue {
  obstacleUuid: string | null;
  pointIndex: number | null;
  targetDistance: number | null;
}
