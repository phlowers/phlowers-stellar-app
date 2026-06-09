/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Dexie schema for the catalog obstacle configurations table.
 *
 * @remarks
 * Stores the per-obstacle attributes (`redZone`, `conformity`) carried by
 * `obstacle_configuration.json` and not present in the legacy CSV.
 * Indexes `conformity` and `red_zone` to allow filtering future feature
 * queries by graph type or red-zone availability.
 */
export const CATALOG_OBSTACLE_CONFIGURATION_SCHEMA = {
  catObstacleConfigurations: `&obstacle_type, conformity, red_zone`
};
