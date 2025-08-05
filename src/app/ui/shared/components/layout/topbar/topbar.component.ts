/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PageTitleService } from '@ui/shared/service/page-title/page-title.service';
import { IconComponent } from '../../atoms/icon/icon.component';
import { UserService } from '@src/app/core/services/user/user.service';
import { UserModel } from '@src/app/core/data/models/user.model';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';

@Component({
  selector: 'app-topbar',
  imports: [CommonModule, IconComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();
  public currentPageTitle = signal<string>('');
  public workerReady = signal<boolean>(true);
  public readonly workerError = signal<boolean>(false);
  public user = signal<UserModel | null>(null);

  constructor(
    private readonly pageTitleService: PageTitleService,
    private readonly userService: UserService,
    private readonly workerPythonService: WorkerPythonService
  ) {}

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
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
