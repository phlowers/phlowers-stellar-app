/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Data Transfer Object for obstacle type CSV import.
 *
 * @remarks
 * Maps directly to the columns of the obstacle_type_rte.csv file.
 * All fields are strings as they come from CSV parsing.
 *
 * @category DTO
 */
export interface ObstacleTypeCsvDto {
  /** Unique obstacle type key (e.g. "ordinary_ground") */
  obstacle_type: string;
  /** Human-readable name for the obstacle type */
  obstacle_type_name: string;
  /** Detailed description of the obstacle type */
  details: string;
}
