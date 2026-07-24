/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

function truncateToDecimals(event: Event, decimals: number): void {
  const input = event.target as HTMLInputElement;
  const sepIndex = input.value.indexOf('.');
  if (sepIndex !== -1 && input.value.substring(sepIndex + 1).length > decimals) {
    input.value = input.value.substring(0, sepIndex + 1 + decimals);
  }
}

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
 * Truncates the value of a number input to at most 2 decimal places.
 * Intended as an `(input)` event handler on `<input type="number" step="0.01">` elements.
 *
 * @param event - The DOM input event fired by the number input element
 */
export function truncateTwoDecimals(event: Event): void {
  truncateToDecimals(event, 2);
}

/**
 * Truncates the value of a number input to at most 1 decimal place.
 * Intended as an `(input)` event handler on `<input type="number" step="0.1">` elements.
 *
 * @param event - The DOM input event fired by the number input element
 */
export function truncateOneDecimal(event: Event): void {
  truncateToDecimals(event, 1);
}

/**
 * Strips any decimal part (including the separator) from the value of a number input,
 * hard-blocking decimals so only integers can be entered.
 * Intended as an `(input)` event handler on integer-only `<input type="number" step="1">` elements.
 *
 * @param event - The DOM input event fired by the number input element
 */
export function truncateNoDecimals(event: Event): void {
  const input = event.target as HTMLInputElement;
  const sepIndex = input.value.indexOf('.');
  if (sepIndex !== -1) {
    input.value = input.value.substring(0, sepIndex);
  }
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
