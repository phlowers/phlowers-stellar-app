/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PluginDialogService } from './plugin-dialog.service';
import { STELLAR_PLUGIN_API_VERSION } from './stellar-plugin.constantes';
import { formatPluginLogPrefix, toReadonlySnapshot } from './stellar-plugin.helpers';
import { StellarPluginApi, StellarPluginManifest } from './stellar-plugin.interfaces';

/** Builds the read-only `StellarPluginApi` handed to each plugin. */
@Injectable({ providedIn: 'root' })
export class StellarPluginApiService {
  readonly #plotService = inject(PlotService);
  readonly #spanService = inject(PlotSpanService);
  readonly #notification = inject(NotificationService);
  readonly #logger = inject(LoggerService);
  readonly #transloco = inject(TranslocoService);
  readonly #dialog = inject(PluginDialogService);

  // The span section outlives the studio, so it is hidden once the studio is left
  readonly #section = computed(() =>
    this.#plotService.isStudioActive() ? toReadonlySnapshot(this.#spanService.section()) : null
  );
  readonly #study = computed(() =>
    this.#plotService.isStudioActive() ? toReadonlySnapshot(this.#plotService.study()) : null
  );
  readonly #activeLang = toSignal(this.#transloco.langChanges$, { initialValue: this.#transloco.getActiveLang() });

  create(plugin: StellarPluginManifest): StellarPluginApi {
    const prefix = formatPluginLogPrefix(plugin.id);
    return Object.freeze({
      apiVersion: STELLAR_PLUGIN_API_VERSION,
      section: this.#section,
      study: this.#study,
      activeLang: this.#activeLang,
      notify: Object.freeze({
        success: (detail: string, summary?: string) => this.#notification.success(detail, summary),
        info: (detail: string, summary?: string) => this.#notification.info(detail, summary),
        warning: (detail: string, summary?: string) => this.#notification.warning(detail, summary),
        error: (detail: string, summary?: string) => this.#notification.error(detail, summary)
      }),
      log: Object.freeze({
        info: (message: string, ...data: unknown[]) => this.#logger.info(prefix, message, ...data),
        warn: (message: string, ...data: unknown[]) => this.#logger.warn(prefix, message, ...data),
        error: (message: string, ...data: unknown[]) => this.#logger.error(prefix, message, ...data)
      }),
      close: () => this.#dialog.close()
    });
  }
}
