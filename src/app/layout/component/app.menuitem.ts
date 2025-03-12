import { Component, HostBinding, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RippleModule } from 'primeng/ripple';
import { MenuItem } from 'primeng/api';
import { LayoutService } from '../service/layout.service';

@Component({
  selector: '[app-menuitem]',
  imports: [CommonModule, RouterModule, RippleModule],
  template: `
    <ng-container>
      <a [routerLink]="item.routerLink" routerLinkActive="active-route" [routerLinkActiveOptions]="item.routerLinkActiveOptions || { paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' }" pRipple>
        <i [ngClass]="item.icon" class="layout-menuitem-icon"></i>
        <span class="layout-menuitem-text">{{ item.label }}</span>
        <i class="pi pi-fw pi-angle-down layout-submenu-toggler" *ngIf="item.items"></i>
      </a>

      <ul *ngIf="item.items && item.visible !== false">
        <ng-template ngFor let-child let-i="index" [ngForOf]="item.items">
          <li app-menuitem [item]="child" [index]="i" [parentKey]="key" [class]="child['badgeClass']"></li>
        </ng-template>
      </ul>
    </ng-container>
  `,
  animations: [],
  providers: [LayoutService]
})
export class AppMenuitem {
  @Input() item!: MenuItem;

  @Input() index!: number;

  @Input() @HostBinding('class.layout-root-menuitem') root!: boolean;

  @Input() parentKey!: string;

  key: string = '';

  constructor(public router: Router) {}
}
