import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';

// Mock package.json version
jest.mock('../../../../../package.json', () => ({
  version: '1.0.0-test'
}));

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let mockBodyElement: HTMLBodyElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    // Create a mock body element
    mockBodyElement = document.createElement('body');
    jest.spyOn(document, 'querySelector').mockReturnValue(mockBodyElement);

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Sidebar Template Rendering', () => {
    it('should render expanded logo when expanded', () => {
      expect(component.logoIconExpanded()).toBe('expanded-logo.svg');
      component.expandedStatus.set(true);
      fixture.detectChanges();
      const logoImg = fixture.debugElement.query(By.css('img'));
      expect(logoImg.nativeElement.src).toContain('expanded-logo.svg');
    });

    it('should render shrank logo when collapsed', () => {
      expect(component.logoIconShrank()).toBe('shrank-logo.svg');
      component.expandedStatus.set(false);
      fixture.detectChanges();

      const logoImg = fixture.debugElement.query(By.css('img'));
      expect(logoImg.nativeElement.src).toContain('shrank-logo.svg');
    });

    it('should hide version when appVersionDisplay is false', () => {
      expect(component.appVersionDisplay()).toBe(false);
      component.expandedStatus.set(true);
      fixture.detectChanges();

      const versionElement = fixture.debugElement.query(
        By.css('.stelBar-header__version-display')
      );
      expect(versionElement).toBeNull();
    });
  });

  describe('Event Handlers', () => {
    it('should toggle menu and update body classes', () => {
      const bodyElement = document.body;
      component.toggleMenu();
      fixture.detectChanges();

      expect(component.expandedStatus()).toBe(false);
      expect(
        bodyElement.classList.contains('has-sidebar--shrank')
      ).toBeTruthy();
    });
  });

  describe('ngOnInit', () => {
    it('should add has-sidebar class to body', () => {
      component.ngOnInit();
      expect(mockBodyElement.classList.contains('has-sidebar')).toBeTruthy();
    });

    it('should add has-sidebar--expanded class when expanded', () => {
      // Create a new component with a custom input
      const customComponent = new SidebarComponent();
      Object.defineProperty(customComponent, 'expanded', {
        get: () => signal(true)
      });

      // Mock querySelector again for this component instance
      jest.spyOn(document, 'querySelector').mockReturnValue(mockBodyElement);

      customComponent.ngOnInit();
      expect(
        mockBodyElement.classList.contains('has-sidebar--expanded')
      ).toBeTruthy();
    });

    it('should add has-sidebar--shrank class when not expanded', () => {
      // Create a new component with a custom input
      const customComponent = new SidebarComponent();
      Object.defineProperty(customComponent, 'expanded', {
        get: () => signal(false)
      });

      // Mock querySelector again for this component instance
      jest.spyOn(document, 'querySelector').mockReturnValue(mockBodyElement);

      customComponent.ngOnInit();
      expect(
        mockBodyElement.classList.contains('has-sidebar--shrank')
      ).toBeTruthy();
    });
  });

  describe('toggleMenu', () => {
    it('should toggle expandedStatus', () => {
      const initialStatus = component.expandedStatus();
      component.toggleMenu();
      expect(component.expandedStatus()).toBe(!initialStatus);
    });
  });

  describe('constructor', () => {
    it('should set app version from package.json', () => {
      expect(component.appVersion()).toBe('1.0.0-test');
    });
  });

  describe('input properties', () => {
    it('should have correct default values', () => {
      // Expanded input
      expect(component.expanded()).toBe(true);

      // Other inputs default to undefined or their set default
      expect(component.logoIconExpanded()).toBeUndefined();
      expect(component.appVersionDisplay()).toBe(true);
    });

    it('should allow checking input values', () => {
      // Create test cases to verify input behavior
      const testCases = [
        {
          input: 'logoIconExpanded',
          value: 'custom-expanded-logo.svg'
        },
        {
          input: 'logoIconShrank',
          value: 'custom-shrank-logo.svg'
        },
        {
          input: 'logoText',
          value: 'Test Logo'
        },
        {
          input: 'appVersionDisplay',
          value: false
        }
      ];

      testCases.forEach(({ input, value }) => {
        // Create a new component
        const testComponent = new SidebarComponent();

        // Create a mock input signal with the test value
        const mockSignal = signal(value);

        // Override the input with the mock signal
        Object.defineProperty(testComponent, input, {
          get: () => mockSignal
        });

        // Verify the input value
        expect(testComponent[input as keyof SidebarComponent]()).toBe(value);
      });
    });
  });

  describe('initial signals', () => {
    it('should have correct initial signal values', () => {
      expect(component.expandedStatus()).toBe(true);
      expect(component.appLogoRoot()).toBe('in-app-logo/');
    });
  });

  describe('Accessibility and Routing', () => {
    it('should have correct aria attributes on links', () => {
      const links = fixture.debugElement.queryAll(
        By.css('.stellar-sidebar__link')
      );
      links.forEach((link) => {
        expect(link.attributes['ariaCurrentWhenActive']).toBe('page');
      });
    });

    it('should generate correct router links', () => {
      expect(component.mainLinks()).toBe([
        {
          id: 'home',
          route: '/home',
          label: 'Home',
          shortLabel: 'H',
          icon: 'home'
        }
      ]);
      fixture.detectChanges();

      const homeLink = fixture.debugElement.query(
        By.css('[routerLink="/home"]')
      );
      expect(homeLink).toBeTruthy();
    });
  });
});
