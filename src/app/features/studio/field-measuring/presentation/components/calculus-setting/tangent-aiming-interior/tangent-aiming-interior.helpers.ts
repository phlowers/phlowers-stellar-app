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
  TANGENT_AIMING_INTERIOR_COMMON_FIELDS,
  TANGENT_AIMING_INTERIOR_FIELD_RULES,
  TANGENT_AIMING_INTERIOR_MODEL_FIELDS,
  TANGENT_AIMING_INTERIOR_TYPE_FIELD
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-interior/tangent-aiming-interior.constantes';
import {
  TangentAimingInteriorCalculationType,
  TangentAimingInteriorForm,
  TangentAimingInteriorInputField,
  TangentAimingInteriorInputs,
  TangentAimingInteriorNumericField
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-interior/tangent-aiming-interior.interfaces';

function createControl(field: TangentAimingInteriorNumericField): FormControl<number | null> {
  return createNumberControl(TANGENT_AIMING_INTERIOR_FIELD_RULES[field]);
}

/** Creates the typed form holding every tangent aiming (interior) input. */
export function createTangentAimingInteriorForm(): TangentAimingInteriorForm {
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
  calculationType: TangentAimingInteriorCalculationType
): TangentAimingInteriorInputField[] {
  return [...TANGENT_AIMING_INTERIOR_COMMON_FIELDS, TANGENT_AIMING_INTERIOR_TYPE_FIELD[calculationType]];
}

const INPUT_FIELDS = Object.keys(TANGENT_AIMING_INTERIOR_MODEL_FIELDS) as TangentAimingInteriorInputField[];
const NUMERIC_FIELDS = INPUT_FIELDS.filter(
  (field): field is TangentAimingInteriorNumericField => field !== 'leftSupport'
);

/** Whether every displayed input of `data` satisfies its rules (single source of truth: the form validators). */
export function isTangentAimingInteriorDataValid(data: FieldMeasure): boolean {
  const form = createTangentAimingInteriorForm();
  form.patchValue(
    Object.fromEntries(INPUT_FIELDS.map((field) => [field, data[TANGENT_AIMING_INTERIOR_MODEL_FIELDS[field]] ?? null])),
    { emitEvent: false }
  );
  syncDisplayedControls(form, getDisplayedInputFields(data.interiorCalculationType ?? 'parametre'));
  return form.valid;
}

/** Fills the empty (`null`/`undefined`) tangent aiming (interior) inputs with their default. */
export function applyTangentAimingInteriorDefaults(
  data: FieldMeasure,
  defaultLeftSupport: string | null
): FieldMeasure {
  const next: FieldMeasure = {
    ...data,
    interiorCalculationType: data.interiorCalculationType ?? 'parametre',
    interiorLeftSupport: data.interiorLeftSupport ?? defaultLeftSupport
  };
  for (const field of NUMERIC_FIELDS) {
    const key = TANGENT_AIMING_INTERIOR_MODEL_FIELDS[field] as 'interiorSpanLength';
    next[key] ??= TANGENT_AIMING_INTERIOR_FIELD_RULES[field].default;
  }
  return next;
}

/** Clears the interior result and the automatic 15°C result derived from it. */
export function invalidateTangentAimingInteriorResult(data: FieldMeasure): FieldMeasure {
  return clearAutoParameter15C({ ...data, outputs: { ...data.outputs, tangentAimingInterior: null } });
}

/** Resets the numeric input hidden by the calculation type switch. */
export function resetNonDisplayedInteriorFields(data: FieldMeasure): FieldMeasure {
  return data.interiorCalculationType === 'parametre'
    ? { ...data, interiorTangentAngle: null }
    : { ...data, interiorParameter: null };
}

/** Builds the calculation inputs from the measure (inputs missing from a persisted measure are `null`). */
export function toTangentAimingInteriorInputs(data: FieldMeasure): TangentAimingInteriorInputs {
  return {
    leftSupport: data.interiorLeftSupport ?? null,
    spanLength: data.interiorSpanLength ?? null,
    hAccDistance: data.interiorHAccDistance ?? null,
    verticalAccAngleLeft: data.interiorVerticalAccAngleLeft ?? null,
    verticalAccAngleRight: data.interiorVerticalAccAngleRight ?? null,
    calculationType: data.interiorCalculationType ?? 'parametre',
    parameter: data.interiorParameter ?? null,
    tangentAngle: data.interiorTangentAngle ?? null
  };
}
