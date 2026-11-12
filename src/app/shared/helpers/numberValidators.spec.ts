/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl } from '@angular/forms';
import { createNumberControl, maxDecimalsValidator } from './numberValidators';

describe('maxDecimalsValidator', () => {
  it.each([null, undefined])('should return null when value is %s', (value) => {
    expect(maxDecimalsValidator(2)(new FormControl(value))).toBeNull();
  });

  describe('maxDecimals = 0', () => {
    it.each([0, 1, -1, 42, -42])('should return null for integer value %s', (value) => {
      expect(maxDecimalsValidator(0)(new FormControl(value))).toBeNull();
    });

    it.each([1.5, -1.5, 0.1, 3.14])('should return an error for non-integer value %s', (value) => {
      expect(maxDecimalsValidator(0)(new FormControl(value))).toEqual({ maxDecimals: { maxDecimals: 0 } });
    });
  });

  describe('maxDecimals = 1', () => {
    it.each(['1', '-1', '0', '1.0', '1.5', '-1.5', '-0.9'])('should return null for value %s', (value) => {
      expect(maxDecimalsValidator(1)(new FormControl(value))).toBeNull();
    });

    it.each(['1.55', '-1.55', '1.', '.5', 'abc', '1.5.5', ''])('should return an error for value %s', (value) => {
      expect(maxDecimalsValidator(1)(new FormControl(value))).toEqual({ maxDecimals: { maxDecimals: 1 } });
    });
  });

  describe('maxDecimals = 2', () => {
    it.each(['1', '-1', '0', '1.0', '1.5', '1.55', '-1.55', '-0.99'])('should return null for value %s', (value) => {
      expect(maxDecimalsValidator(2)(new FormControl(value))).toBeNull();
    });

    it.each(['1.555', '-1.555', '1.', '.5', 'abc', '1.5.5', ''])('should return an error for value %s', (value) => {
      expect(maxDecimalsValidator(2)(new FormControl(value))).toEqual({ maxDecimals: { maxDecimals: 2 } });
    });
  });
});

describe('createNumberControl', () => {
  it('defaults to null', () => {
    expect(createNumberControl(0, 10, 1).value).toBeNull();
  });

  it.each([0, 10, 5.5])('accepts %s', (value) => {
    const control = createNumberControl(0, 10, 1);
    control.setValue(value);
    expect(control.valid).toBe(true);
  });

  it.each([
    [-0.1, 'min'],
    [10.1, 'max'],
    [1.23, 'maxDecimals'],
    [null, 'required']
  ])('rejects %s with a %s error', (value, errorKey) => {
    const control = createNumberControl(0, 10, 1);
    control.setValue(value);
    expect(control.hasError(errorKey)).toBe(true);
  });
});
