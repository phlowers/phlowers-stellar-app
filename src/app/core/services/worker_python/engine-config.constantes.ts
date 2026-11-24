/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** localStorage key holding the hidden engine options overload (JSON object), read when the worker starts. */
export const ENGINE_CONFIG_STORAGE_KEY = 'engineConfig';

/** Name of the global object exposed on `globalThis` to set hidden engine options from the browser console. */
export const CONSOLE_API_NAME = 'stellarConfig';
