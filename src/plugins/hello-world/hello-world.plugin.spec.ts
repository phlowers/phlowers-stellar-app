/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { HelloWorldComponent } from '@plugins/hello-world/hello-world.component';
import { HELLO_WORLD_TRANSLOCO_SCOPE } from '@plugins/hello-world/hello-world.constantes';
import { HELLO_WORLD_PLUGIN } from '@plugins/hello-world/hello-world.plugin';
import en from '@plugins/hello-world/i18n/en.json';
import fr from '@plugins/hello-world/i18n/fr.json';

describe('HELLO_WORLD_PLUGIN', () => {
  it('should lazily load the hello-world component', async () => {
    await expect(HELLO_WORLD_PLUGIN.loadComponent()).resolves.toBe(HelloWorldComponent);
  });

  it.each([
    ['en', en],
    ['fr', fr]
  ] as const)('should load the %s scope translations', async (lang, translations) => {
    const loader = HELLO_WORLD_TRANSLOCO_SCOPE.loader?.[lang];

    await expect(loader?.()).resolves.toEqual(translations);
  });

  it('should translate the same keys in every language', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });

  it('should declare its title and description in the scope', () => {
    expect(en).toHaveProperty(HELLO_WORLD_PLUGIN.titleKey);
    expect(en).toHaveProperty(HELLO_WORLD_PLUGIN.descriptionKey);
  });
});
