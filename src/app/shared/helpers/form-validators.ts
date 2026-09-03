import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Generic, feature-agnostic form validators shared across the app.
 * Check here before writing a new validator — a feature-specific `.helpers.ts` file should
 * only keep a validator if its logic is genuinely tied to that feature's domain.
 * Add new validators here (with a matching test in `form-validators.spec.ts`) rather than
 * duplicating them locally in a component or service.
 */

/** Validator rejecting numeric values with more than 2 decimal places. */
export function maxTwoDecimalsValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === undefined) {
    return null;
  }
  const str = control.value.toString();
  const sep = str.indexOf('.');
  return sep !== -1 && str.length - sep - 1 > 2 ? { maxTwoDecimals: true } : null;
}

/** Validator that rejects non-integer numeric values. */
export function integerValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === undefined) {
    return null;
  }
  if (!Number.isInteger(control.value)) {
    return { integer: true };
  }
  return null;
}
