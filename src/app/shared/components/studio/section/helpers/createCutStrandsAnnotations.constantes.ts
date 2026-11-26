/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TranslocoService } from '@jsverse/transloco';

/**
 * Returns the hover label of the cut strands marking.
 *
 * @remarks
 * Wrapped in a function so translation is evaluated at call time. Without a
 * `translocoService` (e.g. in unit tests), falls back to the English string.
 */
export const getCutStrandsLabel = (translocoService?: TranslocoService): string =>
  translocoService ? translocoService.translate('shared.studio.cut-strands-marking') : 'Cut strands';
