/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { InjectionToken } from '@angular/core';
import { AdapterImportErrorCode, CanonicalImportErrorCode, ImportAdapter } from './import-contracts.interfaces';

/**
 * DI token used to provide a context-specific `ImportAdapter` to the generic
 * import engine and UI component.
 *
 * @example
 * ```typescript
 * // In a feature module or component providers array:
 * { provide: IMPORT_ADAPTER_TOKEN, useClass: StudyImportAdapter }
 * ```
 */
export const IMPORT_ADAPTER_TOKEN = new InjectionToken<ImportAdapter>('IMPORT_ADAPTER_TOKEN');

/**
 * Canonical error codes emitted by the generic import pipeline.
 *
 * Source of truth for `CanonicalImportErrorCode`; adapters may emit
 * additional context-specific codes via `adapterErrorCode`.
 */
export const IMPORT_ERROR_CODES = {
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_DECODE_ERROR: 'FILE_DECODE_ERROR',
  FILE_PARSE_ERROR: 'FILE_PARSE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MAPPING_ERROR: 'MAPPING_ERROR',
  PERSISTENCE_ERROR: 'PERSISTENCE_ERROR',
  UUID_COLLISION_REJECTED: 'UUID_COLLISION_REJECTED'
} as const satisfies Record<string, CanonicalImportErrorCode>;

/**
 * Brands a raw string as an `AdapterImportErrorCode`.
 *
 * @example
 * ```typescript
 * throw { code: adapterErrorCode('CABLE_NOT_FOUND'), ... };
 * ```
 */
export const adapterErrorCode = (code: string): AdapterImportErrorCode => code as AdapterImportErrorCode;
