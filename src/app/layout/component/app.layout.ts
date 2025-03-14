import { Component, Renderer2, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AppTopbar } from './app.topbar';
import { AppSidebar } from './app.sidebar';
import { LayoutService } from '../service/layout.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, AppTopbar, AppSidebar, RouterModule],
  template: `<div class="layout-wrapper" [ngClass]="containerClass">
    <app-topbar></app-topbar>
    <app-sidebar></app-sidebar>
    <div class="layout-main-container">
      <div class="layout-main">
        <router-outlet></router-outlet>
      </div>
    </div>
  </div> `
})
export class AppLayout {
  menuOutsideClickListener: any;

  constructor(
    public layoutService: LayoutService,
    public renderer: Renderer2,
    public router: Router
  ) {}

  get containerClass() {
    return {
      'layout-static': this.layoutService.layoutConfig().menuMode === 'static',
      'layout-static-inactive': this.layoutService.layoutState().staticMenuDesktopInactive && this.layoutService.layoutConfig().menuMode === 'static'
    };
  }
}
