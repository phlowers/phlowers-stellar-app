/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  EstimateEffortInputs,
  EstimationResult,
  GetLoadPointsInputs,
  TaskOutputs,
  Task
} from '@services/worker_python/tasks/types';
import { RESULT_DECIMALS } from '@features/studio/estimations/domain/effort-estimation.constantes';
import {
  EffortEstimationFormValue,
  EffortEstimationResults
} from '@features/studio/estimations/domain/effort-estimation.interfaces';

/**
 * Maps the form value to the estimateEffort task inputs, or null while a required value or the span length is
 * missing. The engine measures the load position from the left support and the displacement upward.
 */
export function toEstimateEffortInputs(
  value: EffortEstimationFormValue,
  spanLength: number | null
): EstimateEffortInputs | null {
  const { span, referenceSupport, distanceToReferenceSupport, temperature, direction, targetDisplacement } = value;
  if (
    span === null ||
    spanLength === null ||
    referenceSupport === null ||
    distanceToReferenceSupport === null ||
    temperature === null ||
    targetDisplacement === null
  ) {
    return null;
  }
  return {
    spanIndex: span.index,
    loadPositionDistance:
      referenceSupport === 'LEFT' ? distanceToReferenceSupport : spanLength - distanceToReferenceSupport,
    temperature,
    targetVerticalDisplacement: direction === 'UP' ? targetDisplacement : -targetDisplacement
  };
}

/** Inputs locating the load application point without load and with the estimated mass. */
export function toGetLoadPointsInputs(inputs: EstimateEffortInputs, loadMass: number): GetLoadPointsInputs {
  const { spanIndex, loadPositionDistance, temperature } = inputs;
  return { spanIndex, loadPositionDistance, temperature, loadMasses: [0, loadMass] };
}

/**
 * Builds the results from the estimated mass and the load points without load and with this mass. The mass in kg
 * is given in daN (1 daN = 1 kg under the 10 m/s² convention).
 */
export function toEffortEstimationResults(
  estimation: EstimationResult,
  loadPoints: TaskOutputs[Task.getLoadPoints]
): EffortEstimationResults {
  const [unloadedPoint, loadedPoint] = loadPoints.points;
  return {
    effort: estimation.value,
    xDisplacement: Math.abs(loadedPoint[0] - unloadedPoint[0])
  };
}

/** Rounds a value to the display decimals; adding 0 turns -0 into 0. */
export function roundResult(value: number): number {
  const factor = 10 ** RESULT_DECIMALS;
  return Math.round(value * factor) / factor + 0;
}

/** Brings the results to the displayed format. */
export function toDisplayedResults(result: EffortEstimationResults): EffortEstimationResults {
  return {
    effort: roundResult(result.effort),
    xDisplacement: roundResult(result.xDisplacement)
  };
}

/** Text copied to the clipboard for a displayed result: the value as shown, without unit. */
export function formatResultForClipboard(value: number): string {
  return roundResult(value).toFixed(RESULT_DECIMALS);
}

/**
 * Validator rejecting values above the length of the selected span. It reports the same `max` error as
 * `Validators.max` and does nothing while the span length is unknown.
 */
export function maxSpanLengthValidator(getSpanLength: () => number | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const max = getSpanLength();
    if (max === null || control.value === null || control.value === undefined || control.value === '') {
      return null;
    }
    return control.value > max ? { max: { max, actual: control.value } } : null;
  };
}
