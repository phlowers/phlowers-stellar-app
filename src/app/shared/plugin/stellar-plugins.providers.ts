/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Provider } from '@angular/core';
import { ENABLED_STELLAR_PLUGIN_PROVIDERS } from '@plugins/stellar-plugins.config';

/** Every plugin enabled in this build, in menu order. Only file of the app allowed to import `@plugins`. */
export const STELLAR_PLUGIN_PROVIDERS: Provider[] = [...ENABLED_STELLAR_PLUGIN_PROVIDERS];
