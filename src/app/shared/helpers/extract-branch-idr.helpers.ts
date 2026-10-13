/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Extracts the branch number from a BRANCHE_IDR string.
 * Rule RG.CAN.BRA — takes the last 2 characters (always digits) and converts them to an integer string.
 * e.g. "TESTLINE73STB01" → "1", "TESTLINE73STB08" → "8", "TESTLINE73STB10" → "10".
 *
 * @remarks
 * Legacy manually-edited records (pre-dating the catalog rename to `branch_idr`) may already hold
 * a short catalog branch number instead of the raw BRANCHE_IDR code (e.g. "1", "1.0"). In that case
 * the last-2-characters rule can land mid-decimal (e.g. ".0") and produce `NaN`; fall back to parsing
 * the whole value as a number so these legacy values still display correctly.
 */
export function extractBranchIdr(value: string): string {
  const lastTwoDigits = Number.parseInt(value.slice(-2), 10);
  if (!Number.isNaN(lastTwoDigits)) {
    return String(lastTwoDigits);
  }
  const wholeValue = Number.parseFloat(value);
  return Number.isNaN(wholeValue) ? value : String(wholeValue);
}
