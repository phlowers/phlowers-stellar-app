import { Component, OnInit, signal } from '@angular/core';
import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SidebarItem } from '../sidebar/sidebar.model';
import { filter } from 'rxjs/operators';

/**
 * Navigation structure for the sidebar component.
 * @internal
 */
interface SidebarNavigation {
  /** Main navigation items */
  main: SidebarItem[];
  /** Footer navigation items */
  footer: SidebarItem[];
}

@Component({
  selector: 'app-logged-layout',
  imports: [RouterModule, TopbarComponent, SidebarComponent],
  templateUrl: './logged-layout.component.html',
  styleUrl: './logged-layout.component.scss'
})
/**
 * Main layout component for authenticated users.
 * Provides the top bar, sidebar navigation, and a router outlet for page content.
 */
export class LoggedLayoutComponent implements OnInit {
  currentRoute = window.location.pathname;

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.url;
    });
  }
  public readonly sideBarNav = signal<SidebarNavigation>({
    main: [
      {
        id: 'sideB-home',
        label: $localize`Home`,
        route: '/',
        icon: 'home'
      },
      {
        id: 'sideB-studies',
        label: $localize`Studies`,
        route: '/studies',
        icon: 'folder'
      }
    ],
    footer: [
      {
        id: 'sideB-usrPref',
        label: $localize`Version / MAJ`,
        shortLabel: $localize`Ver.MAJ`,
        route: '/admin',
        icon: 'account_circle'
      }
    ]
  });
}
