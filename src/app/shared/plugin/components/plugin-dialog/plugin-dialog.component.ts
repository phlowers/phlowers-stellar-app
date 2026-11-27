/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  signal,
  Type,
  untracked
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { LoggerService } from '@core/services/logger/logger.service';
import { PluginDialogService } from '../../plugin-dialog.service';
import { StellarPluginApiService } from '../../stellar-plugin-api.service';
import {
  STELLAR_PLUGIN_API,
  STELLAR_PLUGIN_DEFAULT_DIALOG_STYLE,
  STELLAR_PLUGIN_I18N_KEYS
} from '../../stellar-plugin.constantes';
import { StellarPluginEntry } from '../../stellar-plugin.interfaces';

@Component({
  selector: 'app-plugin-dialog',
  imports: [DialogModule, MessageModule, NgComponentOutlet, TranslocoPipe],
  templateUrl: './plugin-dialog.component.html',
  styleUrl: './plugin-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Dialog lazily loading and rendering the active plugin with its own `STELLAR_PLUGIN_API`. */
export class PluginDialogComponent {
  readonly dialogService = inject(PluginDialogService);
  readonly #injector = inject(Injector);
  readonly #logger = inject(LoggerService);

  readonly i18nKeys = STELLAR_PLUGIN_I18N_KEYS;
  readonly component = signal<Type<unknown> | null>(null);
  readonly isLoading = signal(false);
  readonly hasLoadError = signal(false);

  readonly dialogStyle = computed(
    () => this.dialogService.activeEntry()?.plugin.dialogStyle ?? STELLAR_PLUGIN_DEFAULT_DIALOG_STYLE
  );

  // The API is only built when the plugin injects it, so the host page does not pull the plot services
  readonly pluginInjector = computed(() => {
    const entry = this.dialogService.activeEntry();
    if (!entry) return this.#injector;
    return Injector.create({
      providers: [
        {
          provide: STELLAR_PLUGIN_API,
          useFactory: (apiService: StellarPluginApiService) => apiService.create(entry.plugin),
          deps: [StellarPluginApiService]
        }
      ],
      parent: this.#injector
    });
  });

  constructor() {
    effect(() => {
      const entry = this.dialogService.activeEntry();
      untracked(() => void this.#load(entry));
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.dialogService.isOpen()) this.dialogService.close();
    });
  }

  onVisibleChange(visible: boolean): void {
    if (!visible) this.dialogService.close();
  }

  async #load(entry: StellarPluginEntry | null): Promise<void> {
    this.component.set(null);
    this.hasLoadError.set(false);
    this.isLoading.set(entry !== null);
    if (!entry) return;
    try {
      const component = await entry.plugin.loadComponent();
      if (this.dialogService.activeEntry() === entry) this.component.set(component);
    } catch (error) {
      this.#logger.error(`Plugin "${entry.plugin.id}" could not be loaded.`, error);
      if (this.dialogService.activeEntry() === entry) this.hasLoadError.set(true);
    } finally {
      if (this.dialogService.activeEntry() === entry) this.isLoading.set(false);
    }
  }
}
