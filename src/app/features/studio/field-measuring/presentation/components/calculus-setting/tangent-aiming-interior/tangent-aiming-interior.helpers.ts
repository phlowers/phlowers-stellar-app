/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { clearAutoParameter15C } from '@features/studio/field-measuring/presentation/helpers';
import { createNumberControl } from '../tangent-aiming-support/tangent-aiming-support.helpers';
import { TangentAimingSupportCalculation } from '../tangent-aiming-support/tangent-aiming-support.interfaces';
import {
  TANGENT_AIMING_INTERIOR_FIELD_RULES,
  TANGENT_AIMING_INTERIOR_MODEL_FIELDS,
  TANGENT_AIMING_INTERIOR_RULE_FIELDS
} from './tangent-aiming-interior.constantes';
import {
  TangentAimingInteriorForm,
  TangentAimingInteriorInputField,
  TangentAimingInteriorInputs,
  TangentAimingInteriorNumericField
} from './tangent-aiming-interior.interfaces';

function createControl(field: TangentAimingInteriorNumericField): FormControl<number | null> {
  return createNumberControl(TANGENT_AIMING_INTERIOR_RULE_FIELDS[field], TANGENT_AIMING_INTERIOR_FIELD_RULES[field]);
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

/** Every input of the form, all displayed whatever the state of the measure. */
export const TANGENT_AIMING_INTERIOR_INPUT_FIELDS = Object.keys(
  TANGENT_AIMING_INTERIOR_MODEL_FIELDS
) as TangentAimingInteriorInputField[];
const NUMERIC_FIELDS = TANGENT_AIMING_INTERIOR_INPUT_FIELDS.filter(
  (field): field is TangentAimingInteriorNumericField => field !== 'leftSupport'
);

/** Whether every input of `data` satisfies its rules (single source of truth: the form validators). */
export function isTangentAimingInteriorDataValid(data: FieldMeasure): boolean {
  const form = createTangentAimingInteriorForm();
  form.patchValue(
    Object.fromEntries(
      TANGENT_AIMING_INTERIOR_INPUT_FIELDS.map((field) => [
        field,
        data[TANGENT_AIMING_INTERIOR_MODEL_FIELDS[field]] ?? null
      ])
    ),
    { emitEvent: false }
  );
  return form.valid;
}

/** Fills the empty (`null`/`undefined`) tangent aiming (interior) inputs with their default. */
export function applyTangentAimingInteriorDefaults(
  data: FieldMeasure,
  defaultLeftSupport: string | null
): FieldMeasure {
  const next: FieldMeasure = {
    ...data,
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

/** Builds the calculation inputs from the measure. */
export function toTangentAimingInteriorInputs(data: FieldMeasure): TangentAimingInteriorInputs {
  return {
    leftSupport: data.interiorLeftSupport,
    spanLength: data.interiorSpanLength,
    hAccDistance: data.interiorHAccDistance,
    verticalAccAngleLeft: data.interiorVerticalAccAngleLeft,
    verticalAccAngleRight: data.interiorVerticalAccAngleRight,
    parameter: data.interiorParameter
  };
}

/**
 * Temporary mock: the engine has no tangent aiming Task yet, constant value on purpose.
 * TODO: replace with workerPythonService.runTask(Task.<tangent aiming>) once the Task exists.
 */
export function calculateTangentAimingInteriorMock(
  _inputs: TangentAimingInteriorInputs
): Promise<TangentAimingSupportCalculation> {
  return Promise.resolve({
    result: { parameter: 1000, uncertainty: 1.5, criterion: 1, checkValidity: true },
    error: null
  });
}
