/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Dexie schema for the catalog obstacle rule definitions table.
 *
 * @remarks
 * Stores one row per regulatory rule (`AT`, `CCG-LA`, `CDT`). The primary
 * key is the rule technical identifier. Nested objects (`lateral_point`,
 * `overhang_point`) are not indexed and remain accessible via `get()`.
 */
export const CATALOG_OBSTACLE_RULE_DEFINITION_SCHEMA = {
  catObstacleRuleDefinitions: `&rule_type`
};
