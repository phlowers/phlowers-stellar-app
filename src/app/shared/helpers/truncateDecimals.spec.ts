/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { truncateOneDecimalValue, truncateNumberToOneDecimal } from './truncateDecimals';

describe('truncateOneDecimalValue', () => {
  it('should return the value unchanged when it has no decimal separator', () => {
    expect(truncateOneDecimalValue('123')).toBe('123');
  });

  it('should return the value unchanged when it has exactly 1 decimal place', () => {
    expect(truncateOneDecimalValue('1.2')).toBe('1.2');
  });

  it('should return the value unchanged when it has fewer than 1 decimal place', () => {
    expect(truncateOneDecimalValue('1.')).toBe('1.');
  });

  it('should truncate to 1 decimal place when value has more', () => {
    expect(truncateOneDecimalValue('1.23')).toBe('1.2');
  });

  it('should truncate negative numbers with more than 1 decimal place', () => {
    expect(truncateOneDecimalValue('-1.23')).toBe('-1.2');
  });
});

describe('truncateNumberToOneDecimal', () => {
  it('should truncate 2200.17 to 2200.1 (not round to 2200.2)', () => {
    expect(truncateNumberToOneDecimal(2200.17)).toBe(2200.1);
  });

  it('should truncate 2200.99 to 2200.9 (not round to 2201.0)', () => {
    expect(truncateNumberToOneDecimal(2200.99)).toBe(2200.9);
  });

  it('should return integer values unchanged', () => {
    expect(truncateNumberToOneDecimal(1700)).toBe(1700);
  });

  it('should handle negative values', () => {
    expect(truncateNumberToOneDecimal(-2200.17)).toBe(-2200.1);
  });
});
