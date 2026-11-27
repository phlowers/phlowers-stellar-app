/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { STELLAR_PLUGIN_API } from '@shared/plugin/stellar-plugin';
import { HELLO_WORLD_I18N_PREFIX, HELLO_WORLD_TRANSLOCO_SCOPE } from './hello-world.constantes';

@Component({
  selector: 'app-hello-world-plugin',
  imports: [ButtonComponent, TranslocoPipe],
  providers: [provideTranslocoScope(HELLO_WORLD_TRANSLOCO_SCOPE)],
  templateUrl: './hello-world.component.html',
  styleUrl: './hello-world.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Reference plugin UI: reads the studio section through the plugin API and sends a notification. */
export class HelloWorldComponent {
  readonly api = inject(STELLAR_PLUGIN_API);
  readonly #transloco = inject(TranslocoService);

  readonly i18nPrefix = HELLO_WORLD_I18N_PREFIX;
  readonly sectionName = computed(() => this.api.section()?.name ?? null);
  readonly supportCount = computed(() => this.api.section()?.supports.length ?? 0);

  sendNotification(): void {
    this.api.notify.info(this.#transloco.translate(`${this.i18nPrefix}.notify-detail`));
    this.api.log.info('Notification sent');
  }

  close(): void {
    this.api.close();
  }
}
