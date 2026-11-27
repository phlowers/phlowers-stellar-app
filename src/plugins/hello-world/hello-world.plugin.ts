/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { STELLAR_PLUGIN_API_VERSION, StellarPluginManifest } from '@shared/plugin/stellar-plugin';
import { HELLO_WORLD_I18N_KEYS, HELLO_WORLD_PLUGIN_ID, HELLO_WORLD_TRANSLOCO_SCOPE } from './hello-world.constantes';

/** Reference plugin: shows the current section and sends a notification. */
export const HELLO_WORLD_PLUGIN: StellarPluginManifest = {
  id: HELLO_WORLD_PLUGIN_ID,
  apiVersion: STELLAR_PLUGIN_API_VERSION,
  placements: ['home', 'studio'],
  i18nScope: HELLO_WORLD_TRANSLOCO_SCOPE,
  titleKey: HELLO_WORLD_I18N_KEYS.title,
  descriptionKey: HELLO_WORLD_I18N_KEYS.description,
  accentColor: 'var(--tertiary-600)',
  dialogStyle: { width: '32rem', 'max-width': '95vw' },
  loadComponent: () => import('./hello-world.component').then((module) => module.HelloWorldComponent)
};
