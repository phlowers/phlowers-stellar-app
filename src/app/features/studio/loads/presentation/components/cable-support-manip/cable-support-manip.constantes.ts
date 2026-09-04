/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ValidatorFn, Validators } from '@angular/forms';
import { maxDecimalsValidator } from '@shared/helpers/numberValidators';

/** Input bounds for cable-support manipulation numeric fields. */
export const CABLE_SUPPORT_MANIP_BOUNDS = {
  vertDisplacement: { step: 0.01, min: -150, max: 50 },
  lateralDistance: { step: 0.01, min: -50, max: 50 },
  ropeLength: { step: 0.01, min: 0, max: 50 },
  shiftingClampLength: { step: 0.01, min: -10, max: 10 }
} as const;

/**
 * Produces [required, min, max, maxDecimals] ValidatorFns; required/min/max are active only when
 * guard() returns true, while the two-decimal format check always applies.
 * Intended for distance fields that are conditionally mandatory based on a reactive signal.
 */
export function conditionalRangeValidators(
  guard: () => boolean,
  bounds: { readonly min: number; readonly max: number }
): ValidatorFn[] {
  return [
    (ctrl) => (guard() ? Validators.required(ctrl) : null),
    (ctrl) => (guard() ? Validators.min(bounds.min)(ctrl) : null),
    (ctrl) => (guard() ? Validators.max(bounds.max)(ctrl) : null),
    maxDecimalsValidator(2)
  ];
}
