/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AbstractControl } from '@angular/forms';

/**
 * Builds the space-separated list of `<controlName>-error-<type>` ids for the active errors of
 * `controlName` among `errorTypes`, for use as an `aria-errormessage` value. Returns null when
 * none of the given error types are currently active.
 */
export function getControlErrorIds(
  form: { get(name: string): AbstractControl | null },
  controlName: string,
  errorTypes: string[]
): string | null {
  const control = form.get(controlName);
  if (!control?.errors) {
    return null;
  }
  const ids = errorTypes.filter((type) => control.errors?.[type]).map((type) => `${controlName}-error-${type}`);
  return ids.length > 0 ? ids.join(' ') : null;
}
