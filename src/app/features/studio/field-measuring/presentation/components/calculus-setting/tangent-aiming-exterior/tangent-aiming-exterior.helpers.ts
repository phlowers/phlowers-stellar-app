/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { clearAutoParameter15C } from '@features/studio/field-measuring/presentation/helpers';
import {
  createNumberControl,
  syncDisplayedControls
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.helpers';
import {
  TANGENT_AIMING_EXTERIOR_COMMON_FIELDS,
  TANGENT_AIMING_EXTERIOR_FIELD_RULES,
  TANGENT_AIMING_EXTERIOR_MODEL_FIELDS,
  TANGENT_AIMING_EXTERIOR_TYPE_FIELD
} from './tangent-aiming-exterior.constantes';
import {
  TangentAimingExteriorCalculationType,
  TangentAimingExteriorForm,
  TangentAimingExteriorInputField,
  TangentAimingExteriorInputs,
  TangentAimingExteriorNumericField
} from './tangent-aiming-exterior.interfaces';

function createControl(field: TangentAimingExteriorNumericField): FormControl<number | null> {
  return createNumberControl(TANGENT_AIMING_EXTERIOR_FIELD_RULES[field]);
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

const INPUT_FIELDS = Object.keys(TANGENT_AIMING_EXTERIOR_MODEL_FIELDS) as TangentAimingExteriorInputField[];
const NUMERIC_FIELDS = INPUT_FIELDS.filter(
  (field): field is TangentAimingExteriorNumericField => field !== 'leftSupport'
);

/** Whether every displayed input of `data` satisfies its rules (single source of truth: the form validators). */
export function isTangentAimingExteriorDataValid(data: FieldMeasure): boolean {
  const form = createTangentAimingExteriorForm();
  form.patchValue(
    Object.fromEntries(INPUT_FIELDS.map((field) => [field, data[TANGENT_AIMING_EXTERIOR_MODEL_FIELDS[field]] ?? null])),
    { emitEvent: false }
  );
  syncDisplayedControls(form, getDisplayedInputFields(data.exteriorCalculationType));
  return form.valid;
}

/** Fills the empty (`null`/`undefined`) tangent aiming (exterior) inputs with their default. */
export function applyTangentAimingExteriorDefaults(
  data: FieldMeasure,
  defaultLeftSupport: string | null
): FieldMeasure {
  const next: FieldMeasure = {
    ...data,
    exteriorCalculationType: data.exteriorCalculationType ?? 'parametre',
    exteriorLeftSupport: data.exteriorLeftSupport ?? defaultLeftSupport
  };
  for (const field of NUMERIC_FIELDS) {
    const key = TANGENT_AIMING_EXTERIOR_MODEL_FIELDS[field] as 'exteriorSpanLength';
    next[key] ??= TANGENT_AIMING_EXTERIOR_FIELD_RULES[field].default;
  }
  return next;
}

/** Clears the exterior result and the automatic 15°C result derived from it. */
export function invalidateTangentAimingExteriorResult(data: FieldMeasure): FieldMeasure {
  return clearAutoParameter15C({ ...data, outputs: { ...data.outputs, tangentAimingExterior: null } });
}

/** Resets the numeric input hidden by the calculation type switch. */
export function resetNonDisplayedExteriorFields(data: FieldMeasure): FieldMeasure {
  return data.exteriorCalculationType === 'parametre'
    ? { ...data, exteriorTangentAngle: null }
    : { ...data, exteriorParameter: null };
}

/** Builds the calculation inputs from the measure. */
export function toTangentAimingExteriorInputs(data: FieldMeasure): TangentAimingExteriorInputs {
  return {
    leftSupport: data.exteriorLeftSupport,
    spanLength: data.exteriorSpanLength,
    hAccDistance: data.exteriorHAccDistance,
    verticalAccAngleLeft: data.exteriorVerticalAccAngleLeft,
    verticalAccAngleRight: data.exteriorVerticalAccAngleRight,
    calculationType: data.exteriorCalculationType,
    parameter: data.exteriorParameter,
    tangentAngle: data.exteriorTangentAngle
  };
}
