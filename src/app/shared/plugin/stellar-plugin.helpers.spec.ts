/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { STELLAR_PLUGIN_API_VERSION, STELLAR_PLUGINS } from '@shared/plugin/stellar-plugin.constantes';
import {
  formatPluginLogPrefix,
  isPluginAvailable,
  isPluginInPlacement,
  provideStellarPlugin,
  toReadonlySnapshot,
  validateStellarPlugins
} from '@shared/plugin/stellar-plugin.helpers';
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

describe('stellar-plugin.helpers', () => {
  describe('provideStellarPlugin', () => {
    it('should append manifests to the STELLAR_PLUGINS multi-provider in order', () => {
      const first = buildPlugin({ id: 'first' });
      const second = buildPlugin({ id: 'second' });
      TestBed.configureTestingModule({ providers: [...provideStellarPlugin(first), ...provideStellarPlugin(second)] });

      expect(TestBed.inject(STELLAR_PLUGINS)).toEqual([first, second]);
    });

    it('should default STELLAR_PLUGINS to an empty list when no plugin is registered', () => {
      TestBed.configureTestingModule({});

      expect(TestBed.inject(STELLAR_PLUGINS)).toEqual([]);
    });
  });

  describe('validateStellarPlugins', () => {
    it('should keep valid plugins without errors', () => {
      const plugin = buildPlugin();

      expect(validateStellarPlugins([plugin])).toEqual({ valid: [plugin], errors: [] });
    });

    it.each(['Fake', 'fake_tool', 'fake--tool', '-fake', '1fake', ''])('should reject the non kebab-case id "%s"', (id) => {
      const result = validateStellarPlugins([buildPlugin({ id })]);

      expect(result.valid).toEqual([]);
      expect(result.errors[0]).toContain('is not kebab-case');
    });

    it('should keep the first plugin when an id is registered twice', () => {
      const first = buildPlugin({ titleKey: 'first' });
      const duplicate = buildPlugin({ titleKey: 'duplicate' });

      const result = validateStellarPlugins([first, duplicate]);

      expect(result.valid).toEqual([first]);
      expect(result.errors).toEqual(['Plugin id "fake-tool" is registered more than once.']);
    });

    it('should reject a plugin targeting another API version', () => {
      const result = validateStellarPlugins([buildPlugin({ apiVersion: STELLAR_PLUGIN_API_VERSION + 1 })]);

      expect(result.valid).toEqual([]);
      expect(result.errors[0]).toContain(`expected v${STELLAR_PLUGIN_API_VERSION}`);
    });

    it('should reject a plugin without placement', () => {
      const result = validateStellarPlugins([buildPlugin({ placements: [] })]);

      expect(result.valid).toEqual([]);
      expect(result.errors).toEqual(['Plugin "fake-tool" declares no placement.']);
    });

    it('should not let an invalid plugin hide the valid ones', () => {
      const valid = buildPlugin({ id: 'valid-tool' });

      const result = validateStellarPlugins([buildPlugin({ id: 'Invalid' }), valid]);

      expect(result.valid).toEqual([valid]);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('isPluginInPlacement', () => {
    it('should return false when the placement is not declared', () => {
      expect(isPluginInPlacement(buildPlugin({ placements: ['studio'] }), 'home')).toBe(false);
    });

    it('should return true for a declared placement', () => {
      expect(isPluginInPlacement(buildPlugin({ placements: ['home'] }), 'home')).toBe(true);
      expect(isPluginInPlacement(buildPlugin({ placements: ['studio'] }), 'studio')).toBe(true);
    });

    it('should exclude plugins requiring a section from the home page', () => {
      expect(isPluginInPlacement(buildPlugin({ requiresSection: true }), 'home')).toBe(false);
    });

    it('should keep plugins requiring a section in the studio', () => {
      expect(isPluginInPlacement(buildPlugin({ requiresSection: true }), 'studio')).toBe(true);
    });
  });

  describe('isPluginAvailable', () => {
    it('should always be available when no section is required', () => {
      expect(isPluginAvailable(buildPlugin(), false)).toBe(true);
    });

    it('should require a section when requiresSection is set', () => {
      const plugin = buildPlugin({ requiresSection: true });

      expect(isPluginAvailable(plugin, false)).toBe(false);
      expect(isPluginAvailable(plugin, true)).toBe(true);
    });
  });

  describe('toReadonlySnapshot', () => {
    it('should return null for null or undefined', () => {
      expect(toReadonlySnapshot(null)).toBeNull();
      expect(toReadonlySnapshot(undefined)).toBeNull();
    });

    it('should return a deep-frozen copy that leaves the source untouched', () => {
      const source = { name: 'Fake section', supports: [{ number: 1 }] };

      const snapshot = toReadonlySnapshot(source);

      expect(snapshot).toEqual(source);
      expect(snapshot).not.toBe(source);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot?.supports)).toBe(true);
      expect(Object.isFrozen(snapshot?.supports[0])).toBe(true);
      expect(Object.isFrozen(source)).toBe(false);
    });

    it('should return primitives as is', () => {
      expect(toReadonlySnapshot(42)).toBe(42);
    });
  });

  describe('formatPluginLogPrefix', () => {
    it('should prefix logs with the plugin id', () => {
      expect(formatPluginLogPrefix('fake-tool')).toBe('[plugin:fake-tool]');
    });
  });
});
