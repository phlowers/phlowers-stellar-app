import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';
import { PossibleIconNames, ALL_ICONS } from '../../../model/icons/icon.model';

describe('IconComponent', () => {
  let component: IconComponent;
  let fixture: ComponentFixture<IconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(IconComponent);
    component = fixture.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create', () => {
      fixture.componentRef.setInput('icon', 'home');
      expect(component).toBeTruthy();
    });

    it('should require icon input', () => {
      expect(component.icon).toBeDefined();
    });
  });

  describe('Input Properties', () => {
    it('should accept valid icon names', () => {
      const validIcons: PossibleIconNames[] = [
        'home',
        'search',
        'menu',
        'close',
        'settings'
      ];

      validIcons.forEach((iconName) => {
        fixture.componentRef.setInput('icon', iconName);
        expect(component.icon()).toBe(iconName);
      });
    });

    it('should handle all defined icon names from ALL_ICONS', () => {
      const sampleIcons = ALL_ICONS.slice(0, 10); // Test only first 10 icons (over 3600 in total)

      sampleIcons.forEach((iconName) => {
        fixture.componentRef.setInput('icon', iconName);
        expect(component.icon()).toBe(iconName);
      });
    });

    it('should update when icon input changes', () => {
      fixture.componentRef.setInput('icon', 'home');
      expect(component.icon()).toBe('home');

      fixture.componentRef.setInput('icon', 'search');
      expect(component.icon()).toBe('search');

      fixture.componentRef.setInput('icon', 'settings');
      expect(component.icon()).toBe('settings');
    });
  });

  describe('Template Rendering', () => {
    it('should render the icon name in template', () => {
      fixture.componentRef.setInput('icon', 'home');
      fixture.detectChanges();

      const element = fixture.nativeElement;
      expect(element.textContent.trim()).toBe('home');
    });

    it('should update rendered content when icon changes', () => {
      fixture.componentRef.setInput('icon', 'search');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent.trim()).toBe('search');

      fixture.componentRef.setInput('icon', 'menu');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent.trim()).toBe('menu');
    });

    it('should render different icon names correctly', () => {
      const testIcons: PossibleIconNames[] = [
        'home',
        'search',
        'close',
        'add',
        'delete'
      ];

      testIcons.forEach((iconName) => {
        fixture.componentRef.setInput('icon', iconName);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent.trim()).toBe(iconName);
      });
    });
  });

  describe('Host Bindings', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('icon', 'home');
      fixture.detectChanges();
    });

    it('should have aria-label attribute with icon name', () => {
      const element = fixture.nativeElement;
      expect(element.getAttribute('aria-label')).toBe('home');
    });

    it('should update aria-label when icon changes', () => {
      const element = fixture.nativeElement;

      fixture.componentRef.setInput('icon', 'search');
      fixture.detectChanges();
      expect(element.getAttribute('aria-label')).toBe('search');

      fixture.componentRef.setInput('icon', 'settings');
      fixture.detectChanges();
      expect(element.getAttribute('aria-label')).toBe('settings');
    });
  });
});
