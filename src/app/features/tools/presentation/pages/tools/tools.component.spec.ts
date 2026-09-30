import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ToolsComponent } from './tools.component';
import { TOOLS } from './tools.constantes';

describe('ToolsComponent', () => {
  let component: ToolsComponent;
  let fixture: ComponentFixture<ToolsComponent>;

  const getAllByTestId = (testId: string): HTMLElement[] =>
    Array.from(document.body.querySelectorAll(`[data-testid="${testId}"]`));
  const getByTestId = (testId: string): HTMLElement | null => document.body.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'routes.tools': 'Tools',
              'common.import.action.open': 'Open',
              'tools.aria-open-tool': 'Open tool {{ tool }}',
              'tools.coming-soon': 'Coming soon',
              'tools.items.ist-reduction.title': 'Tool A',
              'tools.items.ist-reduction.description': 'Description A',
              'tools.items.wind-pressure.title': 'Tool B',
              'tools.items.wind-pressure.description': 'Description B',
              'tools.items.support-explorer.title': 'Tool C',
              'tools.items.support-explorer.description': 'Description C'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        ToolsComponent,
        BrowserAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ToolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('HTML rendering - tools list', () => {
    it('should render the tools page section with an accessible label', () => {
      const page = getByTestId('tools-page');

      expect(page?.tagName).toBe('SECTION');
      expect(page?.getAttribute('aria-label')).toBe('Tools');
    });

    it('should render one card per tool', () => {
      expect(getAllByTestId('tool-card').length).toBe(TOOLS.length);
    });

    it('should render translated title, description and open action on each card', () => {
      const firstCard = getAllByTestId('tool-card')[0];

      expect(firstCard.textContent).toContain('Tool A');
      expect(firstCard.textContent).toContain('Description A');
      expect(firstCard.querySelector('[data-testid="card-info-button"]')?.getAttribute('aria-label')).toBe(
        'Open tool Tool A'
      );
    });

    it('should expose the tool accent color as a CSS custom property', () => {
      const firstCard = getAllByTestId('tool-card')[0];

      expect(firstCard.style.getPropertyValue('--tool-accent')).toBe(TOOLS[0].accentColor);
    });
  });

  describe('Tool dialog', () => {
    it('should not display the dialog content initially', () => {
      expect(component.selectedTool()).toBeNull();
      expect(getByTestId('tool-dialog-content')).toBeNull();
    });

    it('should open the dialog for the clicked tool', () => {
      const secondCardButton = getAllByTestId('tool-card')[1].querySelector<HTMLButtonElement>(
        '[data-testid="card-info-button"]'
      );

      secondCardButton?.click();
      fixture.detectChanges();

      expect(component.selectedTool()).toBe(TOOLS[1]);
      expect(getByTestId('tool-dialog-content')?.textContent).toContain('Coming soon');
    });

    it('should clear the selected tool when the dialog is hidden', () => {
      component.openTool(TOOLS[0]);

      component.onVisibleChange(false);

      expect(component.selectedTool()).toBeNull();
    });

    it('should keep the selected tool when visibility changes to true', () => {
      component.openTool(TOOLS[2]);

      component.onVisibleChange(true);

      expect(component.selectedTool()).toBe(TOOLS[2]);
    });
  });
});
