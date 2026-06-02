/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { toOptionalNumber, toOptionalBoolean } from './csv-cell.helpers';

describe('toOptionalNumber', () => {
  it.each([
    [undefined, undefined],
    [null, undefined],
    ['', undefined],
    ['not-a-number', undefined],
    ['12.5', 12.5],
    ['  3  ', 3],
    [42, 42],
    [0, 0],
    [NaN, undefined]
  ])('parses %p as %p', (input, expected) => {
    expect(toOptionalNumber(input as never)).toBe(expected);
  });
});

describe('toOptionalBoolean', () => {
  it.each([
    [undefined, undefined],
    [null, undefined],
    ['', undefined],
    ['  ', undefined],
    ['true', true],
    ['True', true],
    ['TRUE', true],
    ['false', false],
    ['False', false],
    ['0', false],
    ['anything', false]
  ])('parses %p as %p', (input, expected) => {
    expect(toOptionalBoolean(input as never)).toBe(expected);
  });
});
