/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Pipe, PipeTransform } from '@angular/core';
import { parseRfc9557 } from '@shared/helpers/date-time.helpers';

/**
 * Turns a raw date (RFC 9557 or legacy ISO 8601 string) into a `Date`, so that it can be displayed by the
 * `date` pipe, which cannot read the `[Zone]` suffix of RFC 9557.
 *
 * @example
 * {{ study.updated_at_offline | rfc9557ToDate | date: format }}
 */
@Pipe({
  name: 'rfc9557ToDate'
})
export class Rfc9557ToDatePipe implements PipeTransform {
  /**
   * @param value - The raw date
   * @returns The matching `Date`, or `null` when the value is empty or unreadable
   */
  transform(value: unknown): Date | null {
    return parseRfc9557(value);
  }
}
