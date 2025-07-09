import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';
import { PossibleIconNames, ALL_ICONS } from '@ui/shared/model/icon.model';

describe('IconComponent', () => {
  let component: IconComponent;
  let fixture: ComponentFixture<IconComponent>;
  let mockDocumentFonts: any;

  beforeEach(async () => {
    mockDocumentFonts = {
      check: jest.fn(),
      load: jest.fn()
    };

    Object.defineProperty(document, 'fonts', {
      value: mockDocumentFonts,
      writable: true
    });

    jest.spyOn(console, 'warn').mockImplementation(jest.fn());

    await TestBed.configureTestingModule({
      imports: [IconComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(IconComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    });

    it('should have aria-label attribute with icon name', () => {
      fixture.detectChanges();
      const element = fixture.nativeElement;
      expect(element.getAttribute('aria-label')).toBe('home');
    });

    it('should update aria-label when icon changes', () => {
      fixture.detectChanges();
      const element = fixture.nativeElement;

      fixture.componentRef.setInput('icon', 'search');
      fixture.detectChanges();
      expect(element.getAttribute('aria-label')).toBe('search');

      fixture.componentRef.setInput('icon', 'settings');
      fixture.detectChanges();
      expect(element.getAttribute('aria-label')).toBe('settings');
    });
  });

  describe('Font Loading', () => {
    it('should initialize symbolsReady as false', () => {
      expect(component.symbolsReady()).toBe(false);
    });

    it('should set symbolsReady to true when font is already loaded', async () => {
      mockDocumentFonts.check.mockReturnValue(true);

      fixture.componentRef.setInput('icon', 'home');
      fixture.detectChanges();

      await fixture.whenStable();

      expect(component.symbolsReady()).toBe(true);
    });

    it('should call document.fonts.check with correct parameters', () => {
      mockDocumentFonts.check.mockReturnValue(false);
      mockDocumentFonts.load.mockReturnValue(Promise.resolve());

      fixture.componentRef.setInput('icon', 'home');
      fixture.detectChanges();

      expect(mockDocumentFonts.check).toHaveBeenCalledWith(
        '1em "Material Symbols Rounded"'
      );
    });

    it('should set symbolsReady to true after font loads successfully', async () => {
      mockDocumentFonts.check.mockReturnValue(false);
      mockDocumentFonts.load.mockReturnValue(Promise.resolve());

      fixture.componentRef.setInput('icon', 'home');
      fixture.detectChanges();

      await fixture.whenStable();

      expect(mockDocumentFonts.load).toHaveBeenCalledWith(
        '1em "Material Symbols Rounded"'
      );
      expect(component.symbolsReady()).toBe(true);
    });

    it('should handle font loading failure gracefully', async () => {
      mockDocumentFonts.check.mockReturnValue(false);
      mockDocumentFonts.load.mockRejectedValue(
        new Error('Font loading failed')
      );

      fixture.componentRef.setInput('icon', 'home');
      fixture.detectChanges();

      await fixture.whenStable();

      expect(console.warn).toHaveBeenCalledWith(
        'Material Symbols Rounded font failed to load:',
        expect.any(Error)
      );
      expect(component.symbolsReady()).toBe(false);
    });

    it('should update symbolsReady signal when font state changes', async () => {
      mockDocumentFonts.check.mockReturnValue(false);
      mockDocumentFonts.load.mockReturnValue(Promise.resolve());

      fixture.componentRef.setInput('icon', 'home');
      fixture.detectChanges();

      expect(component.symbolsReady()).toBe(false);

      await fixture.whenStable();

      expect(component.symbolsReady()).toBe(true);
    });
  });

  describe('ngOnInit', () => {
    it('should call isSymbolsReady on initialization', () => {
      const isSymbolsReadySpy = jest.spyOn(component as any, 'isSymbolsReady');

      fixture.componentRef.setInput('icon', 'home');
      fixture.detectChanges();

      expect(isSymbolsReadySpy).toHaveBeenCalled();
    });

    it('should not be async and return void', () => {
      const result = component.ngOnInit();
      expect(result).toBeUndefined();
    });
  });
});
