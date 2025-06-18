import {
  Component,
  input,
  OnInit,
  signal,
  ViewEncapsulation
} from '@angular/core';
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
export class SidebarComponent implements OnInit {
  logoIconExpanded = input<string>();
  logoIconShrank = input.required<string>();
  logoText = input.required<string>();
  appVersionDisplay = input<boolean>(true);
  mainLinks = input<SidebarItem[]>();
  footerLinks = input<SidebarItem[]>();
  expanded = input<boolean>(true);

  private readonly bodyTag = signal<HTMLBodyElement | null>(null);
  public expandedStatus = signal<boolean>(this.getInitialExpandedStatus());
  public appVersion = signal<string>('');
  public appLogoRoot = signal<string>('in-app-logo/');

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

    localStorage.setItem(
      'expandedStatus',
      JSON.stringify(this.expandedStatus())
    );
  }

  toggleMenu(): void {
    this.expandedStatus.set(!this.expandedStatus());

    localStorage.setItem(
      'expandedStatus',
      JSON.stringify(this.expandedStatus())
    );

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
    if (version === '{BUILD_VERSION}') {
      this.appVersion.set('0.0.00');
    } else {
      this.appVersion.set(version);
    }
  }
}
