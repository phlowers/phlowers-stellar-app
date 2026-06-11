/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Conformity graph type associated with an obstacle, as declared in
 * `obstacle_configuration.json` (`conformity` attribute).
 *
 * - `'overhang'`     — figure "Ligne horizontale" (US.OBS.DCO.3)
 * - `'cable_track'`  — figure "Disques" (US.OBS.DCO.2)
 * - `'vegetation'`   — figure "Tranchée" (US.OBS.DCO.1)
 * - `null`           — obstacle without a configured graph type (e.g. high clearance, silo proximity)
 */
export type ObstacleConformityType = 'overhang' | 'cable_track' | 'vegetation' | null;

/**
 * Configuration entity for one obstacle type, persisting the per-obstacle
 * attributes carried by `obstacle_configuration.json` beyond the bare
 * `CatalogObstacleTypeEntity` (which only feeds the legacy dropdown).
 *
 * @remarks
 * Stored in the `catObstacleConfigurations` Dexie table (primary key
 * `obstacle_type`). Loaded alongside `CatalogObstacleTypeEntity` by the
 * obstacle JSON import worker.
 *
 * @category Infrastructure
 */
export interface CatalogObstacleConfigurationEntity {
  /** Obstacle type technical identifier (matches `CatalogObstacleTypeEntity.obstacle_type`). */
  obstacle_type: string;
  /** Whether the "red zone" checkbox must be displayed in the Conformity modal. */
  red_zone: boolean;
  /** Graph type generated when computing conformity distances. */
  conformity: ObstacleConformityType;
}
