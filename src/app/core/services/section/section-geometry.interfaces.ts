/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Charge, Section } from '@shared/domain';

/** Result of sanitizing a study's charges against its current geometry. */
export interface SanitizedCharges {
  /** Charges with stale span loads pruned. */
  sanitizedCharges: Charge[];
  /** Whether any charge's span loads were pruned. */
  chargesChanged: boolean;
  /** Whether a removed span load was non-zero (user-defined). */
  removedUserDefinedSpanLoad: boolean;
}

/** Result of sanitizing a section's obstacles, floors and span loads against its current geometry. */
export interface SectionGeometrySanitizeResult {
  /** The section, with obstacles/floors/span loads pruned when they reference a deleted support/span. */
  section: Section;
  /** Whether any obstacle, any floor, or any non-zero (user-defined) span load was removed. */
  removedGeometryBoundObjects: boolean;
}

/** Result of `SectionService.createOrUpdateSection`. */
export interface SectionUpdateResult {
  /** Whether obstacles, floors or loads were removed to match the updated section geometry. */
  removedGeometryBoundObjects: boolean;
}
