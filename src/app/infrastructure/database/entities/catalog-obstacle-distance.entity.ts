/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Distances to respect (in meters) keyed by canton voltage (kV, as a string
 * to preserve JSON keys: `'63'`, `'90'`, `'150'`, `'225'`, `'400'`).
 */
export type ObstacleVoltageDistanceMap = Record<string, number>;

/**
 * One row of the obstacle conformity distance table: for one (obstacle type,
 * rule type) pair, the legal distances to respect both in overhang and in
 * lateral positions across all supported voltages.
 *
 * @remarks
 * Stored in the `catObstacleDistances` Dexie table with the composite primary
 * key `[obstacle_type+rule_type]`. Both `overhang` and `lateral` may be
 * `null` when the rule does not constrain that direction for this obstacle
 * (e.g. `ordinary_ground` has no lateral distances).
 *
 * @category Infrastructure
 */
export interface CatalogObstacleDistanceEntity {
  /** Obstacle type technical identifier (matches `CatalogObstacleTypeEntity.obstacle_type`). */
  obstacle_type: string;
  /** Rule technical identifier (matches `CatalogObstacleRuleDefinitionEntity.rule_type`). */
  rule_type: string;
  /** Whether the rule is active by default for this obstacle in the Conformity modal. */
  active: boolean;
  /** Overhang distances by voltage, or `null` when the rule has no overhang constraint. */
  overhang: ObstacleVoltageDistanceMap | null;
  /** Lateral distances by voltage, or `null` when the rule has no lateral constraint. */
  lateral: ObstacleVoltageDistanceMap | null;
}
