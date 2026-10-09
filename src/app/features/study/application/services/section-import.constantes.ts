/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Transloco translation keys for section import error messages. */
export const SECTION_IMPORT_ERROR_KEYS = {
  fileTypeNotAllowed: 'common.import.error.file-type-not-allowed',
  fileReadError: 'common.error-reading-file-label',
  fileParseError: 'common.error-parsing-file-label',
  noMatchingAdapter: 'section-import.no-matching-adapter',
  validationErrorRequiredFields: 'section-import.validation-required-fields',
  validationErrorSupportsBounds: 'section-import.validation-supports-bounds',
  sectionImportError: 'section-import.import-error',
  sectionDeleteError: 'section-import.delete-error',
  lambertReprojectionError: 'section-import.lambert-reprojection-error'
} as const;

/** Transloco translation key for the Lambert93-to-GPS reprojection info toast. */
export const REPROJECTION_INFO_KEY = 'section-import.reprojection-info';

/** Transloco translation key for the section import success toast. */
export const IMPORT_SUCCESS_KEY = 'section-import.import-success';

/** Transloco translation key for the warning shown when a support is absent from the attachment catalog. */
export const CATALOG_MISSING_WARNING_KEY = 'section-import.catalog-missing-warning';
