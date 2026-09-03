import { FormBuilder, Validators } from '@angular/forms';
import { getErrorIds } from '@shared/components/initial-condition-modal/initialConditionModal.helpers';
import { integerValidator } from '@shared/helpers/form-validators';

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
