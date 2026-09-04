/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup } from '@angular/forms';
import { getControlErrorIds, getNumberInputErrorParams } from './formErrors.helpers';

describe('getControlErrorIds', () => {
  it('should return null when the control does not exist', () => {
    const form = new FormGroup({ name: new FormControl('') });

    expect(getControlErrorIds(form, 'missing', ['required'])).toBeNull();
  });

  it('should return null when the control has no errors', () => {
    const form = new FormGroup({ name: new FormControl('') });

    expect(getControlErrorIds(form, 'name', ['required'])).toBeNull();
  });

  it('should return null when the control has errors but none match the given types', () => {
    const control = new FormControl('');
    control.setErrors({ someOtherError: true });
    const form = new FormGroup({ name: control });

    expect(getControlErrorIds(form, 'name', ['required', 'pattern'])).toBeNull();
  });

  it('should return a single id when one error type is active', () => {
    const control = new FormControl('');
    control.setErrors({ required: true });
    const form = new FormGroup({ name: control });

    expect(getControlErrorIds(form, 'name', ['required', 'pattern'])).toBe('name-error-required');
  });

  it('should return space-separated ids for multiple active errors, in errorTypes order', () => {
    const control = new FormControl('');
    control.setErrors({ pattern: true, required: true });
    const form = new FormGroup({ name: control });

    expect(getControlErrorIds(form, 'name', ['required', 'pattern'])).toBe('name-error-required name-error-pattern');
  });

  it('should only include error types passed in errorTypes, ignoring unrelated active errors', () => {
    const control = new FormControl('');
    control.setErrors({ required: true, pattern: true });
    const form = new FormGroup({ name: control });

    expect(getControlErrorIds(form, 'name', ['pattern'])).toBe('name-error-pattern');
  });
});

describe('getNumberInputErrorParams', () => {
  it('should return null when the control has no errors', () => {
    expect(getNumberInputErrorParams(new FormControl(5))).toBeNull();
  });

  it('should return null when the control is null', () => {
    expect(getNumberInputErrorParams(null)).toBeNull();
  });

  it('should return the min-value-error key and bound when the min error is active', () => {
    const control = new FormControl(5);
    control.setErrors({ min: { min: 10, actual: 5 } });

    expect(getNumberInputErrorParams(control)).toEqual({ key: 'common.min-value-error', params: { min: 10 } });
  });

  it('should return the max-value-error key and bound when the max error is active', () => {
    const control = new FormControl(50);
    control.setErrors({ max: { max: 20, actual: 50 } });

    expect(getNumberInputErrorParams(control)).toEqual({ key: 'common.max-value-error', params: { max: 20 } });
  });

  it('should return the max-decimals-error key and bound when the maxDecimals error is active', () => {
    const control = new FormControl(1.234);
    control.setErrors({ maxDecimals: { maxDecimals: 2 } });

    expect(getNumberInputErrorParams(control)).toEqual({
      key: 'common.max-decimals-error',
      params: { maxDecimals: 2 }
    });
  });

  it('should prioritize min over max and maxDecimals when multiple errors are active', () => {
    const control = new FormControl(5);
    control.setErrors({ min: { min: 10, actual: 5 }, max: { max: 20, actual: 5 }, maxDecimals: { maxDecimals: 2 } });

    expect(getNumberInputErrorParams(control)).toEqual({ key: 'common.min-value-error', params: { min: 10 } });
  });

  it('should prioritize max over maxDecimals when both are active', () => {
    const control = new FormControl(50);
    control.setErrors({ max: { max: 20, actual: 50 }, maxDecimals: { maxDecimals: 2 } });

    expect(getNumberInputErrorParams(control)).toEqual({ key: 'common.max-value-error', params: { max: 20 } });
  });
});
