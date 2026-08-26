/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Section } from '@shared/domain';
import { recheckSpanLoads } from '@shared/domain/helpers/span-loads.helpers';

/**
 * Returns a section whose every charge's span loads are re-aligned with the current supports.
 *
 * @remarks
 * The Python engine's `apply_span_loads` (run during `initialize_study`) requires the span-load
 * array to match the current support geometry. A charge persisted before a support was deleted
 * outside the Studio keeps a stale array, which makes `initialize_study` raise a length-mismatch
 * `ValueError`. Re-running `recheckSpanLoads` here rebuilds a consistent array before init.
 */
export const alignSectionSpanLoadsToSupports = (section: Section): Section => ({
  ...section,
  charges: section.charges.map((charge) => ({
    ...charge,
    data: { ...charge.data, spanLoads: recheckSpanLoads(charge.data.spanLoads, section.supports) }
  }))
});
