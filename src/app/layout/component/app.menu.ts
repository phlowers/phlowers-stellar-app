/* ngtsc:disable */
import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitemComponent } from './app.menuitem';

@Component({
  selector: 'app-menu',
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [CommonModule, AppMenuitemComponent, RouterModule],
  template: `<ul class="layout-menu">
    <ng-container *ngFor="let item of model; let i = index">
      <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
      <li *ngIf="item.separator" class="menu-separator"></li>
    </ng-container>
  </ul> `
})
export class AppMenuComponent implements OnInit {
  model: MenuItem[] = [];
  /**
   * Copyright (c) 2025, RTE (http://www.rte-france.com)
   * This Source Code Form is subject to the terms of the Mozilla Public
   * License, v. 2.0. If a copy of the MPL was not distributed with this
   * file, You can obtain one at http://mozilla.org/MPL/2.0/.
   */

  ngOnInit() {
    this.model = [
      {
        label: 'Home',
        items: [
          { label: $localize`Studies`, icon: 'pi pi-fw pi-share-alt', routerLink: ['/'] },
          { label: $localize`Sections`, icon: 'pi pi-fw pi-bolt', routerLink: ['/sections'] },
          { label: $localize`Tools`, icon: 'pi pi-fw pi-wrench', routerLink: ['/tools'] },
          { label: $localize`Admin`, icon: 'pi pi-fw pi-cog', routerLink: ['/admin'] },
          { label: $localize`test`, icon: 'pi pi-fw pi-database', routerLink: ['/offline-storage-poc'] }
        ]
      }
    ];
  }
}
