import { FormBuilder, Validators } from '@angular/forms';
import { getErrorIds, integerValidator } from './initialConditionModal.helpers';

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

describe('getErrorIds', () => {
  const fb = new FormBuilder();

  it('should return null when the control has no errors', () => {
    const form = fb.group({ base_temperature: [15] });
    expect(getErrorIds(form, 'base_temperature', ['min', 'max'])).toBeNull();
  });

  it('should return null when the control is not found', () => {
    const form = fb.group({ base_temperature: [15] });
    expect(getErrorIds(form, 'unknown_field', ['min', 'max'])).toBeNull();
  });

  it('should return the ids matching the active errors', () => {
    const form = fb.group({ base_temperature: [-100, [Validators.min(-50), Validators.max(250)]] });
    expect(getErrorIds(form, 'base_temperature', ['min', 'max', 'integer'])).toBe('base_temperature-error-min');
  });

  it('should return several ids joined with a space when multiple errors are active', () => {
    const form = fb.group({ base_temperature: [15.5, [Validators.min(-50), integerValidator]] });
    expect(getErrorIds(form, 'base_temperature', ['min', 'integer'])).toBe('base_temperature-error-integer');
  });
});
