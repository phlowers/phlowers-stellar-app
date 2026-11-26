/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Rfc9557ToDatePipe } from './rfc9557-to-date.pipe';

describe('Rfc9557ToDatePipe', () => {
  const pipe = new Rfc9557ToDatePipe();

  it('should read an RFC 9557 string and a legacy ISO string to the same instant', () => {
    const rfc9557 = pipe.transform('2026-07-14T10:30:00.000+02:00[Europe/Paris]');
    const legacy = pipe.transform('2026-07-14T08:30:00.000Z');
    expect(rfc9557?.toISOString()).toBe('2026-07-14T08:30:00.000Z');
    expect(rfc9557?.getTime()).toBe(legacy?.getTime());
  });

  it.each([null, undefined, '', 'not-a-date'])('should return null for %p', (value) => {
    expect(pipe.transform(value)).toBeNull();
  });
});
