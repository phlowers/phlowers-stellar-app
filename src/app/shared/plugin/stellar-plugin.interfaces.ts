/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Signal, Type } from '@angular/core';
import { ProviderScope } from '@jsverse/transloco';
import { Section, Study } from '@shared/domain';

/** Where a plugin is listed: the home "Tools" page and/or the studio "Tools" menu. */
export type StellarPluginPlacement = 'home' | 'studio';

/** Recursively read-only view of a data snapshot handed to plugins. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/** Static description of a plugin, registered with `provideStellarPlugin`. */
export interface StellarPluginManifest {
  /** Unique, stable kebab-case identifier. */
  readonly id: string;
  /** Version of the `StellarPluginApi` contract the plugin was written against. */
  readonly apiVersion: number;
  readonly placements: readonly StellarPluginPlacement[];
  /** Transloco scope shipped with the plugin (inline loader), used for its title, description and UI. */
  readonly i18nScope: ProviderScope;
  /** Key of the title inside the plugin scope (without the scope prefix). */
  readonly titleKey: string;
  /** Key of the description inside the plugin scope (without the scope prefix). */
  readonly descriptionKey: string;
  /** When `true`, the plugin is only listed in the studio and disabled until a section is loaded. */
  readonly requiresSection?: boolean;
  /** CSS color value (design token) used for the home card accent. */
  readonly accentColor?: string;
  /** Inline style of the dialog hosting the plugin. */
  readonly dialogStyle?: Readonly<Record<string, string>>;
  /** Lazily loads the standalone component rendered inside the dialog. */
  readonly loadComponent: () => Promise<Type<unknown>>;
}

/** Plugin with its title and description resolved in the active language. */
export interface StellarPluginEntry {
  readonly plugin: StellarPluginManifest;
  readonly title: string;
  readonly description: string;
}

/** Result of validating the registered plugins. */
export interface StellarPluginValidation {
  readonly valid: readonly StellarPluginManifest[];
  readonly errors: readonly string[];
}

/** User notifications available to plugins (toasts). */
export interface StellarPluginNotifier {
  success(detail: string, summary?: string): void;
  info(detail: string, summary?: string): void;
  warning(detail: string, summary?: string): void;
  error(detail: string, summary?: string): void;
}

/** Technical logs available to plugins, prefixed with the plugin id. */
export interface StellarPluginLogger {
  info(message: string, ...data: unknown[]): void;
  warn(message: string, ...data: unknown[]): void;
  error(message: string, ...data: unknown[]): void;
}

/** Read-only facade of Stellar exposed to plugins through `STELLAR_PLUGIN_API`. */
export interface StellarPluginApi {
  readonly apiVersion: number;
  /** Section displayed in the studio, or `null` outside the studio. */
  readonly section: Signal<DeepReadonly<Section> | null>;
  /** Study of the section displayed in the studio, or `null` outside the studio. */
  readonly study: Signal<DeepReadonly<Study> | null>;
  readonly activeLang: Signal<string>;
  readonly notify: StellarPluginNotifier;
  readonly log: StellarPluginLogger;
  /** Closes the dialog hosting the plugin. */
  close(): void;
}
