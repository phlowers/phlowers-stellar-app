/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Marker and connecting line style of one forest-trenches plot series. */
export interface ForestTrenchesChartSeriesStyle {
  marker: string;
  line: string;
}

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
  /** Default value of the Conformity modal "Lateral distance temperature" field. */
  lateral_temperature_default: number;
  /** Rule identifier whose name is rendered in the "Lateral distance temperature" field label. */
  lateral_temperature_rule_type: string;
  /** Message displayed below the "Lateral distance temperature" field. */
  lateral_temperature_message: string;
  /** Default wind zone label selected in the Conformity modal. */
  wind_zone_default: string;
  /** Multipliers used to position intermediate reference cable points along the span. */
  intermediate_point_positions: number[];
  /** Available point counts for forest-trenches ground slicing. */
  forest_trenches_n_points_choices: number[];
  /** Default overhang rules for the forest-trenches tool. */
  forest_trenches_overhang_rules: string[];
  /** Default lateral rules for the forest-trenches tool. */
  forest_trenches_lateral_rules: string[];
  /** Plot styles of the forest-trenches tool, keys of PLOTLY_MARKER_SYMBOLS / PLOTLY_LINE_DASHES. */
  forest_trenches_chart: {
    cable: ForestTrenchesChartSeriesStyle;
    limit: ForestTrenchesChartSeriesStyle;
    /** Overrides the rule color of the overhang cable curves; null keeps the rule color. */
    overhang_color: string | null;
  };
  /** Whether the mandatory forest-trenches floor obstacle is in the red zone. */
  floor_obstacle_red_zone: boolean;
  /** Rule distances for the mandatory forest-trenches floor obstacle. */
  floor_obstacle_distances: {
    rule_type: string;
    active: boolean;
    overhang: Record<string, number> | null;
    lateral: Record<string, number> | null;
  }[];
}
