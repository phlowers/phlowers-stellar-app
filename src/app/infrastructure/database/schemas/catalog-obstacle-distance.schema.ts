/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Dexie schema for the catalog obstacle conformity distances table.
 *
 * @remarks
 * Composite primary key `[obstacle_type+rule_type]` ensures one row per
 * (obstacle, rule) pair. Single-column indexes on `obstacle_type` and
 * `rule_type` allow efficient lookups by either dimension. The `active`
 * index supports filtering rules that are active by default.
 */
export const CATALOG_OBSTACLE_DISTANCE_SCHEMA = {
  catObstacleDistances: `&[obstacle_type+rule_type], obstacle_type, rule_type, active`
};
