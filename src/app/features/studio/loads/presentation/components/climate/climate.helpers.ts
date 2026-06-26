/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Validator that rejects non-integer numeric values. */
export function integerValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === undefined) {
    return null;
  }
  const value = control.value;
  if (!Number.isInteger(value)) {
    return { integer: true };
  }
  return null;
}
