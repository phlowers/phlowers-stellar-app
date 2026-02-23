import { Component, computed, input, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { SidebarItem } from './sidebar.model';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '@src/environments/environment';
import { IconComponent } from '../../atoms/icon/icon.component';

const version = environment.version;

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  encapsulation: ViewEncapsulation.None
})
/**
 * Collapsible sidebar navigation component.
 * Renders main and footer navigation links and persists its expanded/collapsed state in local storage.
 */
export class SidebarComponent implements OnInit {
  /** Path to the logo icon displayed when the sidebar is expanded. */
  logoIconExpanded = input<string>();
  /** Path to the logo icon displayed when the sidebar is collapsed. */
  logoIconShrank = input.required<string>();
  /** Application name displayed next to the logo. */
  logoText = input.required<string>();
  /** Whether to display the application version in the sidebar. */
  appVersionDisplay = input<boolean>(true);
  /** Navigation items rendered in the main section of the sidebar. */
  mainLinks = input<SidebarItem[]>();
  /** Navigation items rendered in the footer section of the sidebar. */
  footerLinks = input<SidebarItem[]>();
  /** Initial expanded state of the sidebar. */
  expanded = input<boolean>(true);

  private readonly bodyTag = signal<HTMLBodyElement | null>(null);
  /** Current expanded or collapsed state of the sidebar. */
  public expandedStatus = signal<boolean>(this.getInitialExpandedStatus());
  /** Application version string displayed in the sidebar. */
  public appVersion = signal<string>('');
  /** Root path for logo image assets. */
  public appLogoRoot = signal<string>('in-app-logo/');

  /** CSS class list applied to the sidebar element based on its expanded state. */
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

  /** Toggles the sidebar between expanded and collapsed states and persists the choice. */
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

  constructor() {
    if (version.includes('VERSION')) {
      this.appVersion.set('0.0.00');
    } else {
      this.appVersion.set(version);
    }
  }
}
