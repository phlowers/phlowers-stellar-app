/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { maxDecimalsValidator } from '@shared/helpers/numberValidators';
import {
  TANGENT_AIMING_SUPPORT_COMMON_FIELDS,
  TANGENT_AIMING_SUPPORT_FIELD_RULES,
  TANGENT_AIMING_SUPPORT_TYPE_FIELD
} from './tangent-aiming-support.constantes';
import {
  TangentAimingSupportCalculation,
  TangentAimingSupportForm,
  TangentAimingSupportInputField,
  TangentAimingSupportInputs,
  TangentAimingSupportNumericField
} from './tangent-aiming-support.interfaces';

/** Options of the left support selector: every support of the section, value = support index. */
export function buildCantonSupportOptions(supports: { number: string | null }[]): { label: string; value: string }[] {
  return supports.map((support, index) => ({ label: formatSupportNumber(support.number), value: index.toString() }));
}

/** Default left support: the first support of the current span, as a support index. */
export function getDefaultLeftSupport(span: number[] | null): string | null {
  return span?.length ? span[0].toString() : null;
}

/** Inputs displayed for the given calculation type. */
export function getDisplayedInputFields(
  calculationType: FieldMeasure['calculationType']
): TangentAimingSupportInputField[] {
  return [...TANGENT_AIMING_SUPPORT_COMMON_FIELDS, TANGENT_AIMING_SUPPORT_TYPE_FIELD[calculationType]];
}

function createNumberControl(field: TangentAimingSupportNumericField): FormControl<number | null> {
  const { min, max, decimals } = TANGENT_AIMING_SUPPORT_FIELD_RULES[field];
  return new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(min),
    Validators.max(max),
    maxDecimalsValidator(decimals)
  ]);
}

/** Creates the typed form holding every tangent aiming (support) input. */
export function createTangentAimingSupportForm(): TangentAimingSupportForm {
  return new FormGroup({
    tangentLeftSupport: new FormControl<string | null>(null, Validators.required),
    tangentSpanLength: createNumberControl('tangentSpanLength'),
    cableHAccDistance: createNumberControl('cableHAccDistance'),
    cableVerticalAccAngle: createNumberControl('cableVerticalAccAngle'),
    cableParameter: createNumberControl('cableParameter'),
    cableTangentAngle: createNumberControl('cableTangentAngle')
  });
}

/** Enables the displayed controls and disables the hidden one so it does not block validity. */
export function syncDisplayedControls(
  form: TangentAimingSupportForm,
  calculationType: FieldMeasure['calculationType']
): void {
  const displayed = getDisplayedInputFields(calculationType);
  for (const field of Object.keys(form.controls) as TangentAimingSupportInputField[]) {
    const control = form.controls[field];
    if (displayed.includes(field)) {
      if (control.disabled) control.enable({ emitEvent: false });
    } else if (control.enabled) {
      control.disable({ emitEvent: false });
    }
  }
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
  syncDisplayedControls(form, data.calculationType);
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

/**
 * Temporary mock: the engine has no tangent aiming Task yet, constant value on purpose.
 * TODO: replace with workerPythonService.runTask(Task.<tangent aiming>) once the Task exists.
 */
export function calculateTangentAimingSupportMock(
  _inputs: TangentAimingSupportInputs
): Promise<TangentAimingSupportCalculation> {
  return Promise.resolve({
    result: { parameter: 1000, uncertainty: 1.5, criterion: 1, checkValidity: true },
    error: null
  });
}
