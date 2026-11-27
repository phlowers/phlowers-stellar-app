/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { vi } from 'vitest';
import { Section, STELLAR_PLUGIN_API, STELLAR_PLUGIN_API_VERSION, StellarPluginApi } from '@shared/plugin/stellar-plugin';
import { HelloWorldComponent } from '@plugins/hello-world/hello-world.component';
import en from '@plugins/hello-world/i18n/en.json';

describe('HelloWorldComponent', () => {
  let fixture: ComponentFixture<HelloWorldComponent>;
  let section: ReturnType<typeof signal<Section | null>>;
  let api: {
    notify: { info: ReturnType<typeof vi.fn> };
    log: { info: ReturnType<typeof vi.fn> };
    close: ReturnType<typeof vi.fn>;
  };

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const render = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    section = signal<Section | null>(null);
    api = { notify: { info: vi.fn() }, log: { info: vi.fn() }, close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {}, 'hello-world/en': en },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        HelloWorldComponent
      ],
      providers: [
        {
          provide: STELLAR_PLUGIN_API,
          useValue: { ...api, apiVersion: STELLAR_PLUGIN_API_VERSION, section } as unknown as StellarPluginApi
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HelloWorldComponent);
    await render();
  });

  describe('HTML rendering - structure', () => {
    it('should render the plugin as a section with a greeting', () => {
      const root = getByTestId('hello-world-plugin');

      expect(root?.tagName).toBe('SECTION');
      expect(root?.textContent).toContain(en.greeting);
    });

    it('should render the close and notify buttons', () => {
      expect(getByTestId('hello-world-close-btn')?.tagName).toBe('BUTTON');
      expect(getByTestId('hello-world-close-btn')?.textContent).toContain(en.close);
      expect(getByTestId('hello-world-notify-btn')?.tagName).toBe('BUTTON');
      expect(getByTestId('hello-world-notify-btn')?.textContent).toContain(en.notify);
    });
  });

  describe('HTML rendering - dynamic content', () => {
    it('should invite to open a section when none is available', () => {
      expect(getByTestId('hello-world-no-section')?.getAttribute('role')).toBe('status');
      expect(getByTestId('hello-world-no-section')?.textContent).toContain(en['no-section']);
      expect(getByTestId('hello-world-section')).toBeNull();
    });

    it('should show the section name and support count', async () => {
      section.set({ name: 'Fake section', supports: [{}, {}] } as unknown as Section);
      await render();

      expect(getByTestId('hello-world-section-name')?.textContent).toContain('Fake section');
      expect(getByTestId('hello-world-support-count')?.textContent).toContain('2');
      expect(getByTestId('hello-world-no-section')).toBeNull();
    });
  });

  describe('Actions', () => {
    it('should send a translated notification and log it', () => {
      getByTestId('hello-world-notify-btn')?.click();

      expect(api.notify.info).toHaveBeenCalledWith(en['notify-detail']);
      expect(api.log.info).toHaveBeenCalledWith('Notification sent');
    });

    it('should close the plugin dialog', () => {
      getByTestId('hello-world-close-btn')?.click();

      expect(api.close).toHaveBeenCalled();
    });
  });
});
