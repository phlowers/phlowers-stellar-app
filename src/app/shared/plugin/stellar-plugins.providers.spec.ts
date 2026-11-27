/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { STELLAR_PLUGINS } from '@shared/plugin/stellar-plugin.constantes';
import { validateStellarPlugins } from '@shared/plugin/stellar-plugin.helpers';
import { STELLAR_PLUGIN_PROVIDERS } from '@shared/plugin/stellar-plugins.providers';
import { HELLO_WORLD_PLUGIN } from '@plugins/hello-world/hello-world.plugin';

describe('STELLAR_PLUGIN_PROVIDERS', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...STELLAR_PLUGIN_PROVIDERS] });
  });

  it('should register the enabled plugins', () => {
    expect(TestBed.inject(STELLAR_PLUGINS)).toContain(HELLO_WORLD_PLUGIN);
  });

  it('should only register valid plugins', () => {
    expect(validateStellarPlugins(TestBed.inject(STELLAR_PLUGINS)).errors).toEqual([]);
  });
});
