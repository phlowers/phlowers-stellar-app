/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { SectionImportCrs } from '@shared/import/section-adapter/section-import-adapter';

/** Coordinate reference systems accepted in the envelope `coordinates` block. */
export const STELLAR_JSON_CRS_VALUES: readonly SectionImportCrs[] = ['LAMBERT93', 'WGS84'];

/** Stable identifier of the default adapter. */
export const STELLAR_JSON_ADAPTER_ID = 'stellar_json';

/** File extensions handled by the default adapter (`.json` keeps raw Section files importable). */
export const STELLAR_JSON_EXTENSIONS = ['.stsec', '.json'] as const;

/** MIME types of the default adapter. */
export const STELLAR_JSON_MIME_TYPES = ['application/json'] as const;

/** Adapter-specific error codes (branded with `adapterErrorCode` at throw time). */
export const STELLAR_JSON_ERROR_CODES = {
  invalidEnvelope: 'STELLAR_JSON_INVALID_ENVELOPE',
  unsupportedVersion: 'STELLAR_JSON_UNSUPPORTED_VERSION'
} as const;

/** Transloco keys used by the default adapter. */
export const STELLAR_JSON_I18N_KEYS = {
  formatLabel: 'section-import.stellar-json.format-label',
  invalidEnvelope: 'section-import.stellar-json.invalid-envelope',
  unsupportedVersion: 'section-import.stellar-json.unsupported-version'
} as const;
