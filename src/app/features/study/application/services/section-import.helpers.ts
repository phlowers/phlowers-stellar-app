/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Section, Support } from '@shared/domain';
import { SectionImportNotice } from '@shared/import/section-adapter/section-import-adapter';

/** Severity of an import notice: at or below the threshold is informative, above it needs a check. */
export function getNoticeSeverity(error: number, threshold: number): SectionImportNotice['severity'] {
  return error <= threshold ? 'info' : 'warning';
}

/** Returns the largest finite value with its index, or `null` when no value is finite. */
export function findMaxFiniteValue(values: readonly (number | null)[]): { value: number; index: number } | null {
  let result: { value: number; index: number } | null = null;
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (value == null || !Number.isFinite(value)) continue;
    if (result === null || value > result.value) result = { value, index };
  }
  return result;
}

/** Name of the support when it has one, otherwise its 1-based number. */
export function getSupportLabel(support: Pick<Support, 'name'> | undefined, index: number): string {
  const name = support?.name?.trim();
  return name ? name : String(index + 1);
}

/** Maximum position error of a section, with the support where it occurs and the resulting severity. */
export interface PositionErrorSummary {
  readonly maxError: number;
  readonly support: string;
  readonly severity: SectionImportNotice['severity'];
}

/**
 * Summarizes `section.position_error_meters` (one entry per support). Returns `null` when no finite
 * value was computed.
 */
export function summarizePositionError(section: Section, threshold: number): PositionErrorSummary | null {
  const max = findMaxFiniteValue(section.position_error_meters ?? []);
  if (!max) return null;
  return {
    maxError: max.value,
    support: getSupportLabel(section.supports[max.index], max.index),
    severity: getNoticeSeverity(max.value, threshold)
  };
}
