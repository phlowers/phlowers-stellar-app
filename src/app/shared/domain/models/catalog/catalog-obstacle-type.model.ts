/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Catalog obstacle type domain model.
 *
 * @remarks
 * Represents a type of physical obstacle that can be found near power lines.
 * Each obstacle type has a unique key, a human-readable name, and a detailed description.
 *
 * @category Domain Models
 */
export interface CatalogObstacleType {
  /** Unique obstacle type key (e.g. "ordinary_ground", "vegetation") */
  obstacle_type: string;
  /** Human-readable name for the obstacle type */
  obstacle_type_name: string;
  /** Detailed description of the obstacle type */
  details: string;
}
