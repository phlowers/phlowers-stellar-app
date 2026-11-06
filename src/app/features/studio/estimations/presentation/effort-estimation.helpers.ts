/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CableEffortInputs, CableEffortResult } from '@shared/domain';
import { RESULT_DECIMALS } from '@features/studio/estimations/domain/effort-estimation.constantes';
import {
  EffortEstimationDisplayedResults,
  EffortEstimationFormValue
} from '@features/studio/estimations/domain/effort-estimation.interfaces';

/** Maps the form value to the engine inputs, or null while a required value is missing. */
export function toCableEffortInputs(value: EffortEstimationFormValue): CableEffortInputs | null {
  const { span, referenceSupport, distanceToReferenceSupport, temperature, direction, targetDisplacement } = value;
  if (
    span === null ||
    referenceSupport === null ||
    distanceToReferenceSupport === null ||
    temperature === null ||
    targetDisplacement === null
  ) {
    return null;
  }
  return {
    spanIndex: span.index,
    referenceSupport,
    distanceToReferenceSupport,
    temperature,
    targetDisplacement,
    direction
  };
}

/** Rounds a value to the display decimals; adding 0 turns -0 into 0. */
export function roundResult(value: number): number {
  const factor = 10 ** RESULT_DECIMALS;
  return Math.round(value * factor) / factor + 0;
}

/** Brings the engine results to the displayed format. */
export function toDisplayedResults(result: CableEffortResult): EffortEstimationDisplayedResults {
  return {
    effort: roundResult(result.effort),
    xDisplacement: roundResult(result.xDisplacement)
  };
}

/** Text copied to the clipboard for a displayed result: the value as shown, without unit. */
export function formatResultForClipboard(value: number): string {
  return roundResult(value).toFixed(RESULT_DECIMALS);
}
