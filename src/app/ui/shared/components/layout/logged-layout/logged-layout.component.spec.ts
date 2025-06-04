import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OnlineService } from '@core/services/online/online.service';
import { LoggedLayoutComponent } from './logged-layout.component';
import { SidebarItem } from '../sidebar/sidebar.model';

@Component({
  selector: 'app-topbar',
  template: ''
})
class MockTopbarComponent {}

@Component({
  selector: 'app-sidebar'
})
class MockSidebarComponent {
  logoIconExpanded = input<string>();
  logoIconShrank = input.required<string>();
  logoText = input.required<string>();
  appVersionDisplay = input<boolean>(true);
  mainLinks = input<SidebarItem[]>();
  footerLinks = input<SidebarItem[]>();
  expanded = input<boolean>(true);
}

describe('LoggedLayoutComponent', () => {
  let component: LoggedLayoutComponent;
  let fixture: ComponentFixture<LoggedLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoggedLayoutComponent],
      providers: [OnlineService]
    })
      .overrideComponent(LoggedLayoutComponent, {
        set: {
          imports: [MockTopbarComponent, MockSidebarComponent, RouterOutlet],
          template: `
            <app-topbar></app-topbar>
            <app-sidebar
              [logoIconExpanded]="'stellar-logo-expanded.svg'"
              [logoIconShrank]="'stellar-logo-shrank.svg'"
              [logoText]="'Stellar'"
              [mainLinks]="sideBarNav().main"
              [footerLinks]="sideBarNav().footer"
            />
            <main>
              <router-outlet></router-outlet>
            </main>
          `
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(LoggedLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have topbar, sidebar and router-outlet', () => {
    const compiled = fixture.nativeElement;
    const topbar = compiled.querySelector('app-topbar');
    const sidebar = compiled.querySelector('app-sidebar');
    const routerOutlet = compiled.querySelector('router-outlet');

    expect(topbar).toBeTruthy();
    expect(sidebar).toBeTruthy();
    expect(routerOutlet).toBeTruthy();
  });

  it('should pass correct props to sidebar component', () => {
    const sidebarNav = component.sideBarNav();

    expect(sidebarNav.main).toBeTruthy();
    expect(sidebarNav.footer).toBeTruthy();

    sidebarNav.main.forEach((item) => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('route');
      expect(item).toHaveProperty('icon');
    });

    sidebarNav.footer.forEach((item) => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('route');
      expect(item).toHaveProperty('icon');
    });
  });
});
