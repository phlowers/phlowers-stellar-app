import { signal, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { vi } from 'vitest';
import { PluginDialogService } from '@shared/plugin/plugin-dialog.service';
import { StellarPluginRegistryService } from '@shared/plugin/stellar-plugin-registry.service';
import { STELLAR_PLUGIN_API_VERSION } from '@shared/plugin/stellar-plugin.constantes';
import { StellarPluginEntry } from '@shared/plugin/stellar-plugin.interfaces';
import { ToolsComponent } from './tools.component';
import { TOOLS } from './tools.constantes';

const PLUGIN_ENTRY: StellarPluginEntry = {
  plugin: {
    id: 'fake-plugin',
    apiVersion: STELLAR_PLUGIN_API_VERSION,
    placements: ['home'],
    i18nScope: { scope: 'fake-plugin' },
    titleKey: 'title',
    descriptionKey: 'description',
    accentColor: 'var(--grey-700)',
    loadComponent: () => new Promise<Type<unknown>>(() => undefined)
  },
  title: 'Fake plugin',
  description: 'Fake plugin description'
};

describe('ToolsComponent', () => {
  let component: ToolsComponent;
  let fixture: ComponentFixture<ToolsComponent>;
  let pluginDialogService: PluginDialogService;

  const getAllByTestId = (testId: string): HTMLElement[] =>
    Array.from(document.body.querySelectorAll(`[data-testid="${testId}"]`));
  const getByTestId = (testId: string): HTMLElement | null => document.body.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'common.tools-label': 'Tools',
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
        ToolsComponent
      ],
      providers: [{ provide: StellarPluginRegistryService, useValue: { homeEntries: signal([PLUGIN_ENTRY]) } }]
    }).compileComponents();

    pluginDialogService = TestBed.inject(PluginDialogService);
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

  describe('HTML rendering - plugins', () => {
    it('should render one card per home plugin after the built-in tools', () => {
      const cards = getAllByTestId('plugin-tool-card');

      expect(cards.length).toBe(1);
      expect(cards[0].textContent).toContain('Fake plugin');
      expect(cards[0].textContent).toContain('Fake plugin description');
      expect(cards[0].querySelector('[data-testid="card-info-button"]')?.getAttribute('aria-label')).toBe(
        'Open tool Fake plugin'
      );
    });

    it('should expose the plugin accent color as a CSS custom property', () => {
      expect(getAllByTestId('plugin-tool-card')[0].style.getPropertyValue('--tool-accent')).toBe('var(--grey-700)');
    });

    it('should open the plugin dialog when the plugin card is clicked', () => {
      const openSpy = vi.spyOn(pluginDialogService, 'open');

      getAllByTestId('plugin-tool-card')[0]
        .querySelector<HTMLButtonElement>('[data-testid="card-info-button"]')
        ?.click();

      expect(openSpy).toHaveBeenCalledWith(PLUGIN_ENTRY);
      expect(component.selectedTool()).toBeNull();
    });
  });
});
