/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl } from '@angular/forms';
import { noDecimalValidator, oneDecimalValidator, twoDecimalValidator } from './numberValidators';

describe('noDecimalValidator', () => {
  it.each([null, undefined])('should return null when value is %s', (value) => {
    expect(noDecimalValidator(new FormControl(value))).toBeNull();
  });

  it.each([0, 1, -1, 42, -42])('should return null for integer value %s', (value) => {
    expect(noDecimalValidator(new FormControl(value))).toBeNull();
  });

  it.each([1.5, -1.5, 0.1, 3.14])('should return an error for non-integer value %s', (value) => {
    expect(noDecimalValidator(new FormControl(value))).toEqual({ noDecimal: true });
  });
});

describe('oneDecimalValidator', () => {
  it.each([null, undefined])('should return null when value is %s', (value) => {
    expect(oneDecimalValidator(new FormControl(value))).toBeNull();
  });

  it.each(['1', '-1', '0', '1.0', '1.5', '-1.5', '-0.9'])('should return null for value %s', (value) => {
    expect(oneDecimalValidator(new FormControl(value))).toBeNull();
  });

  it.each(['1.55', '-1.55', '1.', '.5', 'abc', '1.5.5', ''])('should return an error for value %s', (value) => {
    expect(oneDecimalValidator(new FormControl(value))).toEqual({ oneDecimal: true });
  });
});

describe('twoDecimalValidator', () => {
  it.each([null, undefined])('should return null when value is %s', (value) => {
    expect(twoDecimalValidator(new FormControl(value))).toBeNull();
  });

  it.each(['1', '-1', '0', '1.0', '1.5', '1.55', '-1.55', '-0.99'])('should return null for value %s', (value) => {
    expect(twoDecimalValidator(new FormControl(value))).toBeNull();
  });

  it.each(['1.555', '-1.555', '1.', '.5', 'abc', '1.5.5', ''])('should return an error for value %s', (value) => {
    expect(twoDecimalValidator(new FormControl(value))).toEqual({ twoDecimal: true });
  });
});
