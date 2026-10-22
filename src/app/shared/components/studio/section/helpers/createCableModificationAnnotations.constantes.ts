/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TranslocoService } from '@jsverse/transloco';

/**
 * Returns the user-facing label for a cable length modification direction.
 *
 * @remarks
 * Wrapped in a function so translation is evaluated at call time, which
 * keeps the constants module side-effect free and friendly to unit tests.
 * When no `translocoService` is provided (e.g. in unit tests), falls back
 * to the English string.
 */
export const getCableModificationLabel = (
  modificationType: 'lengthening' | 'shortening',
  translocoService?: TranslocoService
): string => {
  if (translocoService) {
    return modificationType === 'lengthening'
      ? translocoService.translate('shared.studio.cable-mod-lengthening')
      : translocoService.translate('shared.studio.cable-mod-shortening');
  }
  return modificationType === 'lengthening' ? 'Lengthening' : 'Shortening';
};
