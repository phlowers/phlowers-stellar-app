/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Dexie schema for the catalog obstacle wind zones table.
 *
 * @remarks
 * Stores one row per wind zone label (`ZVN`, `ZVF`, `HPV`, …). The
 * `normal` and `red_zone` pressure values feed the rule reference cable
 * point when its pressure is declared as `'WindZoneInput'`.
 */
export const CATALOG_OBSTACLE_WIND_ZONE_SCHEMA = {
  catObstacleWindZones: `&label`
};
