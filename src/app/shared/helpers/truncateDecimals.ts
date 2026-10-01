/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Returns the string value truncated to at most `decimals` decimal places.
 * Pure function — does not touch the DOM.
 */
function truncateStringToDecimals(value: string, decimals: number): string {
  const sepIndex = value.indexOf('.');
  if (sepIndex !== -1 && value.substring(sepIndex + 1).length > decimals) {
    return value.substring(0, sepIndex + 1 + decimals);
  }
  return value;
}

/**
 * Returns the string `value` truncated to at most 1 decimal place.
 * Pure function — does not touch the DOM. Use this when the caller controls the DOM mutation.
 *
 * @param value - The raw string value from a number input
 * @returns The truncated string
 */
export function truncateOneDecimalValue(value: string): string {
  return truncateStringToDecimals(value, 1);
}

/**
 * Truncates a numeric value to 1 decimal place without rounding.
 * Example: 2200.17 → 2200.1, 2200.99 → 2200.9
 *
 * @param value - The numeric value to truncate
 * @returns The truncated numeric value
 */
export function truncateNumberToOneDecimal(value: number): number {
  return Math.trunc(value * 10) / 10;
}
