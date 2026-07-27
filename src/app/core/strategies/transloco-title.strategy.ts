/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Custom Angular TitleStrategy that resolves route `title` values
 * as Transloco keys, enabling reactive i18n for browser tab titles.
 *
 * Registered via `{ provide: TitleStrategy, useClass: TranslocoTitleStrategy }`
 * in `app.config.ts`.
 */
@Injectable({ providedIn: 'root' })
export class TranslocoTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);
    if (routeTitle) {
      this.title.setTitle(this.transloco.translate(routeTitle));
    }
  }
}
