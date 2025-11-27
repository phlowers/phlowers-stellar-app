/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { getColorPalette } from './theme-helper';

export const primengPreset = definePreset(Aura, {
  semantic: {
    primary: getColorPalette('primary'),
    secondary: getColorPalette('secondary'),
    grey: getColorPalette('grey', [
      'white',
      0,
      50,
      100,
      150,
      200,
      250,
      300,
      350,
      400,
      450,
      500,
      550,
      600,
      650,
      700,
      750,
      800,
      850,
      900,
      950
    ]),
    colorScheme: {
      light: {
        primary: {
          color: '{primary.600}',
          hoverColor: '{primary.700}'
        }
      }
    }
  }
});
