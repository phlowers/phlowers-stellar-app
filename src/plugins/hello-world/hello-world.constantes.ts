/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ProviderScope } from '@jsverse/transloco';

/** Stable identifier of the hello-world plugin. */
export const HELLO_WORLD_PLUGIN_ID = 'hello-world';

/** Transloco scope shipped with the plugin, so its texts leave with it when it is removed. */
export const HELLO_WORLD_TRANSLOCO_SCOPE: ProviderScope = {
  scope: 'hello-world',
  loader: {
    en: () => import('./i18n/en.json').then((module) => module.default),
    fr: () => import('./i18n/fr.json').then((module) => module.default)
  }
};

/** Keys of the manifest texts inside the plugin scope, without the scope name. */
export const HELLO_WORLD_I18N_KEYS = {
  title: 'title',
  description: 'description'
} as const;

/** Prefix of the scope keys in templates (Transloco camelCases the scope name). */
export const HELLO_WORLD_I18N_PREFIX = 'helloWorld';
