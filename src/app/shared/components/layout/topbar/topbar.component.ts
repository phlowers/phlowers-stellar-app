/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { toSignal } from '@angular/core/rxjs-interop';
import { PageTitleService } from '@shared/service/page-title/page-title.service';
import { IconComponent } from '../../atoms/icon/icon.component';
import { AuthService } from '@services/auth/auth.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { AppUpdateService } from '@services/app-update/app-update.service';
import { offlineStatusKind } from '@services/app-update/app-update.helpers';
import { APP_UPDATE_I18N, OFFLINE_STATUS_I18N_PREFIX } from '@services/app-update/app-update.constantes';
import { TranslocoModule } from '@jsverse/transloco';
import { OFFLINE_STATUS_ICONS, OFFLINE_STATUS_WARNING_KINDS } from './topbar.constantes';

@Component({
  selector: 'app-topbar',
  imports: [IconComponent, TranslocoModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Top navigation bar displaying the current page title, user info, Python worker and offline status. */
export class TopbarComponent {
  private readonly pageTitleService = inject(PageTitleService);
  private readonly authService = inject(AuthService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly appUpdateService = inject(AppUpdateService);
  public currentPageTitle = toSignal(this.pageTitleService.pageTitle$, { initialValue: '' });
  public workerReady = toSignal(this.workerPythonService.ready$, { initialValue: true });
  public readonly workerError = toSignal(this.workerPythonService.pyodideLoadError$, { initialValue: false });
  public user = this.authService.currentUser;

  readonly offlineKind = computed(() => offlineStatusKind(this.appUpdateService.state()));
  readonly offlineIcon = computed(() => OFFLINE_STATUS_ICONS[this.offlineKind()]);
  readonly offlineLabelKey = computed(() => `${OFFLINE_STATUS_I18N_PREFIX}.${this.offlineKind()}`);
  readonly offlineWarning = computed(() => OFFLINE_STATUS_WARNING_KINDS.has(this.offlineKind()));
  /** Tooltip explaining a postponed update while the current version stays usable offline. */
  readonly offlineTooltipKey = computed(() => {
    const refusal = this.appUpdateService.lastRefusal();
    if (this.offlineKind() !== 'ready' || !refusal) {
      return null;
    }
    return refusal.reason === 'storage-insufficient'
      ? APP_UPDATE_I18N.storageInsufficientDetail
      : APP_UPDATE_I18N.updateDeferredNetwork;
  });
}
