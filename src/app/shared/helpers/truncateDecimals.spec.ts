/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { truncateTwoDecimals, truncateOneDecimal, truncateOneDecimalValue, truncateNumberToOneDecimal } from './truncateDecimals';

const makeEvent = (value: string) => ({ target: { value } as HTMLInputElement }) as unknown as Event;

describe('truncateTwoDecimals', () => {
  it('should do nothing when value has no decimal separator', () => {
    const event = makeEvent('123');
    truncateTwoDecimals(event);
    expect((event.target as HTMLInputElement).value).toBe('123');
  });

  it('should do nothing when value has exactly 2 decimal places', () => {
    const event = makeEvent('1.23');
    truncateTwoDecimals(event);
    expect((event.target as HTMLInputElement).value).toBe('1.23');
  });

  it('should do nothing when value has fewer than 2 decimal places', () => {
    const event = makeEvent('1.2');
    truncateTwoDecimals(event);
    expect((event.target as HTMLInputElement).value).toBe('1.2');
  });

  it('should truncate to 2 decimal places when value has more', () => {
    const event = makeEvent('1.234');
    truncateTwoDecimals(event);
    expect((event.target as HTMLInputElement).value).toBe('1.23');
  });

  it('should truncate negative numbers with more than 2 decimal places', () => {
    const event = makeEvent('-1.234');
    truncateTwoDecimals(event);
    expect((event.target as HTMLInputElement).value).toBe('-1.23');
  });
});

describe('truncateOneDecimal', () => {
  it('should do nothing when value has no decimal separator', () => {
    const event = makeEvent('123');
    truncateOneDecimal(event);
    expect((event.target as HTMLInputElement).value).toBe('123');
  });

  it('should do nothing when value has fewer than 2 decimal places', () => {
    const event = makeEvent('1.2');
    truncateOneDecimal(event);
    expect((event.target as HTMLInputElement).value).toBe('1.2');
  });

  it('should truncate to 1 decimal place when value has more', () => {
    const event = makeEvent('1.23');
    truncateOneDecimal(event);
    expect((event.target as HTMLInputElement).value).toBe('1.2');
  });

  it('should truncate negative numbers with more than 1 decimal places', () => {
    const event = makeEvent('-1.23');
    truncateOneDecimal(event);
    expect((event.target as HTMLInputElement).value).toBe('-1.2');
  });
});

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
