/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, Validators } from '@angular/forms';
import { CableAdjustmentInputs, CableAdjustmentResult, Section } from '@shared/domain';
import { maxDecimalsValidator } from '@shared/helpers/numberValidators';
import {
  ANGLE_DECIMALS,
  ANGLE_DEFAULT,
  ANGLE_MAX,
  ANGLE_MIN
} from '@features/studio/cable-adjustment/domain/cable-adjustment.constantes';
import {
  CableAdjustmentDisplayedResults,
  CableAdjustmentFormValue
} from '@features/studio/cable-adjustment/domain/cable-adjustment.interfaces';

/** Creates a support angle control: required, in [-200; 200] grades, 2 decimals, 0 by default. */
export function createAngleControl(): FormControl<number | null> {
  return new FormControl<number | null>(ANGLE_DEFAULT, [
    Validators.required,
    Validators.min(ANGLE_MIN),
    Validators.max(ANGLE_MAX),
    maxDecimalsValidator(ANGLE_DECIMALS)
  ]);
}

/** Length of the span starting at `spanIndex`, or null when unknown. */
export function getSpanLength(section: Section | null, spanIndex: number | null): number | null {
  if (spanIndex === null) return null;
  return section?.supports[spanIndex]?.spanLength ?? null;
}

/** Maps the form value to the engine inputs, or null while a required value is missing. */
export function toCableAdjustmentInputs(
  value: CableAdjustmentFormValue,
  spanLength: number | null
): CableAdjustmentInputs | null {
  const {
    span,
    leftHorizontalAngle,
    rightHorizontalAngle,
    leftVerticalAngle,
    rightVerticalAngle,
    support,
    tacheometerHorizontalDistance,
    adjustmentParameter
  } = value;
  if (
    span === null ||
    spanLength === null ||
    leftHorizontalAngle === null ||
    rightHorizontalAngle === null ||
    leftVerticalAngle === null ||
    rightVerticalAngle === null ||
    support === null ||
    tacheometerHorizontalDistance === null ||
    adjustmentParameter === null
  ) {
    return null;
  }
  return {
    spanIndex: span.index,
    spanLength,
    leftHorizontalAngle,
    rightHorizontalAngle,
    leftVerticalAngle,
    rightVerticalAngle,
    support,
    tacheometerHorizontalDistance,
    adjustmentParameter
  };
}

/** Rounds the engine sighting angles to the grade. */
export function toDisplayedResults(result: CableAdjustmentResult): CableAdjustmentDisplayedResults {
  return {
    horizontalSightAngle: Math.round(result.horizontalSightAngle),
    verticalSightAngle: Math.round(result.verticalSightAngle)
  };
}
