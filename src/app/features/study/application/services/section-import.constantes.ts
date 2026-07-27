/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Transloco translation keys for section import error messages. */
export const SECTION_IMPORT_ERROR_KEYS = {
  fileTypeNotAllowed: 'sectionImport.fileTypeNotAllowed',
  fileReadError: 'sectionImport.fileReadError',
  fileParseError: 'sectionImport.fileParseError',
  validationErrorRequiredFields: 'sectionImport.validationRequiredFields',
  validationErrorSupportsBounds: 'sectionImport.validationSupportsBounds',
  sectionImportError: 'sectionImport.importError',
  sectionDeleteError: 'sectionImport.deleteError',
  geoLiaisonFormatError: 'sectionImport.geoLiaisonFormatError',
  lambertReprojectionError: 'sectionImport.lambertReprojectionError'
} as const;

/** Transloco translation key for the GeoLiaison catalog-missing warning. */
export const GEO_LIAISON_CATALOG_MISSING_KEY = 'sectionImport.catalogMissingWarning';

/** Transloco translation key for the Lambert93-to-GPS reprojection info toast. */
export const REPROJECTION_INFO_KEY = 'sectionImport.reprojectionInfo';

/** Transloco translation key for the section import success toast. */
export const IMPORT_SUCCESS_KEY = 'sectionImport.importSuccess';
