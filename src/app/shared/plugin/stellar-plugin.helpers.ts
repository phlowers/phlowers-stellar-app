/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Provider } from '@angular/core';
import { STELLAR_PLUGIN_API_VERSION, STELLAR_PLUGIN_ID_PATTERN, STELLAR_PLUGINS } from './stellar-plugin.constantes';
import {
  DeepReadonly,
  StellarPluginManifest,
  StellarPluginPlacement,
  StellarPluginValidation
} from './stellar-plugin.interfaces';

/** Appends a plugin manifest to the `STELLAR_PLUGINS` multi-provider. */
export function provideStellarPlugin(plugin: StellarPluginManifest): Provider[] {
  return [{ provide: STELLAR_PLUGINS, useValue: plugin, multi: true }];
}

/** Returns why a single manifest is invalid, or `null` when it is valid. */
function getPluginError(plugin: StellarPluginManifest, knownIds: ReadonlySet<string>): string | null {
  if (!STELLAR_PLUGIN_ID_PATTERN.test(plugin.id)) return `Plugin id "${plugin.id}" is not kebab-case.`;
  if (knownIds.has(plugin.id)) return `Plugin id "${plugin.id}" is registered more than once.`;
  if (plugin.apiVersion !== STELLAR_PLUGIN_API_VERSION) {
    return `Plugin "${plugin.id}" targets API v${plugin.apiVersion}, expected v${STELLAR_PLUGIN_API_VERSION}.`;
  }
  if (plugin.placements.length === 0) return `Plugin "${plugin.id}" declares no placement.`;
  return null;
}

/** Keeps the valid manifests (first wins on duplicate ids) so one faulty plugin cannot hide the others. */
export function validateStellarPlugins(plugins: readonly StellarPluginManifest[]): StellarPluginValidation {
  const valid: StellarPluginManifest[] = [];
  const errors: string[] = [];
  const knownIds = new Set<string>();
  for (const plugin of plugins) {
    const error = getPluginError(plugin, knownIds);
    if (error) {
      errors.push(error);
    } else {
      valid.push(plugin);
      knownIds.add(plugin.id);
    }
  }
  return { valid, errors };
}

/** Plugins requiring a section are never listed on the home page, which has no section. */
export function isPluginInPlacement(plugin: StellarPluginManifest, placement: StellarPluginPlacement): boolean {
  if (!plugin.placements.includes(placement)) return false;
  return placement !== 'home' || !plugin.requiresSection;
}

/** Returns `true` when the plugin can be opened in the current context. */
export function isPluginAvailable(plugin: StellarPluginManifest, hasSection: boolean): boolean {
  return !plugin.requiresSection || hasSection;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** Deep-frozen copy of `value`, so plugins can never mutate application state. */
export function toReadonlySnapshot<T>(value: T | null | undefined): DeepReadonly<T> | null {
  if (value === null || value === undefined) return null;
  return deepFreeze(structuredClone(value)) as DeepReadonly<T>;
}

/** Prefix identifying the plugin in technical logs. */
export function formatPluginLogPrefix(pluginId: string): string {
  return `[plugin:${pluginId}]`;
}
