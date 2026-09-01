/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Directive } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { oneDecimalValidator, twoDecimalValidator } from '@shared/helpers/numberValidators';

/** Template-driven forms (`ngModel`) counterpart of `oneDecimalValidator`, applied via `appOneDecimal`. */
@Directive({
  selector: '[appOneDecimal]',
  standalone: true,
  providers: [{ provide: NG_VALIDATORS, useExisting: OneDecimalValidatorDirective, multi: true }]
})
export class OneDecimalValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    return oneDecimalValidator(control);
  }
}

/** Template-driven forms (`ngModel`) counterpart of `twoDecimalValidator`, applied via `appTwoDecimals`. */
@Directive({
  selector: '[appTwoDecimals]',
  standalone: true,
  providers: [{ provide: NG_VALIDATORS, useExisting: TwoDecimalValidatorDirective, multi: true }]
})
export class TwoDecimalValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    return twoDecimalValidator(control);
  }
}
