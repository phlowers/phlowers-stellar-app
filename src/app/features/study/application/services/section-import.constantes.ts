/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { environment } from '@src/environments/environment';

/** Localized error messages for section import failures. */
export const sectionImportErrors = {
  fileTypeNotAllowed: $localize`File type not allowed`,
  fileReadError: $localize`Error reading file`,
  fileParseError: $localize`Error parsing file`,
  validationErrorRequiredFields: $localize`Section is missing required fields`,
  validationErrorSupportsBounds: $localize`Section has supports with values out of bounds`,
  sectionImportError: $localize`Error importing section`,
  sectionDeleteError: $localize`Error deleting section`,
  geoLiaisonFormatError: $localize`The geolink file to import is invalid.`,
  lambertReprojectionError: $localize`Error computing GPS coordinates from Lambert93 data`
};

/** Warning shown when at least one GeoLiaison support cannot be resolved with complete catalog data. */
export const geoLiaisonSupportCatalogMissingWarning = $localize`The attachment support from the geolink file is not present in the application support catalog`;

/**
 * Builds the localized info toast detail shown after a GeoLiaison import whenever the
 * Lambert93-to-GPS reprojection was computed, reporting the mean absolute error (in meters)
 * between the surveyed Lambert93 foot coordinates and the app's span/angle data model.
 */
export const buildReprojectionInfoMessage = (meanReprojectionDiffMeters: number): string =>
  $localize`Reprojection using ${environment.appName} data model seems to add a mean absolute error of ${meanReprojectionDiffMeters.toFixed(1)} m`;

/** Localised success message shown after a successful section import. */
export const importSuccessDetail = $localize`Section imported successfully`;
