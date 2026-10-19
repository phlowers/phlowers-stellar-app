/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup, Validators } from '@angular/forms';
import { createNumberControl } from '../tangent-aiming-support/tangent-aiming-support.helpers';
import {
  TANGENT_AIMING_EXTERIOR_COMMON_FIELDS,
  TANGENT_AIMING_EXTERIOR_RULE_FIELDS,
  TANGENT_AIMING_EXTERIOR_TYPE_FIELD
} from './tangent-aiming-exterior.constantes';
import {
  TangentAimingExteriorCalculationType,
  TangentAimingExteriorForm,
  TangentAimingExteriorInputField,
  TangentAimingExteriorNumericField
} from './tangent-aiming-exterior.interfaces';

function createControl(field: TangentAimingExteriorNumericField): FormControl<number | null> {
  return createNumberControl(TANGENT_AIMING_EXTERIOR_RULE_FIELDS[field]);
}

/** Creates the typed form holding every tangent aiming (exterior) input. */
export function createTangentAimingExteriorForm(): TangentAimingExteriorForm {
  return new FormGroup({
    leftSupport: new FormControl<string | null>(null, Validators.required),
    spanLength: createControl('spanLength'),
    hAccDistance: createControl('hAccDistance'),
    verticalAccAngleLeft: createControl('verticalAccAngleLeft'),
    verticalAccAngleRight: createControl('verticalAccAngleRight'),
    parameter: createControl('parameter'),
    tangentAngle: createControl('tangentAngle')
  });
}

/** Inputs displayed for the given calculation type. */
export function getDisplayedInputFields(
  calculationType: TangentAimingExteriorCalculationType
): TangentAimingExteriorInputField[] {
  return [...TANGENT_AIMING_EXTERIOR_COMMON_FIELDS, TANGENT_AIMING_EXTERIOR_TYPE_FIELD[calculationType]];
}

/** Enables the displayed controls and disables the hidden one so it does not block validity. */
export function syncDisplayedControls(
  form: TangentAimingExteriorForm,
  calculationType: TangentAimingExteriorCalculationType
): void {
  const displayed = getDisplayedInputFields(calculationType);
  for (const field of Object.keys(form.controls) as TangentAimingExteriorInputField[]) {
    const control = form.controls[field];
    if (displayed.includes(field)) {
      if (control.disabled) control.enable({ emitEvent: false });
    } else if (control.enabled) {
      control.disable({ emitEvent: false });
    }
  }
}
