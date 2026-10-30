/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { getNumberInputErrorParams } from '@shared/helpers/formErrors.helpers';
import { maxDecimalsValidator } from '@shared/helpers/numberValidators';
import {
  LeftSupportSnapshot,
  LeftSupportState,
  TangentAimingCalculation,
  TangentAimingCalculationType,
  TangentAimingFieldRule
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.interfaces';

/** Creates a required numeric control bound to the given rule. */
export function createNumberControl({ min, max, decimals }: TangentAimingFieldRule): FormControl<number | null> {
  return new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(min),
    Validators.max(max),
    maxDecimalsValidator(decimals)
  ]);
}

/** Enables the displayed controls and disables the hidden ones so they do not block validity. */
export function syncDisplayedControls(form: FormGroup, displayed: readonly string[]): void {
  for (const [field, control] of Object.entries(form.controls)) {
    if (displayed.includes(field)) {
      if (control.disabled) control.enable({ emitEvent: false });
    } else if (control.enabled) {
      control.disable({ emitEvent: false });
    }
  }
}

/** Options of the left support selector limited to the two supports of the span (RG.VIS-SUP.SUP.1/2), value = support index. */
export function buildSpanSupportOptions(
  supports: { number: string | null }[],
  span: number[] | null | undefined
): { label: string; value: string }[] {
  if (span?.length !== 2) return [];
  return span.map((index) => ({
    label: formatSupportNumber(supports[index]?.number ?? null),
    value: index.toString()
  }));
}

/** Default left support: the first (departure) support of the current span, as a support index (RG.VIS-SUP.SUP.3). */
export function getDefaultLeftSupport(span: number[] | null): string | null {
  return span?.length ? span[0].toString() : null;
}

/** Keeps the current left support when it belongs to the span, otherwise falls back to the default one. */
export function resolveLeftSupport(current: string | null, span: number[] | null): string | null {
  return current !== null && span?.some((index) => index.toString() === current)
    ? current
    : getDefaultLeftSupport(span);
}

/** Identifies a span, empty without span. */
export function getSpanKey(span: number[] | null | undefined): string {
  return span?.join('-') ?? '';
}

/**
 * Left support to apply: on a span change (the left support is still the one of the previous span), the support
 * the user had chosen for that span, else its departure support; otherwise the current one if it belongs to the span.
 */
export function resolveSpanLeftSupport(
  current: string | null,
  span: number[] | null,
  previous: LeftSupportSnapshot | null,
  memory: Record<string, string>
): string | null {
  const key = getSpanKey(span);
  if (previous && previous.spanKey !== key && previous.leftSupport === current) {
    const remembered = memory[key];
    return resolveLeftSupport(remembered ?? null, span);
  }
  return resolveLeftSupport(current, span);
}

/**
 * Resolves the left support for the span and returns the next tracking state.
 * The left support kept for a span is the one the user will find again when selecting it back.
 */
export function nextLeftSupportState(
  current: string | null,
  span: number[] | null,
  state: LeftSupportState
): { resolved: string | null; state: LeftSupportState } {
  const spanKey = getSpanKey(span);
  const resolved = resolveSpanLeftSupport(current, span, state.previous, state.memory);
  const memory = resolved === current && resolved !== null ? { ...state.memory, [spanKey]: resolved } : state.memory;
  return { resolved, state: { previous: { spanKey, leftSupport: resolved }, memory } };
}

/** Span length computed by the engine for the selected span, or null when unavailable. */
export function getCalculatedSpanLength(
  span: number[] | null | undefined,
  spanLengths: (number | null)[] | null | undefined
): number | null {
  return span?.length === 2 ? (spanLengths?.[span[0]] ?? null) : null;
}

/** Options of the parameter / tangent calculation type switch. */
export function buildCalculationTypeOptions(
  translocoService: TranslocoService
): { label: string; value: TangentAimingCalculationType }[] {
  return [
    { label: translocoService.translate('common.parameter-label'), value: 'parametre' },
    { label: translocoService.translate('common.calculation-type-tangent'), value: 'tangente' }
  ];
}

/** Message of the active error of a control, once it has been touched. */
export function getTangentAimingError(control: AbstractControl, translocoService: TranslocoService): string {
  if (!control.touched && !control.dirty) return '';
  if (control.errors?.['required']) return translocoService.translate('common.required');
  const numberError = getNumberInputErrorParams(control);
  return numberError ? translocoService.translate(numberError.key, numberError.params) : '';
}

/**
 * Temporary mock: the engine has no tangent aiming Task yet, constant value on purpose.
 * TODO: replace with workerPythonService.runTask(Task.<tangent aiming>) once the Task exists.
 */
export function calculateTangentAimingMock(_inputs: unknown): Promise<TangentAimingCalculation> {
  return Promise.resolve({
    result: { parameter: 1000, uncertainty: 1.5, criterion: 1, checkValidity: true },
    error: null
  });
}
