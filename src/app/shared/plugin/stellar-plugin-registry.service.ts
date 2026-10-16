/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, combineLatest, map, Observable, of } from 'rxjs';
import { LoggerService } from '@core/services/logger/logger.service';
import { STELLAR_PLUGINS } from './stellar-plugin.constantes';
import { isPluginInPlacement, validateStellarPlugins } from './stellar-plugin.helpers';
import { StellarPluginEntry, StellarPluginManifest } from './stellar-plugin.interfaces';

/** Validated plugins with their titles resolved in the active language. */
@Injectable({ providedIn: 'root' })
export class StellarPluginRegistryService {
  readonly #transloco = inject(TranslocoService);
  readonly #logger = inject(LoggerService);

  readonly plugins: readonly StellarPluginManifest[] = this.#validate(inject(STELLAR_PLUGINS));

  readonly entries = toSignal(this.#selectEntries(), { initialValue: [] as readonly StellarPluginEntry[] });
  readonly homeEntries = computed(() => this.entries().filter((entry) => isPluginInPlacement(entry.plugin, 'home')));
  readonly studioEntries = computed(() =>
    this.entries().filter((entry) => isPluginInPlacement(entry.plugin, 'studio'))
  );

  #validate(plugins: readonly StellarPluginManifest[]): readonly StellarPluginManifest[] {
    const { valid, errors } = validateStellarPlugins(plugins);
    for (const error of errors) this.#logger.error(error);
    return valid;
  }

  #selectEntries(): Observable<readonly StellarPluginEntry[]> {
    if (this.plugins.length === 0) return of([]);
    return combineLatest(this.plugins.map((plugin) => this.#selectEntry(plugin)));
  }

  #selectEntry(plugin: StellarPluginManifest): Observable<StellarPluginEntry> {
    const scope = plugin.i18nScope;
    return combineLatest([
      this.#transloco.selectTranslate<string>(plugin.titleKey, {}, scope),
      this.#transloco.selectTranslate<string>(plugin.descriptionKey, {}, scope)
    ]).pipe(
      map(([title, description]) => ({ plugin, title, description })),
      catchError((error: unknown) => {
        this.#logger.error(`Translations of plugin "${plugin.id}" could not be loaded.`, error);
        return of({ plugin, title: plugin.id, description: '' });
      })
    );
  }
}
