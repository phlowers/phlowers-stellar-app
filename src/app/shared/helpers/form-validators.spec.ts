import { FormBuilder } from '@angular/forms';
import { integerValidator, maxTwoDecimalsValidator } from '@shared/helpers/form-validators';

describe('integerValidator', () => {
  const fb = new FormBuilder();

  it('should return null when value is null', () => {
    const control = fb.control(null);
    expect(integerValidator(control)).toBeNull();
  });

  it('should return null when value is undefined', () => {
    const control = fb.control(undefined);
    expect(integerValidator(control)).toBeNull();
  });

  it('should return null for an integer value', () => {
    const control = fb.control(15);
    expect(integerValidator(control)).toBeNull();
  });

  it('should return an integer error for a decimal value', () => {
    const control = fb.control(15.5);
    expect(integerValidator(control)).toEqual({ integer: true });
  });
});

describe('maxTwoDecimalsValidator', () => {
  const fb = new FormBuilder();

  it('should return null when value is null', () => {
    const control = fb.control(null);
    expect(maxTwoDecimalsValidator(control)).toBeNull();
  });

  it('should return null when value is undefined', () => {
    const control = fb.control(undefined);
    expect(maxTwoDecimalsValidator(control)).toBeNull();
  });

  it('should return null for a value with two decimals', () => {
    const control = fb.control(15.42);
    expect(maxTwoDecimalsValidator(control)).toBeNull();
  });

  it('should return null for an integer value', () => {
    const control = fb.control(15);
    expect(maxTwoDecimalsValidator(control)).toBeNull();
  });

  it('should return a maxTwoDecimals error for a value with more than two decimals', () => {
    const control = fb.control(15.123);
    expect(maxTwoDecimalsValidator(control)).toEqual({ maxTwoDecimals: true });
  });
});
