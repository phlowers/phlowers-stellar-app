/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PageTitleService } from '@shared/service/page-title/page-title.service';
import { IconComponent } from '../../atoms/icon/icon.component';
import { UserService } from '@services/user/user.service';
import { User } from '@core/domain';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';

@Component({
  selector: 'app-topbar',
  imports: [CommonModule, IconComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Top navigation bar displaying the current page title, user info, and Python worker status. */
export class TopbarComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();
  private readonly pageTitleService = inject(PageTitleService);
  private readonly userService = inject(UserService);
  private readonly workerPythonService = inject(WorkerPythonService);
  public currentPageTitle = signal<string>('');
  public workerReady = signal<boolean>(true);
  public readonly workerError = signal<boolean>(false);
  public user = signal<User | null>(null);

  ngOnInit() {
    this.subscriptions.add(
      this.pageTitleService.pageTitle$.subscribe((title) => {
        this.currentPageTitle.set(title);
      })
    );
    this.subscriptions.add(
      this.userService.user$.subscribe((user) => {
        this.user.set(user);
      })
    );
    this.subscriptions.add(
      this.workerPythonService.ready$.subscribe((ready) => {
        this.workerReady.set(ready);
      })
    );
    this.subscriptions.add(
      this.workerPythonService.pyodideLoadError$.subscribe((error) => {
        this.workerError.set(error);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
