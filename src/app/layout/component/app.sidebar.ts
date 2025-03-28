/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, ElementRef } from '@angular/core';
import { AppMenu } from './app.menu';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [AppMenu],
  template: ` <div class="layout-sidebar">
    <app-menu></app-menu>
  </div>`
})
export class AppSidebar {
  constructor(public el: ElementRef) {}
}
