/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Section } from '@shared/domain';

/** Result of sanitizing a section's obstacles and span loads against its current geometry. */
export interface SectionGeometrySanitizeResult {
  /** The section, with obstacles/span loads pruned when they reference a deleted support/span. */
  section: Section;
  /** Whether any obstacle or span load was removed. */
  removedGeometryBoundObjects: boolean;
}

/** Result of `SectionService.createOrUpdateSection`. */
export interface SectionUpdateResult {
  /** Whether obstacles or loads were removed to match the updated section geometry. */
  removedGeometryBoundObjects: boolean;
}
