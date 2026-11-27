/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Public entry point of the Stellar plugin contract: plugins import only from here and `@shared`.
export type {
  DeepReadonly,
  StellarPluginApi,
  StellarPluginLogger,
  StellarPluginManifest,
  StellarPluginNotifier,
  StellarPluginPlacement
} from './stellar-plugin.interfaces';

export type { Section, Study } from '@shared/domain';

export { STELLAR_PLUGIN_API, STELLAR_PLUGIN_API_VERSION } from './stellar-plugin.constantes';

export { provideStellarPlugin } from './stellar-plugin.helpers';
