import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { RouterModule } from '@angular/router';
import { SidebarItem } from '../sidebar/sidebar.model';

/** Navigation structure grouping main and footer sidebar items. */
interface SidebarNavigation {
  /** Primary navigation links. */
  main: SidebarItem[];
  /** Footer navigation links. */
  footer: SidebarItem[];
}

@Component({
  selector: 'app-logged-layout',
  imports: [RouterModule, TopbarComponent, SidebarComponent],
  templateUrl: './logged-layout.component.html',
  styleUrl: './logged-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Main layout component for authenticated pages, including the sidebar and topbar. */
export class LoggedLayoutComponent {
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
