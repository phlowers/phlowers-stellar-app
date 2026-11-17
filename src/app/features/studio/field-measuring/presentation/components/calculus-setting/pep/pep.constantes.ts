/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PepSight } from '@features/studio/field-measuring/presentation/components/calculus-setting/pep/pep.interfaces';

/** Sights 1 to 3 displayed by the PEP form, in display order. */
export const PEP_SIGHTS: readonly PepSight[] = [
  { index: 1, xField: 'xSight1', yField: 'ySight1' },
  { index: 2, xField: 'xSight2', yField: 'ySight2' },
  { index: 3, xField: 'xSight3', yField: 'ySight3' }
];
