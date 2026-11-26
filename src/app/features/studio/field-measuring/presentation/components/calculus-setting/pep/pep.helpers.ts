/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { PEP_FIELD_RULES } from '@features/studio/field-measuring/presentation/components/calculus-setting/pep/pep.constantes';
import { PepNumericField } from '@features/studio/field-measuring/presentation/components/calculus-setting/pep/pep.interfaces';
import { NumberInputErrorParams } from '@shared/helpers/formErrors.interfaces';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';

const hasValidDecimals = (value: number, decimals: number): boolean =>
  Number.isInteger(Number((value * 10 ** decimals).toFixed(6)));

/**
 * Validation error of a numeric input, as the Transloco key and params to display.
 * @param field - The numeric input
 * @param value - Its current value
 * @returns The first violated rule (required, min, max, decimals), or `null` when valid
 */
export const getPepFieldError = (
  field: PepNumericField,
  value: number | null | undefined
): NumberInputErrorParams | null => {
  const { min, max, decimals } = PEP_FIELD_RULES[field];
  if (typeof value !== 'number') return { key: 'common.required', params: {} };
  if (value < min) return { key: 'common.min-value-error', params: { min } };
  if (value > max) return { key: 'common.max-value-error', params: { max } };
  if (!hasValidDecimals(value, decimals)) {
    return { key: 'common.max-decimals-error', params: { maxDecimals: decimals } };
  }
  return null;
};

/**
 * Whether the left support is chosen and every numeric input is a number within its bounds and decimals.
 * @param data - The field measure
 * @returns `true` when the PEP form can be calculated
 */
export const isPepDataValid = (data: FieldMeasure): boolean =>
  data.pepLeftSupport !== null &&
  (Object.keys(PEP_FIELD_RULES) as PepNumericField[]).every((field) => getPepFieldError(field, data[field]) === null);

/**
 * Options of the left support selector: every support of the section, value = support index (RG.PEP.SUP.1).
 * @param supports - The section supports
 * @returns One option per support, labelled with its truncated number
 */
export const buildPepSupportOptions = (supports: { number: string | null }[]): { label: string; value: string }[] =>
  supports.map((support, index) => ({ label: formatSupportNumber(support.number), value: index.toString() }));

/**
 * Number displayed for the left support selected in the PEP form, which stores a support index.
 * @param supports - The section supports
 * @param pepLeftSupport - The selected support index
 * @returns The truncated support number, or `null` when none is selected or the support is unknown
 */
export const getPepLeftSupportLabel = (
  supports: { number: string | null }[],
  pepLeftSupport: string | null | undefined
): string | null => buildPepSupportOptions(supports).find((option) => option.value === pepLeftSupport)?.label ?? null;

/**
 * Fills the inputs left empty with their default: the departure support of the span (RG.PEP.SUP.3) and 0 for the
 * numeric inputs (RG.PEP.*.2), so a measure saved before PEP existed opens complete.
 * @param data - The field measure
 * @param defaultLeftSupport - Departure support of the current span
 * @returns The measure with its empty PEP inputs filled
 */
export const applyPepDefaults = (data: FieldMeasure, defaultLeftSupport: string | null): FieldMeasure => ({
  ...data,
  ...Object.fromEntries((Object.keys(PEP_FIELD_RULES) as PepNumericField[]).map((field) => [field, data[field] ?? 0])),
  pepLeftSupport: data.pepLeftSupport ?? defaultLeftSupport
});
