/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { ProviderScope, TranslocoService } from '@jsverse/transloco';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LoggerService } from '@core/services/logger/logger.service';
import { StellarPluginRegistryService } from '@shared/plugin/stellar-plugin-registry.service';
import { STELLAR_PLUGIN_API_VERSION } from '@shared/plugin/stellar-plugin.constantes';
import { provideStellarPlugin } from '@shared/plugin/stellar-plugin.helpers';
import { StellarPluginManifest } from '@shared/plugin/stellar-plugin.interfaces';

class FakeComponent {}

const buildPlugin = (overrides: Partial<StellarPluginManifest> = {}): StellarPluginManifest => ({
  id: 'fake-tool',
  apiVersion: STELLAR_PLUGIN_API_VERSION,
  placements: ['home', 'studio'],
  i18nScope: { scope: 'fake-tool' },
  titleKey: 'title',
  descriptionKey: 'description',
  loadComponent: () => Promise.resolve(FakeComponent),
  ...overrides
});

describe('StellarPluginRegistryService', () => {
  let logger: { error: ReturnType<typeof vi.fn> };
  let selectTranslate: ReturnType<typeof vi.fn>;

  const setup = (plugins: StellarPluginManifest[]): StellarPluginRegistryService => {
    TestBed.configureTestingModule({
      providers: [
        ...plugins.flatMap((plugin) => provideStellarPlugin(plugin)),
        { provide: LoggerService, useValue: logger },
        { provide: TranslocoService, useValue: { selectTranslate } }
      ]
    });
    return TestBed.inject(StellarPluginRegistryService);
  };

  beforeEach(() => {
    logger = { error: vi.fn() };
    selectTranslate = vi.fn(
      (key: string, _params: unknown, scope: ProviderScope): Observable<string> => of(`${scope.scope}:${key}`)
    );
  });

  it('should expose no entry when no plugin is registered', () => {
    const registry = setup([]);

    expect(registry.plugins).toEqual([]);
    expect(registry.entries()).toEqual([]);
    expect(selectTranslate).not.toHaveBeenCalled();
  });

  it('should resolve titles and descriptions in the plugin scope', () => {
    const plugin = buildPlugin();
    const registry = setup([plugin]);

    expect(registry.entries()).toEqual([
      { plugin, title: 'fake-tool:title', description: 'fake-tool:description' }
    ]);
    expect(selectTranslate).toHaveBeenCalledWith('title', {}, plugin.i18nScope);
  });

  it('should drop and log invalid plugins', () => {
    const valid = buildPlugin({ id: 'valid-tool' });
    const registry = setup([buildPlugin({ id: 'Invalid' }), valid]);

    expect(registry.plugins).toEqual([valid]);
    expect(logger.error).toHaveBeenCalledWith('Plugin id "Invalid" is not kebab-case.');
  });

  it('should split entries by placement', () => {
    const homeOnly = buildPlugin({ id: 'home-tool', placements: ['home'] });
    const studioOnly = buildPlugin({ id: 'studio-tool', placements: ['studio'] });
    const sectionTool = buildPlugin({ id: 'section-tool', requiresSection: true });
    const registry = setup([homeOnly, studioOnly, sectionTool]);

    expect(registry.homeEntries().map((entry) => entry.plugin.id)).toEqual(['home-tool']);
    expect(registry.studioEntries().map((entry) => entry.plugin.id)).toEqual(['studio-tool', 'section-tool']);
  });

  it('should fall back to the plugin id when its translations fail to load', () => {
    const error = new Error('Fake load failure');
    selectTranslate.mockReturnValue(throwError(() => error));
    const plugin = buildPlugin();

    const registry = setup([plugin]);

    expect(registry.entries()).toEqual([{ plugin, title: 'fake-tool', description: '' }]);
    expect(logger.error).toHaveBeenCalledWith('Translations of plugin "fake-tool" could not be loaded.', error);
  });
});
