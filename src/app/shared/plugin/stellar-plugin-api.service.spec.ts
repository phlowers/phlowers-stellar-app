/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { Section, Study } from '@shared/domain';
import { PluginDialogService } from '@shared/plugin/plugin-dialog.service';
import { StellarPluginApiService } from '@shared/plugin/stellar-plugin-api.service';
import { STELLAR_PLUGIN_API_VERSION } from '@shared/plugin/stellar-plugin.constantes';
import { StellarPluginApi, StellarPluginManifest } from '@shared/plugin/stellar-plugin.interfaces';

class FakeComponent {}

const PLUGIN: StellarPluginManifest = {
  id: 'fake-tool',
  apiVersion: STELLAR_PLUGIN_API_VERSION,
  placements: ['studio'],
  i18nScope: { scope: 'fake-tool' },
  titleKey: 'title',
  descriptionKey: 'description',
  loadComponent: () => Promise.resolve(FakeComponent)
};

const SECTION = { uuid: 'fake-section-uuid', name: 'Fake section', supports: [] } as unknown as Section;
const STUDY = { uuid: 'fake-study-uuid', title: 'Fake study' } as unknown as Study;

describe('StellarPluginApiService', () => {
  let api: StellarPluginApi;
  let plotService: { isStudioActive: ReturnType<typeof signal<boolean>>; study: ReturnType<typeof signal<Study | null>> };
  let spanService: { section: ReturnType<typeof signal<Section | null>> };
  let notification: Record<'success' | 'info' | 'warning' | 'error', ReturnType<typeof vi.fn>>;
  let logger: Record<'info' | 'warn' | 'error', ReturnType<typeof vi.fn>>;
  let dialog: { close: ReturnType<typeof vi.fn> };
  let langChanges$: BehaviorSubject<string>;

  beforeEach(() => {
    plotService = { isStudioActive: signal(true), study: signal<Study | null>(STUDY) };
    spanService = { section: signal<Section | null>(SECTION) };
    notification = { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() };
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    dialog = { close: vi.fn() };
    langChanges$ = new BehaviorSubject('en');

    TestBed.configureTestingModule({
      providers: [
        { provide: PlotService, useValue: plotService },
        { provide: PlotSpanService, useValue: spanService },
        { provide: NotificationService, useValue: notification },
        { provide: LoggerService, useValue: logger },
        { provide: PluginDialogService, useValue: dialog },
        { provide: TranslocoService, useValue: { langChanges$, getActiveLang: () => 'en' } }
      ]
    });
    api = TestBed.inject(StellarPluginApiService).create(PLUGIN);
  });

  it('should expose the current API version', () => {
    expect(api.apiVersion).toBe(STELLAR_PLUGIN_API_VERSION);
  });

  it('should freeze the API object', () => {
    expect(Object.isFrozen(api)).toBe(true);
    expect(Object.isFrozen(api.notify)).toBe(true);
    expect(Object.isFrozen(api.log)).toBe(true);
  });

  describe('section and study', () => {
    it('should expose frozen copies of the studio section and study', () => {
      expect(api.section()).toEqual(SECTION);
      expect(api.section()).not.toBe(SECTION);
      expect(Object.isFrozen(api.section())).toBe(true);
      expect(api.study()).toEqual(STUDY);
      expect(Object.isFrozen(api.study())).toBe(true);
    });

    it('should follow section changes', () => {
      const other = { ...SECTION, name: 'Other fake section' } as Section;

      spanService.section.set(other);

      expect(api.section()?.name).toBe('Other fake section');
    });

    it('should return null outside the studio', () => {
      plotService.isStudioActive.set(false);

      expect(api.section()).toBeNull();
      expect(api.study()).toBeNull();
    });

    it('should return null when no section is loaded', () => {
      spanService.section.set(null);
      plotService.study.set(null);

      expect(api.section()).toBeNull();
      expect(api.study()).toBeNull();
    });
  });

  it('should follow the active language', () => {
    expect(api.activeLang()).toBe('en');

    langChanges$.next('fr');

    expect(api.activeLang()).toBe('fr');
  });

  it.each(['success', 'info', 'warning', 'error'] as const)('should forward notify.%s to NotificationService', (level) => {
    api.notify[level]('Fake detail', 'Fake summary');

    expect(notification[level]).toHaveBeenCalledWith('Fake detail', 'Fake summary');
  });

  it.each(['info', 'warn', 'error'] as const)('should prefix log.%s with the plugin id', (level) => {
    api.log[level]('Fake message', { value: 1 });

    expect(logger[level]).toHaveBeenCalledWith('[plugin:fake-tool]', 'Fake message', { value: 1 });
  });

  it('should close the plugin dialog', () => {
    api.close();

    expect(dialog.close).toHaveBeenCalled();
  });
});
