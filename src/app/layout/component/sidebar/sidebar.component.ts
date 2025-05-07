import {
  Component,
  input,
  OnInit,
  signal,
  ViewEncapsulation
} from '@angular/core';
import { SidebarItem } from './sidebar.model';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../../environments/environment';

const version = environment.version;

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
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

  private bodyTag = signal<HTMLBodyElement | null>(null);
  public expandedStatus = signal<boolean>(this.expanded());
  public appVersion = signal<string>('');
  public appLogoRoot = signal<string>('in-app-logo/');

  ngOnInit(): void {
    this.bodyTag.set(document.querySelector('body'));

    if (this.bodyTag()) {
      this.bodyTag()!.classList.add('has-sidebar');

      if (this.expandedStatus() === true) {
        this.bodyTag()!.classList.add('has-sidebar--expanded');
      } else if (this.expandedStatus() === false) {
        this.bodyTag()!.classList.add('has-sidebar--shrank');
      }
    }
  }

  toggleMenu(): void {
    this.expandedStatus.set(!this.expandedStatus());
    if (this.bodyTag()) {
      if (this.expandedStatus() === true) {
        this.bodyTag()!.classList.remove('has-sidebar--shrank');
        this.bodyTag()!.classList.add('has-sidebar--expanded');
      } else if (this.expandedStatus() === false) {
        this.bodyTag()!.classList.remove('has-sidebar--expanded');
        this.bodyTag()!.classList.add('has-sidebar--shrank');
      }
    }
  }

  constructor() {
    this.appVersion.set(version);
  }
}
