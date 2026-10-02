/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Span selected in the cable adjustment form. */
export interface CableAdjustmentSpan {
  index: number;
  uuid: string;
}

/** Form controls holding a support angle (grades). */
export type CableAdjustmentAngleControl =
  'leftHorizontalAngle' | 'rightHorizontalAngle' | 'leftVerticalAngle' | 'rightVerticalAngle';

/** Display metadata of an angle input. */
export interface CableAdjustmentAngleField {
  controlName: CableAdjustmentAngleControl;
  /** DOM id, also used as data-testid prefix. */
  id: string;
  labelKey: string;
}

/** Side of the selected span the tacheometer measures from. */
export type CableAdjustmentSupportSide = 'LEFT' | 'RIGHT';

/** Option of the support list. */
export interface CableAdjustmentSupportOption {
  labelKey: string;
  value: CableAdjustmentSupportSide;
}

/** Raw value of the cable adjustment form (disabled controls included). */
export interface CableAdjustmentFormValue {
  span: CableAdjustmentSpan | null;
  leftHorizontalAngle: number | null;
  rightHorizontalAngle: number | null;
  leftVerticalAngle: number | null;
  rightVerticalAngle: number | null;
  support: CableAdjustmentSupportSide | null;
  tacheometerHorizontalDistance: number | null;
  adjustmentParameter: number | null;
}

/** Sighting angles displayed in the results frame, rounded to the grade. */
export interface CableAdjustmentDisplayedResults {
  horizontalSightAngle: number;
  verticalSightAngle: number;
}
