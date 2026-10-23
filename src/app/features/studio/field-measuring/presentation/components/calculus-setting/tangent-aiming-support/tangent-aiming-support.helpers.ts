/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { createNumberControl, syncDisplayedControls } from '../tangent-aiming-common/tangent-aiming-common.helpers';
import {
  TANGENT_AIMING_SUPPORT_COMMON_FIELDS,
  TANGENT_AIMING_SUPPORT_FIELD_RULES,
  TANGENT_AIMING_SUPPORT_TYPE_FIELD
} from './tangent-aiming-support.constantes';
import {
  TangentAimingSupportForm,
  TangentAimingSupportInputField,
  TangentAimingSupportInputs,
  TangentAimingSupportNumericField
} from './tangent-aiming-support.interfaces';

/** Options of the left support selector: every support of the section, value = support index. */
export function buildCantonSupportOptions(supports: { number: string | null }[]): { label: string; value: string }[] {
  return supports.map((support, index) => ({ label: formatSupportNumber(support.number), value: index.toString() }));
}

/** Inputs displayed for the given calculation type. */
export function getDisplayedInputFields(
  calculationType: FieldMeasure['calculationType']
): TangentAimingSupportInputField[] {
  return [...TANGENT_AIMING_SUPPORT_COMMON_FIELDS, TANGENT_AIMING_SUPPORT_TYPE_FIELD[calculationType]];
}

function createControl(field: TangentAimingSupportNumericField): FormControl<number | null> {
  return createNumberControl(TANGENT_AIMING_SUPPORT_FIELD_RULES[field]);
}

/** Creates the typed form holding every tangent aiming (support) input. */
export function createTangentAimingSupportForm(): TangentAimingSupportForm {
  return new FormGroup({
    tangentLeftSupport: new FormControl<string | null>(null, Validators.required),
    tangentSpanLength: createControl('tangentSpanLength'),
    cableHAccDistance: createControl('cableHAccDistance'),
    cableVerticalAccAngle: createControl('cableVerticalAccAngle'),
    cableParameter: createControl('cableParameter'),
    cableTangentAngle: createControl('cableTangentAngle')
  });
}
/** Whether every displayed input of `data` satisfies its rules (single source of truth: the form validators). */
export function isTangentAimingSupportDataValid(data: FieldMeasure): boolean {
  const form = createTangentAimingSupportForm();
  form.patchValue(
    {
      tangentLeftSupport: data.tangentLeftSupport ?? null,
      tangentSpanLength: data.tangentSpanLength ?? null,
      cableHAccDistance: data.cableHAccDistance ?? null,
      cableVerticalAccAngle: data.cableVerticalAccAngle ?? null,
      cableParameter: data.cableParameter ?? null,
      cableTangentAngle: data.cableTangentAngle ?? null
    },
    { emitEvent: false }
  );
  syncDisplayedControls(form, getDisplayedInputFields(data.calculationType));
  return form.valid;
}

/** Fills the empty (`null`/`undefined`) tangent aiming (support) inputs with their default. */
export function applyTangentAimingSupportDefaults(data: FieldMeasure, defaultLeftSupport: string | null): FieldMeasure {
  const next: FieldMeasure = { ...data, calculationType: data.calculationType ?? 'parametre' };
  next.tangentLeftSupport ??= defaultLeftSupport;
  for (const field of Object.keys(TANGENT_AIMING_SUPPORT_FIELD_RULES) as TangentAimingSupportNumericField[]) {
    next[field] ??= TANGENT_AIMING_SUPPORT_FIELD_RULES[field].default;
  }
  return next;
}

/** Resets the numeric input hidden by the calculation type switch. */
export function resetNonDisplayedParameterFields(data: FieldMeasure): FieldMeasure {
  return data.calculationType === 'parametre'
    ? { ...data, cableTangentAngle: null }
    : { ...data, cableParameter: null };
}

/** Builds the calculation inputs from the measure. */
export function toTangentAimingSupportInputs(data: FieldMeasure): TangentAimingSupportInputs {
  return {
    leftSupport: data.tangentLeftSupport,
    spanLength: data.tangentSpanLength,
    hAccDistance: data.cableHAccDistance,
    verticalAccAngle: data.cableVerticalAccAngle,
    calculationType: data.calculationType,
    parameter: data.cableParameter,
    tangentAngle: data.cableTangentAngle
  };
}
