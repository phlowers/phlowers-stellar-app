/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const CONFORMITY_EXPORT_FILENAME_PREFIX = 'Export Distances de conformité';

export const CONFORMITY_EXPORT_UNITS = {
  meter: 'm',
  kilovolt: 'KV',
  degree: '°',
  celsius: '°C',
  pascal: 'Pa'
} as const;

export const CONFORMITY_EXPORT_FILE_PICKER_TYPES = [{ description: 'JSON', accept: { 'application/json': ['.json'] } }];
