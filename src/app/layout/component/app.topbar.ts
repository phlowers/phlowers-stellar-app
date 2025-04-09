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
import { LayoutService } from '../service/layout.service';
import { Subscription } from 'rxjs';
import { WorkerService } from '../../core/engine/worker/worker.service';
import { OnlineService } from '../../core/api/services/online.service';
import { UpdateService } from '../../core/update/update.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterModule, CommonModule, StyleClassModule],
  template: ` <div class="layout-topbar">
    <div class="layout-topbar-logo-container">
      <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
        <i class="pi pi-bars"></i>
      </button>
      <a class="layout-topbar-logo" routerLink="/">
        <span>STELLAR</span>
      </a>
    </div>

    <div class="layout-topbar-actions">
      <button class="layout-topbar-menu-button layout-topbar-action" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true">
        <i class="pi pi-ellipsis-v"></i>
      </button>
      <div *ngIf="updateService.needUpdate" class="layout-topbar-online" [ngStyle]="{ color: 'orange' }">UPDATE AVAILABLE</div>
      <div>|</div>
      <div class="layout-topbar-online" [ngStyle]="{ color: !workerReady ? 'red' : 'white' }">{{ workerReady === false ? 'ENGINE LOADING' : 'ENGINE READY' }}</div>
      <div>|</div>
      <div class="layout-topbar-online" [ngStyle]="{ color: offline ? 'red' : 'white' }">{{ offline === false ? 'ONLINE' : 'OFFLINE' }}</div>
      <div>|</div>
      <div class="layout-topbar-online" [ngStyle]="{ color: serverOnlineMap[serverOnline].color }">{{ serverOnlineMap[serverOnline].text }}</div>
    </div>
  </div>`
})
export class AppTopbarComponent implements OnInit {
  items!: MenuItem[];
  subscriptions = new Subscription();
  offline = true;
  workerReady = false;
  serverOnline = 'LOADING';

  serverOnlineMap: Record<string, { color: string; text: string }> = {
    ONLINE: {
      color: 'white',
      text: 'SERVER REACHABLE'
    },
    OFFLINE: {
      color: 'red',
      text: 'SERVER UNREACHABLE'
    },
    LOADING: {
      color: 'orange',
      text: 'REACHING SERVER'
    }
  };

  constructor(
    public layoutService: LayoutService,
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
