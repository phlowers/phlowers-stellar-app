/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Fixed primary key used by the singleton conformity configuration row. */
export const OBSTACLE_CONFORMITY_CONFIG_KEY = 'main';

/**
 * Singleton configuration row aggregating the scalar settings of
 * `obstacle_configuration.json` (defaults, messages, intermediate positions).
 *
 * @remarks
 * Stored in the `catObstacleConformityConfig` Dexie table (primary key
 * `key`, always `'main'`). The dedicated table avoids polluting the generic
 * `metadata` table and keeps the typed schema close to the JSON contract.
 *
 * @category Infrastructure
 */
export interface CatalogObstacleConformityConfigEntity {
  /** Primary key — always `'main'` for the singleton row. */
  key: string;
  /** Default value of the Conformity modal "Repartition temperature" field. */
  repartition_temperature_default: number;
  /** Rule identifier whose name is rendered in the "Lateral distance temperature" field label. */
  lateral_temperature_rule_type: string;
  /** Message displayed below the "Lateral distance temperature" field. */
  lateral_temperature_message: string;
  /** Default wind zone label selected in the Conformity modal. */
  wind_zone_default: string;
  /** Multipliers used to position intermediate reference cable points along the span. */
  intermediate_point_positions: number[];
}
