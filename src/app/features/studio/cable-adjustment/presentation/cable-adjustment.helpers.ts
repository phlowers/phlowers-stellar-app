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
  CableAdjustmentFormValue,
  CableAdjustmentSpan
} from '@features/studio/cable-adjustment/domain/cable-adjustment.interfaces';

/** Creates a required number control bounded to [min; max] with at most `decimals` decimals. */
export function createNumberControl(
  min: number,
  max: number,
  decimals: number,
  value: number | null = null
): FormControl<number | null> {
  return new FormControl<number | null>(value, [
    Validators.required,
    Validators.min(min),
    Validators.max(max),
    maxDecimalsValidator(decimals)
  ]);
}

/** Creates a support angle control: required, in [-200; 200] grades, 2 decimals, 0 by default. */
export function createAngleControl(): FormControl<number | null> {
  return createNumberControl(ANGLE_MIN, ANGLE_MAX, ANGLE_DECIMALS, ANGLE_DEFAULT);
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

/** Span option whose start support is the studio's current span, or null when there is none. */
export function findCurrentSpanOption<T extends { value: CableAdjustmentSpan | null }>(
  options: readonly T[],
  currentSpanIndex: number
): CableAdjustmentSpan | null {
  return options.find((option) => option.value?.index === currentSpanIndex)?.value ?? null;
}

/** Wraps an angle (grades) into ]-200; 200] and rounds it to the input decimals. */
export function wrapAngle(angle: number): number {
  const wrapped = angle - 2 * ANGLE_MAX * Math.ceil((angle - ANGLE_MAX) / (2 * ANGLE_MAX));
  const factor = 10 ** ANGLE_DECIMALS;
  // + 0 turns -0 into 0
  return Math.round(wrapped * factor) / factor + 0;
}

/** Brings the engine sighting angles to the format and limits of the input angles. */
export function toDisplayedResults(result: CableAdjustmentResult): CableAdjustmentDisplayedResults {
  return {
    horizontalSightAngle: wrapAngle(result.horizontalSightAngle),
    verticalSightAngle: wrapAngle(result.verticalSightAngle)
  };
}
