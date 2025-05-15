import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Component, ViewChild } from '@angular/core';
import { SidebarComponent } from './sidebar.component';
import { SidebarItem } from './sidebar.model';

// Mock environment
jest.mock('../../../../environments/environment', () => ({
  environment: {
    version: '1.2.3'
  }
}));

// Create a test host component to provide inputs to our component
@Component({
  standalone: true,
  imports: [SidebarComponent, RouterLink, RouterLinkActive],
  template: `
    <app-sidebar
      [logoIconExpanded]="logoIconExpanded"
      [logoIconShrank]="logoIconShrank"
      [logoText]="logoText"
      [appVersionDisplay]="appVersionDisplay"
      [mainLinks]="mainLinks"
      [footerLinks]="footerLinks"
      [expanded]="expanded"
    >
    </app-sidebar>
  `
})
class TestHostComponent {
  @ViewChild(SidebarComponent) sidebarComponent!: SidebarComponent;

  logoIconExpanded = 'logo-large.svg';
  logoIconShrank = 'logo-small.svg';
  logoText = 'Test App';
  appVersionDisplay = true;
  expanded = true;

  mainLinks: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Dash',
      icon: 'home',
      route: '/dashboard'
    },
    {
      id: 'reports',
      label: 'Reports',
      shortLabel: 'Rep',
      icon: 'analytics',
      route: '/reports'
    }
  ];

  footerLinks: SidebarItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      shortLabel: 'Set',
      icon: 'settings',
      route: '/settings'
    },
    {
      id: 'help',
      label: 'Help',
      shortLabel: 'Help',
      icon: 'help',
      route: '/help'
    }
  ];
}

describe('SidebarComponent', () => {
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;
  let component: SidebarComponent;
  let mockBodyClassList: { add: jest.Mock; remove: jest.Mock };

  beforeEach(async () => {
    // Mock document.querySelector to return a mocked body element
    mockBodyClassList = {
      add: jest.fn(),
      remove: jest.fn()
    };

    const mockBody = document.createElement('body');
    mockBody.classList.add = mockBodyClassList.add;
    mockBody.classList.remove = mockBodyClassList.remove;

    jest.spyOn(document, 'querySelector').mockReturnValue(mockBody);

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => 'test'
              }
            }
          }
        }
      ]
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
    hostFixture.detectChanges(); // This will trigger ngOnInit lifecycle

    // Get the SidebarComponent instance from the host
    component = hostComponent.sidebarComponent;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with proper sidebar classes', () => {
    expect(mockBodyClassList.add).toHaveBeenCalledWith('has-sidebar');
    expect(mockBodyClassList.add).toHaveBeenCalledWith('has-sidebar--expanded');
  });

  it('should initialize with proper appVersion when environment version is set', () => {
    expect(component.appVersion()).toBe('1.2.3');
  });

  it('should initialize with fallback appVersion when environment version is not set', () => {
    // Create a new instance with mocked environment
    jest.resetModules();
    jest.mock('../../../../environments/environment', () => ({
      environment: {
        version: '{BUILD_VERSION}'
      }
    }));

    const tempFixture = TestBed.createComponent(TestHostComponent);
    tempFixture.detectChanges();

    expect(tempFixture.componentInstance.sidebarComponent.appVersion()).toBe(
      '0.0.00'
    );
  });

  it('should toggle menu and update DOM classes correctly', () => {
    // Initially set to expanded
    expect(component.expandedStatus()).toBe(true);

    // Toggle menu (to collapsed)
    component.toggleMenu();
    expect(component.expandedStatus()).toBe(false);
    expect(mockBodyClassList.remove).toHaveBeenCalledWith(
      'has-sidebar--expanded'
    );

    // Toggle menu again (back to expanded)
    component.toggleMenu();
    expect(component.expandedStatus()).toBe(true);
    expect(mockBodyClassList.add).toHaveBeenCalledWith('has-sidebar--expanded');
  });

  it('should display expanded logo when expanded', () => {
    // Menu is expanded by default in our setup
    hostFixture.detectChanges();

    const img = hostFixture.debugElement.query(
      By.css('.stelBar-header__link img')
    );
    expect(img.attributes['src']).toBe('in-app-logo/logo-large.svg');
    expect(img.attributes['alt']).toBe('Test App');
  });

  it('should display shrank logo when collapsed', () => {
    component.expandedStatus.set(false);
    hostFixture.detectChanges();

    const img = hostFixture.debugElement.query(
      By.css('.stelBar-header__link img')
    );
    expect(img.attributes['src']).toBe('in-app-logo/logo-small.svg');
    expect(img.attributes['alt']).toBe('Test App');
  });

  it('should show version when appVersionDisplay is true and sidebar is expanded', () => {
    // Default setup: appVersionDisplay=true, expanded=true
    hostFixture.detectChanges();

    const versionEl = hostFixture.debugElement.query(
      By.css('.stelBar-header__version-display')
    );
    expect(versionEl).toBeTruthy();
    expect(versionEl.nativeElement.textContent.trim()).toBe('v.1.2.3');
  });

  it('should not show version when appVersionDisplay is false', () => {
    hostComponent.appVersionDisplay = false;
    hostFixture.detectChanges();

    const versionEl = hostFixture.debugElement.query(
      By.css('.stelBar-header__version-display')
    );
    expect(versionEl).toBeFalsy();
  });

  it('should not show version when sidebar is collapsed', () => {
    component.expandedStatus.set(false);
    hostFixture.detectChanges();

    const versionEl = hostFixture.debugElement.query(
      By.css('.stelBar-header__version-display')
    );
    expect(versionEl).toBeFalsy();
  });

  it('should render main links correctly', () => {
    hostFixture.detectChanges();
    const mainLinks = hostFixture.debugElement.queryAll(
      By.css('.stelBar-main li a')
    );
    expect(mainLinks.length).toBe(hostComponent.mainLinks.length);

    expect(mainLinks[0].attributes['id']).toBe('dashboard');
    expect(mainLinks[0].attributes['routerLink']).toBe('/dashboard');

    expect(mainLinks[1].attributes['id']).toBe('reports');
    expect(mainLinks[1].attributes['routerLink']).toBe('/reports');
  });

  it('should render footer links correctly', () => {
    hostFixture.detectChanges();
    const footerLinks = hostFixture.debugElement.queryAll(
      By.css('.stelBar-footer ul li a')
    );
    expect(footerLinks.length).toBe(hostComponent.footerLinks.length);

    expect(footerLinks[0].attributes['id']).toBe('settings');
    expect(footerLinks[0].attributes['routerLink']).toBe('/settings');

    expect(footerLinks[1].attributes['id']).toBe('help');
    expect(footerLinks[1].attributes['routerLink']).toBe('/help');
  });

  it('should display full labels when expanded', () => {
    // Default setup is expanded
    hostFixture.detectChanges();

    const mainLinkLabels = hostFixture.debugElement.queryAll(
      By.css('.stelBar-main li a span:not(.app-icon)')
    );
    expect(mainLinkLabels[0].nativeElement.textContent.trim()).toBe(
      'Dashboard'
    );
    expect(mainLinkLabels[1].nativeElement.textContent.trim()).toBe('Reports');
  });

  it('should display short labels when collapsed', () => {
    component.expandedStatus.set(false);
    hostFixture.detectChanges();

    const mainLinkLabels = hostFixture.debugElement.queryAll(
      By.css('.stelBar-main li a span:not(.app-icon)')
    );
    expect(mainLinkLabels[0].nativeElement.textContent.trim()).toBe('Dash');
    expect(mainLinkLabels[1].nativeElement.textContent.trim()).toBe('Rep');
  });

  it('should display "Shrink menu" text when expanded', () => {
    // Default setup is expanded
    hostFixture.detectChanges();

    const toggleButton = hostFixture.debugElement.query(
      By.css('button.stellar-sidebar__link span:not(.app-icon)')
    );
    expect(toggleButton.nativeElement.textContent.trim()).toBe('Shrink menu');
  });

  it('should display "Menu" text when collapsed', () => {
    component.expandedStatus.set(false);
    hostFixture.detectChanges();

    const toggleButton = hostFixture.debugElement.query(
      By.css('button.stellar-sidebar__link span:not(.app-icon)')
    );
    expect(toggleButton.nativeElement.textContent.trim()).toBe('Menu');
  });

  it('should toggle menu when button is clicked', () => {
    jest.spyOn(component, 'toggleMenu');
    const toggleButton = hostFixture.debugElement.query(
      By.css('button.stellar-sidebar__link')
    );

    toggleButton.triggerEventHandler('click', null);
    expect(component.toggleMenu).toHaveBeenCalled();
  });

  // Additional tests to verify input binding changes
  it('should respond to changes in input properties', () => {
    // Change the logo text
    hostComponent.logoText = 'New App Name';
    hostFixture.detectChanges();

    const logoSr = hostFixture.debugElement.query(
      By.css('.stelBar-header__link .sr-only')
    );
    expect(logoSr.nativeElement.textContent.trim()).toBe('New App Name');
  });

  it('should update displayed links when input links change', () => {
    // Add a new link to mainLinks
    hostComponent.mainLinks = [
      ...hostComponent.mainLinks,
      {
        id: 'new-link',
        label: 'New Link',
        shortLabel: 'New',
        icon: 'add',
        route: '/new'
      }
    ];
    hostFixture.detectChanges();

    const mainLinks = hostFixture.debugElement.queryAll(
      By.css('.stelBar-main li a')
    );
    expect(mainLinks.length).toBe(3);
    expect(mainLinks[2].attributes['id']).toBe('new-link');
  });
});
