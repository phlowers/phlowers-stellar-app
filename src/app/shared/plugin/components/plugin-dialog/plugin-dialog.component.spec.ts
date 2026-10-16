/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, inject, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { vi } from 'vitest';
import { LoggerService } from '@core/services/logger/logger.service';
import { PluginDialogComponent } from '@shared/plugin/components/plugin-dialog/plugin-dialog.component';
import { PluginDialogService } from '@shared/plugin/plugin-dialog.service';
import { StellarPluginApiService } from '@shared/plugin/stellar-plugin-api.service';
import {
  STELLAR_PLUGIN_API,
  STELLAR_PLUGIN_API_VERSION,
  STELLAR_PLUGIN_DEFAULT_DIALOG_STYLE
} from '@shared/plugin/stellar-plugin.constantes';
import { StellarPluginApi, StellarPluginEntry, StellarPluginManifest } from '@shared/plugin/stellar-plugin.interfaces';

@Component({
  selector: 'app-fake-plugin',
  template: '<p data-testid="fake-plugin">API v{{ api.apiVersion }}</p>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
class FakePluginComponent {
  readonly api = inject(STELLAR_PLUGIN_API);
}

interface Deferred {
  promise: Promise<Type<unknown>>;
  resolve: (component: Type<unknown>) => void;
  reject: (error: unknown) => void;
}

const defer = (): Deferred => {
  let resolve!: Deferred['resolve'];
  let reject!: Deferred['reject'];
  const promise = new Promise<Type<unknown>>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const buildEntry = (overrides: Partial<StellarPluginManifest> = {}): StellarPluginEntry => ({
  plugin: {
    id: 'fake-tool',
    apiVersion: STELLAR_PLUGIN_API_VERSION,
    placements: ['home'],
    i18nScope: { scope: 'fake-tool' },
    titleKey: 'title',
    descriptionKey: 'description',
    loadComponent: () => Promise.resolve(FakePluginComponent),
    ...overrides
  },
  title: 'Fake tool',
  description: 'Fake description'
});

describe('PluginDialogComponent', () => {
  let fixture: ComponentFixture<PluginDialogComponent>;
  let component: PluginDialogComponent;
  let dialogService: PluginDialogService;
  let logger: { error: ReturnType<typeof vi.fn> };
  let apiService: { create: ReturnType<typeof vi.fn> };
  const fakeApi = { apiVersion: STELLAR_PLUGIN_API_VERSION } as StellarPluginApi;

  const getByTestId = (testId: string): HTMLElement | null => document.body.querySelector(`[data-testid="${testId}"]`);

  const openAndSettle = async (entry: StellarPluginEntry): Promise<void> => {
    dialogService.open(entry);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    logger = { error: vi.fn() };
    apiService = { create: vi.fn(() => fakeApi) };

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'common.loading': 'Loading',
              'shared.plugin-dialog.load-error': 'The tool could not be loaded.'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        PluginDialogComponent
      ],
      providers: [
        { provide: LoggerService, useValue: logger },
        { provide: StellarPluginApiService, useValue: apiService }
      ]
    }).compileComponents();

    dialogService = TestBed.inject(PluginDialogService);
    fixture = TestBed.createComponent(PluginDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('HTML rendering - closed state', () => {
    it('should not render the dialog body while closed', () => {
      expect(getByTestId('plugin-dialog-body')).toBeNull();
    });
  });

  describe('HTML rendering - loading state', () => {
    it('should show a busy loading status until the component is loaded', async () => {
      const deferred = defer();
      dialogService.open(buildEntry({ loadComponent: () => deferred.promise }));
      fixture.detectChanges();

      expect(getByTestId('plugin-dialog-body')?.getAttribute('aria-busy')).toBe('true');
      expect(getByTestId('plugin-dialog-loading')?.getAttribute('role')).toBe('status');
      expect(getByTestId('plugin-dialog-loading')?.textContent).toContain('Loading');

      deferred.resolve(FakePluginComponent);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(getByTestId('plugin-dialog-body')?.getAttribute('aria-busy')).toBe('false');
      expect(getByTestId('plugin-dialog-loading')).toBeNull();
    });
  });

  describe('HTML rendering - loaded plugin', () => {
    it('should render the plugin component with its own API', async () => {
      const entry = buildEntry();

      await openAndSettle(entry);

      expect(getByTestId('fake-plugin')?.textContent).toContain(`API v${STELLAR_PLUGIN_API_VERSION}`);
      expect(apiService.create).toHaveBeenCalledWith(entry.plugin);
    });

    it('should display the plugin title as dialog header', async () => {
      await openAndSettle(buildEntry());

      expect(document.body.textContent).toContain('Fake tool');
    });
  });

  describe('HTML rendering - load error', () => {
    it('should show an assertive error and log it when the component fails to load', async () => {
      const error = new Error('Fake chunk failure');

      await openAndSettle(buildEntry({ loadComponent: () => Promise.reject(error) }));

      const message = getByTestId('plugin-dialog-error');
      expect(message?.getAttribute('role')).toBe('alert');
      expect(message?.getAttribute('aria-live')).toBe('assertive');
      expect(message?.textContent).toContain('The tool could not be loaded.');
      expect(logger.error).toHaveBeenCalledWith('Plugin "fake-tool" could not be loaded.', error);
    });
  });

  describe('Stale loads', () => {
    it('should ignore a component resolved after another plugin was opened', async () => {
      const deferred = defer();
      dialogService.open(buildEntry({ id: 'slow-tool', loadComponent: () => deferred.promise }));
      fixture.detectChanges();
      const current = buildEntry({ id: 'current-tool', loadComponent: () => new Promise(() => undefined) });
      dialogService.open(current);
      fixture.detectChanges();

      deferred.resolve(FakePluginComponent);
      await fixture.whenStable();

      expect(component.component()).toBeNull();
      expect(component.isLoading()).toBe(true);
    });

    it('should ignore a failure raised after another plugin was opened', async () => {
      const deferred = defer();
      dialogService.open(buildEntry({ id: 'slow-tool', loadComponent: () => deferred.promise }));
      fixture.detectChanges();
      dialogService.open(buildEntry({ id: 'current-tool' }));
      fixture.detectChanges();

      deferred.reject(new Error('Fake chunk failure'));
      await fixture.whenStable();

      expect(component.hasLoadError()).toBe(false);
    });
  });

  describe('dialogStyle', () => {
    it('should use the default style without active plugin', () => {
      expect(component.dialogStyle()).toEqual(STELLAR_PLUGIN_DEFAULT_DIALOG_STYLE);
    });

    it('should use the default style when the plugin declares none', () => {
      dialogService.open(buildEntry());

      expect(component.dialogStyle()).toEqual(STELLAR_PLUGIN_DEFAULT_DIALOG_STYLE);
    });

    it('should use the plugin dialog style when declared', () => {
      const dialogStyle = { width: '20rem' };
      dialogService.open(buildEntry({ dialogStyle }));

      expect(component.dialogStyle()).toBe(dialogStyle);
    });
  });

  describe('Closing', () => {
    it('should close the dialog when it becomes hidden', () => {
      const closeSpy = vi.spyOn(dialogService, 'close');

      component.onVisibleChange(false);

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should not close the dialog when it becomes visible', () => {
      const closeSpy = vi.spyOn(dialogService, 'close');

      component.onVisibleChange(true);

      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should reset the content once the active plugin is cleared', async () => {
      await openAndSettle(buildEntry());

      dialogService.activeEntry.set(null);
      fixture.detectChanges();

      expect(component.component()).toBeNull();
      expect(component.isLoading()).toBe(false);
    });

    it('should close an open plugin when the host is destroyed', () => {
      dialogService.open(buildEntry());
      const closeSpy = vi.spyOn(dialogService, 'close');

      fixture.destroy();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should not close anything when destroyed while closed', () => {
      const closeSpy = vi.spyOn(dialogService, 'close');

      fixture.destroy();

      expect(closeSpy).not.toHaveBeenCalled();
    });
  });
});
