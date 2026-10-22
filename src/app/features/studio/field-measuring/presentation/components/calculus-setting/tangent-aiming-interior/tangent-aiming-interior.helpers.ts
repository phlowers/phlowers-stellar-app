/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup, Validators } from '@angular/forms';
import { createNumberControl } from '../tangent-aiming-support/tangent-aiming-support.helpers';
import { TANGENT_AIMING_EXTERIOR_RULE_FIELDS } from '../tangent-aiming-exterior/tangent-aiming-exterior.constantes';
import { TangentAimingInteriorForm, TangentAimingInteriorNumericField } from './tangent-aiming-interior.interfaces';

function createControl(field: TangentAimingInteriorNumericField): FormControl<number | null> {
  return createNumberControl(TANGENT_AIMING_EXTERIOR_RULE_FIELDS[field]);
}

/** Creates the typed form holding every tangent aiming (interior) input. */
export function createTangentAimingInteriorForm(): TangentAimingInteriorForm {
  return new FormGroup({
    leftSupport: new FormControl<string | null>(null, Validators.required),
    spanLength: createControl('spanLength'),
    hAccDistance: createControl('hAccDistance'),
    verticalAccAngleLeft: createControl('verticalAccAngleLeft'),
    verticalAccAngleRight: createControl('verticalAccAngleRight'),
    parameter: createControl('parameter')
  });
}
