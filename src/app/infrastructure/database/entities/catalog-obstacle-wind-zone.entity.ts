/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Wind zone entry as declared in `obstacle_configuration.json` (`windZone.values[]`).
 *
 * @remarks
 * Stored in the `catObstacleWindZones` Dexie table (primary key `label`).
 * The `normal` and `red_zone` values drive the wind pressure (Pa) injected
 * into the rule's reference cable point when `pressure === 'WindZoneInput'`.
 *
 * @category Infrastructure
 */
export interface CatalogObstacleWindZoneEntity {
  /** Wind zone label displayed in the Conformity modal (e.g. `'ZVN'`, `'ZVF'`, `'HPV'`). */
  label: string;
  /** Wind pressure (Pa) outside the obstacle's red zone. */
  normal: number;
  /** Wind pressure (Pa) inside the obstacle's red zone. */
  red_zone: number;
}
