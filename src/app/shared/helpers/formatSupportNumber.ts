/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Maximum number of characters to display from a support number. */
export const SUPPORT_NUMBER_MAX_LENGTH = 5;

/**
 * Returns a display-safe support number, truncated to SUPPORT_NUMBER_MAX_LENGTH characters.
 * Returns '?' when the number is null.
 *
 * @param number - The support number string, or null
 * @returns Display support number truncated to SUPPORT_NUMBER_MAX_LENGTH characters, or '?'
 */
export function formatSupportNumber(number: string | null): string {
  if (number === null) return '-';
  return number.slice(0, SUPPORT_NUMBER_MAX_LENGTH);
}
