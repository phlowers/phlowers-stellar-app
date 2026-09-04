import { FormGroup } from '@angular/forms';

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
