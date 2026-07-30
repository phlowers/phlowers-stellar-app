import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { SidebarNavigation } from './logged-layout.interfaces';

@Component({
  selector: 'app-logged-layout',
  imports: [RouterModule, TopbarComponent, SidebarComponent],
  templateUrl: './logged-layout.component.html',
  styleUrl: './logged-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Main layout component for authenticated pages, including the sidebar and topbar. */
export class LoggedLayoutComponent {
  private readonly translocoService = inject(TranslocoService);
  private readonly _activeLang = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang()
  });

  public readonly sideBarNav = computed<SidebarNavigation>(() => {
    this._activeLang(); // re-compute when language changes
    return {
      main: [
        {
          id: 'sideB-home',
          label: this.translocoService.translate('shared.logged-layout.home'),
          route: '/',
          icon: 'home'
        },
        {
          id: 'sideB-studies',
          label: this.translocoService.translate('shared.logged-layout.studies'),
          route: '/studies',
          icon: 'folder'
        }
      ],
      footer: [
        {
          id: 'sideB-usrPref',
          label: this.translocoService.translate('shared.logged-layout.version-maj'),
          shortLabel: this.translocoService.translate('shared.logged-layout.ver-maj'),
          route: '/admin',
          icon: 'account_circle'
        }
      ]
    };
  });
}
