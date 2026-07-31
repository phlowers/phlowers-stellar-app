/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Parses an optional numeric CSV cell. Returns `undefined` for empty / non-finite values. */
export const toOptionalNumber = (value: string | number | undefined | null): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
};

/** Parses an optional boolean CSV cell. Accepts `true`/`True` for true, empty for `undefined`. */
export const toOptionalBoolean = (value: string | undefined | null): boolean | undefined => {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  return trimmed.toLowerCase() === 'true';
};
