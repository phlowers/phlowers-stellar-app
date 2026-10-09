/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Converts a JSON string/number value to `number | null`; anything else (or NaN) is `null`. */
export function parseFloatOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  // Only strings and numbers can carry a number: anything else (object, boolean, function) is null.
  const n = typeof value === 'number' || typeof value === 'string' ? Number.parseFloat(String(value)) : Number.NaN;
  return Number.isNaN(n) ? null : n;
}

/** Converts a JSON string/boolean/null value to `boolean | null`. Case-insensitive on string values. */
export function parseBooleanOrNull(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  const normalized = typeof value === 'string' ? value.toUpperCase() : value;
  if (normalized === 'TRUE' || normalized === '1' || normalized === 'OUI') return true;
  if (normalized === 'FALSE' || normalized === '0' || normalized === 'NON') return false;
  return null;
}
