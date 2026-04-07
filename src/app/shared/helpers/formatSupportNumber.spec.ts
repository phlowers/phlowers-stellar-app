/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { formatSupportNumber, SUPPORT_NUMBER_MAX_LENGTH } from './formatSupportNumber';

describe('formatSupportNumber', () => {
  it('should return "-" when number is null', () => {
    expect(formatSupportNumber(null)).toBe('-');
  });

  it('should return the number unchanged when shorter than max length', () => {
    expect(formatSupportNumber('A1')).toBe('A1');
  });

  it('should truncate to SUPPORT_NUMBER_MAX_LENGTH characters', () => {
    const long = 'ABCDEFGH';
    expect(formatSupportNumber(long)).toBe(long.slice(0, SUPPORT_NUMBER_MAX_LENGTH));
  });

  it('should return the full string when exactly max length', () => {
    const exact = 'ABCDE';
    expect(formatSupportNumber(exact)).toBe(exact);
  });
});
