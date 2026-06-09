/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Dexie schema for the singleton conformity configuration table.
 *
 * @remarks
 * Holds a single row keyed by `OBSTACLE_CONFORMITY_CONFIG_KEY` (`'main'`).
 * Aggregates the scalar settings of `obstacle_configuration.json`
 * (default repartition temperature, lateral temperature message, default
 * wind zone, intermediate point positions).
 */
export const CATALOG_OBSTACLE_CONFORMITY_CONFIG_SCHEMA = {
  catObstacleConformityConfig: `&key`
};
