/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { clearAutoParameter15C } from '@features/studio/field-measuring/presentation/helpers';
import { createNumberControl } from '../tangent-aiming-common/tangent-aiming-common.helpers';
import { TANGENT_AIMING_INTERIOR_FIELD_RULES } from './tangent-aiming-interior.constantes';
import {
  TangentAimingInteriorForm,
  TangentAimingInteriorInputs,
  TangentAimingInteriorNumericField
} from './tangent-aiming-interior.interfaces';

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
    parameter: createControl('parameter')
  });
}

/** Whether every input of `data` satisfies its rules (single source of truth: the form validators). */
export function isTangentAimingInteriorDataValid(data: FieldMeasure): boolean {
  const form = createTangentAimingInteriorForm();
  form.patchValue(toTangentAimingInteriorInputs(data), { emitEvent: false });
  return form.valid;
}

/** Fills the empty (`null`/`undefined`) tangent aiming (interior) inputs with their default. */
export function applyTangentAimingInteriorDefaults(
  data: FieldMeasure,
  defaultLeftSupport: string | null
): FieldMeasure {
  const rules = TANGENT_AIMING_INTERIOR_FIELD_RULES;
  return {
    ...data,
    interiorLeftSupport: data.interiorLeftSupport ?? defaultLeftSupport,
    interiorSpanLength: data.interiorSpanLength ?? rules.spanLength.default,
    interiorHAccDistance: data.interiorHAccDistance ?? rules.hAccDistance.default,
    interiorVerticalAccAngleLeft: data.interiorVerticalAccAngleLeft ?? rules.verticalAccAngleLeft.default,
    interiorVerticalAccAngleRight: data.interiorVerticalAccAngleRight ?? rules.verticalAccAngleRight.default,
    interiorParameter: data.interiorParameter ?? rules.parameter.default
  };
}

/** Clears the interior result and the automatic 15°C result derived from it. */
export function invalidateTangentAimingInteriorResult(data: FieldMeasure): FieldMeasure {
  return clearAutoParameter15C({ ...data, outputs: { ...data.outputs, tangentAimingInterior: null } });
}

/** Builds the form/calculation inputs from the measure (inputs missing from a persisted measure are `null`). */
export function toTangentAimingInteriorInputs(data: FieldMeasure): TangentAimingInteriorInputs {
  return {
    leftSupport: data.interiorLeftSupport ?? null,
    spanLength: data.interiorSpanLength ?? null,
    hAccDistance: data.interiorHAccDistance ?? null,
    verticalAccAngleLeft: data.interiorVerticalAccAngleLeft ?? null,
    verticalAccAngleRight: data.interiorVerticalAccAngleRight ?? null,
    parameter: data.interiorParameter ?? null
  };
}

/** Writes the form inputs into the measure. */
export function applyTangentAimingInteriorInputs(
  data: FieldMeasure,
  inputs: TangentAimingInteriorInputs
): FieldMeasure {
  return {
    ...data,
    interiorLeftSupport: inputs.leftSupport,
    interiorSpanLength: inputs.spanLength,
    interiorHAccDistance: inputs.hAccDistance,
    interiorVerticalAccAngleLeft: inputs.verticalAccAngleLeft,
    interiorVerticalAccAngleRight: inputs.verticalAccAngleRight,
    interiorParameter: inputs.parameter
  };
}
