/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PluginDialogService } from '@shared/plugin/plugin-dialog.service';
import {
  STELLAR_PLUGIN_API_VERSION,
  STELLAR_PLUGIN_CLOSE_CLEANUP_DELAY_MS
} from '@shared/plugin/stellar-plugin.constantes';
import { StellarPluginEntry } from '@shared/plugin/stellar-plugin.interfaces';

class FakeComponent {}

const buildEntry = (id: string): StellarPluginEntry => ({
  plugin: {
    id,
    apiVersion: STELLAR_PLUGIN_API_VERSION,
    placements: ['home'],
    i18nScope: { scope: id },
    titleKey: 'title',
    descriptionKey: 'description',
    loadComponent: () => Promise.resolve(FakeComponent)
  },
  title: `Title ${id}`,
  description: `Description ${id}`
});

describe('PluginDialogService', () => {
  let service: PluginDialogService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PluginDialogService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start closed without active entry', () => {
    expect(service.isOpen()).toBe(false);
    expect(service.activeEntry()).toBeNull();
  });

  it('should open the dialog on the given entry', () => {
    const entry = buildEntry('fake-tool');

    service.open(entry);

    expect(service.isOpen()).toBe(true);
    expect(service.activeEntry()).toBe(entry);
  });

  it('should close immediately and clear the entry after the close animation', () => {
    service.open(buildEntry('fake-tool'));

    service.close();

    expect(service.isOpen()).toBe(false);
    expect(service.activeEntry()).not.toBeNull();

    vi.advanceTimersByTime(STELLAR_PLUGIN_CLOSE_CLEANUP_DELAY_MS);

    expect(service.activeEntry()).toBeNull();
  });

  it('should not clear a plugin opened while the previous one is closing', () => {
    service.open(buildEntry('first-tool'));
    service.close();
    const second = buildEntry('second-tool');

    service.open(second);
    vi.advanceTimersByTime(STELLAR_PLUGIN_CLOSE_CLEANUP_DELAY_MS);

    expect(service.isOpen()).toBe(true);
    expect(service.activeEntry()).toBe(second);
  });

  it('should restart the cleanup delay on successive closes', () => {
    service.open(buildEntry('fake-tool'));
    service.close();
    vi.advanceTimersByTime(STELLAR_PLUGIN_CLOSE_CLEANUP_DELAY_MS - 1);

    service.close();
    vi.advanceTimersByTime(1);

    expect(service.activeEntry()).not.toBeNull();

    vi.advanceTimersByTime(STELLAR_PLUGIN_CLOSE_CLEANUP_DELAY_MS);

    expect(service.activeEntry()).toBeNull();
  });
});
