/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ProviderScope } from '@jsverse/transloco';

/** Stable identifier of the RTE canton adapter. */
export const RTE_CUSTOM_ADAPTER_ID = 'rte_custom';

/** User-facing format name (proper noun, not translated). */
export const RTE_CUSTOM_FORMAT_LABEL = 'RTE canton (.json)';

/** File extensions handled by the RTE canton adapter. */
export const RTE_CUSTOM_EXTENSIONS = ['.json'] as const;

/** MIME types handled by the RTE canton adapter. */
export const RTE_CUSTOM_MIME_TYPES = ['application/json'] as const;

/** Adapter-specific error codes (branded with `adapterErrorCode` at throw time). */
export const RTE_CUSTOM_ERROR_CODES = {
  formatError: 'RTE_CUSTOM_FORMAT_ERROR',
  requiredFields: 'RTE_CUSTOM_REQUIRED_FIELDS'
} as const;

/** Transloco scope shipped with the adapter, so its texts leave with it when it is removed. */
export const RTE_CUSTOM_TRANSLOCO_SCOPE: ProviderScope = {
  scope: 'rte-custom',
  loader: {
    en: () => import('./i18n/en.json').then((module) => module.default),
    fr: () => import('./i18n/fr.json').then((module) => module.default)
  }
};

/** Keys of the adapter scope, without the scope name (Transloco auto-prefixes it, camelCased). */
export const RTE_CUSTOM_I18N_KEYS = {
  formatError: 'format-error',
  catalogMissingWarning: 'catalog-missing-warning'
} as const;

/** Global key reused for the "missing required fields" message prefix. */
export const RTE_CUSTOM_REQUIRED_FIELDS_KEY = 'section-import.validation-required-fields';
