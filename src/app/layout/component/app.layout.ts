/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ActivatedRoute,
  NavigationEnd,
  ResolveEnd,
  Router,
  RouterModule,
  UrlSegment
} from '@angular/router';
import { AppTopbarComponent } from './app.topbar';
import { AppSidebarComponent } from './app.sidebar';
import { LayoutService } from '../service/layout.service';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    AppTopbarComponent,
    AppSidebarComponent,
    RouterModule,
    BreadcrumbModule
  ],
  template: `<div class="layout-wrapper" [ngClass]="containerClass">
    <app-topbar></app-topbar>
    <app-sidebar></app-sidebar>
    <div class="layout-main-container">
      <main class="layout-main">
        <p class="text-4xl">{{ currentRoute }}</p>
        <router-outlet></router-outlet>
      </main>
    </div>
  </div> `
})
export class AppLayoutComponent {
  menuOutsideClickListener: any;
  items = [
    { label: 'Studies', route: '' },
    { label: 'Admin', route: 'admin' },
    { label: 'Sections', route: 'sections' },
    { label: 'Plotly', route: 'plotly' },
    { label: 'Study', route: 'study' }
  ];

  currentRoute: string = '';

  ngOnInit() {
    this.router.events.subscribe((event: any) => {
      // const url = 'urlAfterRedirects' in event ? event.urlAfterRedirects : '';
      if (event instanceof ResolveEnd || event.routerEvent) {
        const urlAfterRedirects =
          event.urlAfterRedirects || event.routerEvent.urlAfterRedirects;
        const route = urlAfterRedirects.split('/')?.[1];
        this.currentRoute =
          this.items.find((item) => {
            return item.route === route;
          })?.label ?? '';
      }
    });
  }

  constructor(
    public layoutService: LayoutService,
    public renderer: Renderer2,
    public router: Router
  ) {}

  get containerClass() {
    return {
      'layout-static': this.layoutService.layoutConfig().menuMode === 'static',
      'layout-static-inactive':
        this.layoutService.layoutState().staticMenuDesktopInactive &&
        this.layoutService.layoutConfig().menuMode === 'static'
    };
  }
}
