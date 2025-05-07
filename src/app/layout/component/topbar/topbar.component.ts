/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { Subscription } from 'rxjs';
import { WorkerService } from '../../../core/engine/worker/worker.service';
import { OnlineService } from '../../../core/api/services/online.service';
import { UpdateService } from '../../../core/update/update.service';
// import '@angular/localize';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterModule, CommonModule, StyleClassModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit {
  items!: MenuItem[];
  subscriptions = new Subscription();
  offline = true;
  workerReady = false;
  serverOnline = 'LOADING';

  serverOnlineMap: Record<string, { color: string; text: string }> = {
    ONLINE: {
      color: 'white',
      text: $localize`SERVER REACHABLE`
    },
    OFFLINE: {
      color: 'red',
      text: $localize`SERVER UNREACHABLE`
    },
    LOADING: {
      color: 'orange',
      text: $localize`REACHING SERVER`
    }
  };

  constructor(
    private onlineService: OnlineService,
    private workerService: WorkerService,
    public updateService: UpdateService
  ) {}

  ngOnInit() {
    // Process online status changes
    this.subscriptions.add(
      this.onlineService.online$.subscribe((online) => {
        this.offline = !online;
      })
    );
    this.subscriptions.add(
      this.workerService.ready$.subscribe((workerReady) => {
        this.workerReady = workerReady;
      })
    );
    this.subscriptions.add(
      this.onlineService.serverOnline$.subscribe((serverOnline) => {
        this.serverOnline = serverOnline;
      })
    );
  }
}
