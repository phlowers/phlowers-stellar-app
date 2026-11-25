import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
  ViewEncapsulation
} from '@angular/core';
import { SidebarItem } from './sidebar.model';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppConfigService } from '@core/config/app-config.service';
import { IconComponent } from '../../atoms/icon/icon.component';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-sidebar',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, IconComponent, TranslocoModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Collapsible navigation sidebar with expandable/shrank states persisted in local storage. */
export class SidebarComponent implements OnInit {
  /** Logo image path shown when the sidebar is expanded. */
  logoIconExpanded = input<string>();
  /** Logo image path shown when the sidebar is collapsed. */
  logoIconShrank = input.required<string>();
  /** Application name displayed next to the logo. */
  logoText = input.required<string>();
  /** Whether to display the version number in the sidebar. */
  appVersionDisplay = input<boolean>(true);
  /** Main navigation links rendered in the sidebar body. */
  mainLinks = input<SidebarItem[]>();
  /** Navigation links rendered in the sidebar footer. */
  footerLinks = input<SidebarItem[]>();
  /** Initial expanded state of the sidebar. */
  expanded = input<boolean>(true);

  private readonly bodyTag = signal<HTMLBodyElement | null>(null);
  public expandedStatus = signal<boolean>(this.getInitialExpandedStatus());
  private readonly appConfigService = inject(AppConfigService);
  /** Version shown in the sidebar header; `0.0.00` when the build placeholder was not substituted. */
  public appVersion = computed<string>(() => {
    const version = this.appConfigService.appVersion();
    return version.includes('VERSION') ? '0.0.00' : version;
  });
  public appLogoRoot = signal<string>('in-app-logo/');

  sidebarClass = computed(() => {
    return this.expandedStatus() ? 'stellar-sidebar stellar-sidebar--expanded' : 'stellar-sidebar';
  });

  private getInitialExpandedStatus(): boolean {
    const storedSidebarStatus = localStorage.getItem('expandedStatus');

    if (storedSidebarStatus !== null) {
      return JSON.parse(storedSidebarStatus);
    }

    return this.expanded();
  }

  ngOnInit(): void {
    this.bodyTag.set(document.querySelector('body'));

    if (this.bodyTag()) {
      this.bodyTag()!.classList.add('has-sidebar');

      if (this.expandedStatus()) {
        this.bodyTag()!.classList.add('has-sidebar--expanded');
      }
    }

    localStorage.setItem('expandedStatus', JSON.stringify(this.expandedStatus()));
  }

  toggleMenu(): void {
    this.expandedStatus.set(!this.expandedStatus());

    localStorage.setItem('expandedStatus', JSON.stringify(this.expandedStatus()));

    if (this.bodyTag()) {
      if (this.expandedStatus()) {
        this.bodyTag()!.classList.add('has-sidebar--expanded');
      } else {
        this.bodyTag()!.classList.remove('has-sidebar--expanded');
      }

      this.bodyTag()!.classList.add('has-sidebar--animation');
    }
  }
}
