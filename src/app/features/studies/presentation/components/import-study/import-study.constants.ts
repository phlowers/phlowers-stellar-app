/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { studyImportErrors } from '@features/studies/application/services/study-import.errors';

/** Localized error messages for import error reporting (mirrors service error catalog). */
export const errors = studyImportErrors;

/**
 * Returns the localised error message for a given import error key.
 * @param type - Key identifying the error in the `errors` map
 * @returns Localised detail string for the error
 */
export const importErrorDetail = (type: keyof typeof errors): string => {
  return errors[type] || $localize`Error importing study`;
};
