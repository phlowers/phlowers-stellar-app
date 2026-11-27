/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable, signal } from '@angular/core';
import { STELLAR_PLUGIN_CLOSE_CLEANUP_DELAY_MS } from './stellar-plugin.constantes';
import { StellarPluginEntry } from './stellar-plugin.interfaces';

/** State of the dialog hosting the active plugin, shared by the home page and the studio. */
@Injectable({ providedIn: 'root' })
export class PluginDialogService {
  readonly activeEntry = signal<StellarPluginEntry | null>(null);
  readonly isOpen = signal(false);

  #cleanupTimeout: ReturnType<typeof setTimeout> | null = null;

  open(entry: StellarPluginEntry): void {
    this.#cancelPendingCleanup();
    this.activeEntry.set(entry);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.#cancelPendingCleanup();
    this.#cleanupTimeout = setTimeout(() => {
      this.#cleanupTimeout = null;
      this.activeEntry.set(null);
    }, STELLAR_PLUGIN_CLOSE_CLEANUP_DELAY_MS);
  }

  #cancelPendingCleanup(): void {
    if (this.#cleanupTimeout !== null) {
      clearTimeout(this.#cleanupTimeout);
      this.#cleanupTimeout = null;
    }
  }
}
