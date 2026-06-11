/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Localized error messages for section import failures. */
export const sectionImportErrors = {
  fileTypeNotAllowed: $localize`File type not allowed`,
  fileReadError: $localize`Error reading file`,
  fileParseError: $localize`Error parsing file`,
  validationErrorRequiredFields: $localize`Section is missing required fields`,
  validationErrorSupportsBounds: $localize`Section has supports with values out of bounds`,
  sectionImportError: $localize`Error importing section`,
  sectionDeleteError: $localize`Error deleting section`,
  geoLiaisonFormatError: $localize`The geolink file to import is invalid.`
};

/** Localised success message shown after a successful section import. */
export const importSuccessDetail = $localize`Section imported successfully`;
