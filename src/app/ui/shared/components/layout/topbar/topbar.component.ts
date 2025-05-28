/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { WorkerService } from '@core/engine/worker/worker.service';
import { OnlineService } from '@core/api/services/online.service';
import { UpdateService } from '@core/update/update.service';
import { PageTitleService } from '@core/api/services/page-title.service';

@Component({
  selector: 'app-topbar',
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();
  public currentPageTitle = signal<string>('');
  public offline = signal<boolean>(true);
  public workerReady = signal<boolean>(false);
  public serverOnline = signal<string>('Loading');

  constructor(
    private readonly pageTitleService: PageTitleService,
    private readonly onlineService: OnlineService,
    private readonly workerService: WorkerService,
    public updateService: UpdateService
  ) {}

  ngOnInit() {
    // Subscribe to page title
    this.subscriptions.add(
      this.pageTitleService.pageTitle$.subscribe((title) => {
        this.currentPageTitle.set(title);
      })
    );
    // Process online status changes
    this.subscriptions.add(
      this.onlineService.online$.subscribe((online) => {
        this.offline.set(!online);
      })
    );
    this.subscriptions.add(
      this.workerService.ready$.subscribe((workerReady) => {
        this.workerReady.set(workerReady);
      })
    );
    this.subscriptions.add(
      this.onlineService.serverOnline$.subscribe((serverOnline) => {
        this.serverOnline.set(serverOnline);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
