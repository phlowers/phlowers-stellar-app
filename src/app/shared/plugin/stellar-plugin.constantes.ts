/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { InjectionToken } from '@angular/core';
import { StellarPluginApi, StellarPluginManifest } from './stellar-plugin.interfaces';

/** Current version of the `StellarPluginApi` contract. */
export const STELLAR_PLUGIN_API_VERSION = 1;

/** Multi-provider token holding every enabled plugin manifest, in menu order. Empty when none is registered. */
export const STELLAR_PLUGINS = new InjectionToken<readonly StellarPluginManifest[]>('STELLAR_PLUGINS', {
  providedIn: 'root',
  factory: () => []
});

/** Facade injected in plugin components only (provided by the plugin dialog). */
export const STELLAR_PLUGIN_API = new InjectionToken<StellarPluginApi>('STELLAR_PLUGIN_API');

/** Plugin ids are kebab-case: lowercase letters and digits separated by single dashes. */
export const STELLAR_PLUGIN_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Dialog style applied when the plugin manifest does not declare one. */
export const STELLAR_PLUGIN_DEFAULT_DIALOG_STYLE: Readonly<Record<string, string>> = {
  width: '60rem',
  'max-width': '95vw'
};

/** Delay before clearing the active plugin, so the dialog close animation can finish. */
export const STELLAR_PLUGIN_CLOSE_CLEANUP_DELAY_MS = 300;

/** Global i18n keys used by the plugin host. */
export const STELLAR_PLUGIN_I18N_KEYS = {
  loadError: 'shared.plugin-dialog.load-error',
  loading: 'common.loading'
} as const;
