/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Provider } from '@angular/core';
import { provideStellarPlugin } from '@shared/plugin/stellar-plugin';
import { HELLO_WORLD_PLUGIN } from './hello-world/hello-world.plugin';

/**
 * Plugins enabled in this build, in menu order.
 * To enable a plugin, import its manifest and append `...provideStellarPlugin(MY_PLUGIN)`; remove the line to disable it.
 */
export const ENABLED_STELLAR_PLUGIN_PROVIDERS: Provider[] = [...provideStellarPlugin(HELLO_WORLD_PLUGIN)];
