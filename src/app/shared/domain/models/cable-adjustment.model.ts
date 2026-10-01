/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Inputs of the cable adjustment calculation (angles in grades, distances in meters). */
export interface CableAdjustmentInputs {
  spanIndex: number;
  spanLength: number;
  leftHorizontalAngle: number;
  rightHorizontalAngle: number;
  leftVerticalAngle: number;
  rightVerticalAngle: number;
  support: 'LEFT' | 'RIGHT';
  tacheometerHorizontalDistance: number;
  adjustmentParameter: number;
}

/** Sighting angles (grades) at the mid-span sag returned by the cable adjustment calculation. */
export interface CableAdjustmentResult {
  horizontalSightAngle: number;
  verticalSightAngle: number;
}
