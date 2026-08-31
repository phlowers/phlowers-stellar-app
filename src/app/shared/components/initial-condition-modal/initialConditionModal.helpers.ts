import { AbstractControl, FormGroup, ValidationErrors } from '@angular/forms';

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

/**
 * Builds the space-separated list of error message element ids for a given control,
 * for use in an `aria-errormessage` attribute.
 */
export function getErrorIds(form: FormGroup, controlName: string, errorTypes: string[]): string | null {
  const control = form.get(controlName);
  if (!control?.errors) {
    return null;
  }
  const ids = errorTypes.filter((type) => control.errors?.[type]).map((type) => `${controlName}-error-${type}`);
  return ids.length > 0 ? ids.join(' ') : null;
}
