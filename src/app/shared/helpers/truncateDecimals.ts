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
