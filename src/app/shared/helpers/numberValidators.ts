/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator factory rejecting values with more than `maxDecimals` decimal places. The error
 * count is nested (`{ maxDecimals: { maxDecimals } }`, mirroring `Validators.min`/`max`) rather
 * than used directly as the error value, because `0` decimals would otherwise be a falsy error
 * value and break both `AbstractControl.hasError()` and template truthy checks.
 */
export function maxDecimalsValidator(maxDecimals: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined) {
      return null;
    }
    const pattern = maxDecimals === 0 ? /^-?\d+$/ : new RegExp(`^-?\\d+(\\.\\d{1,${maxDecimals}})?$`);
    return pattern.test(control.value.toString()) ? null : { maxDecimals: { maxDecimals } };
  };
}
