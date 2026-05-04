/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Localized error messages for study import failures. */
export const studyImportErrors = {
  cableNotFound: $localize`Cable not found in database`,
  fileTypeNotAllowed: $localize`File type not allowed`,
  studyImportError: $localize`Error importing study`,
  studyDeleteError: $localize`Error deleting study`,
  fileDecodeError: $localize`Error decoding file`,
  fileParseError: $localize`Error parsing file`,
  fileReadError: $localize`Error reading file`
};

/** Detail message shown on successful study import. */
export const importSuccessDetail = $localize`Study imported successfully`;
