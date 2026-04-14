/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { truncateDecimals } from './truncateDecimals';

const makeEvent = (value: string) => ({ target: { value } as HTMLInputElement }) as unknown as Event;

describe('truncateDecimals', () => {
  it('should do nothing when value has no decimal separator', () => {
    const event = makeEvent('123');
    truncateDecimals(event);
    expect((event.target as HTMLInputElement).value).toBe('123');
  });

  it('should do nothing when value has exactly 2 decimal places', () => {
    const event = makeEvent('1.23');
    truncateDecimals(event);
    expect((event.target as HTMLInputElement).value).toBe('1.23');
  });

  it('should do nothing when value has fewer than 2 decimal places', () => {
    const event = makeEvent('1.2');
    truncateDecimals(event);
    expect((event.target as HTMLInputElement).value).toBe('1.2');
  });

  it('should truncate to 2 decimal places when value has more', () => {
    const event = makeEvent('1.234');
    truncateDecimals(event);
    expect((event.target as HTMLInputElement).value).toBe('1.23');
  });

  it('should truncate negative numbers with more than 2 decimal places', () => {
    const event = makeEvent('-1.234');
    truncateDecimals(event);
    expect((event.target as HTMLInputElement).value).toBe('-1.23');
  });
});
