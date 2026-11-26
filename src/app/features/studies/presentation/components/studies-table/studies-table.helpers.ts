/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Study } from '@shared/domain';
import { compareRfc9557 } from '@shared/helpers/date-time.helpers';
import { STUDIES_TABLE_DATE_FIELD } from './studies-table.constantes';

/** Same ordering as the default PrimeNG column sort: empty values first, strings by locale, others by `<`. */
const compareFieldValues = (a: unknown, b: unknown): number => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  return a < b ? -1 : 1;
};

/**
 * Sorts the studies in place by a column. The modification date is a raw RFC 9557 or legacy ISO string whose
 * text order is not chronological (different offsets), so it is compared by instant; the other columns keep the
 * default PrimeNG ordering.
 * @param studies - The studies to sort, modified in place
 * @param field - The sorted column
 * @param order - `1` ascending, `-1` descending
 */
export const sortStudiesByField = (studies: Study[], field: string, order: number): void => {
  const direction = order === -1 ? -1 : 1;
  studies.sort((a, b) =>
    field === STUDIES_TABLE_DATE_FIELD
      ? compareRfc9557(a.updated_at_offline, b.updated_at_offline, direction)
      : direction *
        compareFieldValues(
          (a as unknown as Record<string, unknown>)[field],
          (b as unknown as Record<string, unknown>)[field]
        )
  );
};
