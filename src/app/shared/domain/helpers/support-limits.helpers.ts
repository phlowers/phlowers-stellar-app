/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Section } from '@shared/domain';
import { SUPPORT_FIELD_LIMITS } from './support-limits.constantes';

/** Returns `true` when at least one support numeric field is outside `SUPPORT_FIELD_LIMITS`. */
export const hasSupportsBoundsErrors = (section: Section): boolean => {
  const fields = Object.keys(SUPPORT_FIELD_LIMITS) as (keyof typeof SUPPORT_FIELD_LIMITS)[];
  return section.supports.some((support) =>
    fields.some((field) => {
      const value = (support as unknown as Record<string, unknown>)[field];
      const { min, max } = SUPPORT_FIELD_LIMITS[field];
      return typeof value === 'number' && (value < min || value > max);
    })
  );
};
