/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TopbarComponent } from '../topbar/topbar.component';
import { AppSidebarComponent } from '../app-sidebar/app.sidebar';
import { AppWrapperService } from '../../service/app-wrapper.service';

@Component({
  selector: 'app-wrapper',
  standalone: true,
  imports: [CommonModule, TopbarComponent, AppSidebarComponent, RouterModule],
  templateUrl: './app-wrapper.component.html',
  styleUrl: './app-wrapper.component.scss'
})
export class AppWrapperComponent {
  menuOutsideClickListener: any;

  constructor(
    public appWrapperService: AppWrapperService,
    public renderer: Renderer2,
    public router: Router
  ) {}

  get containerClass() {
    return {
      'app-wrapper-static': this.appWrapperService.appWrapperConfig().menuMode === 'static',
      'app-wrapper-static-inactive': this.appWrapperService.appWrapperState().staticMenuDesktopInactive && this.appWrapperService.appWrapperConfig().menuMode === 'static'
    };
  }
}
