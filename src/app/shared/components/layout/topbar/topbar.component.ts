/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { PageTitleService } from '@shared/service/page-title/page-title.service';
import { IconComponent } from '../../atoms/icon/icon.component';
import { UserService } from '@services/user/user.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';

@Component({
  selector: 'app-topbar',
  imports: [CommonModule, IconComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Top navigation bar displaying the current page title, user info, and Python worker status. */
export class TopbarComponent {
  private readonly pageTitleService = inject(PageTitleService);
  private readonly userService = inject(UserService);
  private readonly workerPythonService = inject(WorkerPythonService);
  public currentPageTitle = toSignal(this.pageTitleService.pageTitle$, { initialValue: '' });
  public workerReady = toSignal(this.workerPythonService.ready$, { initialValue: true });
  public readonly workerError = toSignal(this.workerPythonService.pyodideLoadError$, { initialValue: false });
  public user = toSignal(this.userService.user$, { initialValue: null });
}
