import { Component, signal } from '@angular/core';
import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { RouterModule } from '@angular/router';
import { SidebarItem } from '../sidebar/sidebar.model';

interface SidebarNavigation {
  main: SidebarItem[];
  footer: SidebarItem[];
}

@Component({
  selector: 'app-logged-layout',
  imports: [RouterModule, TopbarComponent, SidebarComponent],
  templateUrl: './logged-layout.component.html',
  styleUrl: './logged-layout.component.scss'
})
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
      },
      {
        id: 'sideB-section',
        label: $localize`Sections`,
        route: '/sections',
        icon: 'timeline'
      },
      // {
      //   id: 'sideB-tools',
      //   label: $localize`Tools`,
      //   route: '/tools',
      //   icon: 'build'
      // },
      {
        id: 'sideB-plotlyJs',
        label: 'Plotly JS POC',
        shortLabel: 'plot poc',
        route: '/plotly',
        icon: 'ssid_chart'
      }
      // {
      //   id: 'sideB-plotly3D',
      //   label: $localize`3D`,
      //   route: '/3d',
      //   icon: 'deployed_code'
      // }
    ],
    footer: [
      {
        id: 'sideB-usrPref',
        label: $localize`User preference`,
        shortLabel: $localize`usr pref`,
        route: '/admin',
        icon: 'Account_circle_filled'
      }
    ]
  });
}
