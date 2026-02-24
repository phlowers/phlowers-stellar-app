/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Base interface for maintenance organizational units.
 *
 * @remarks
 * Provides common properties for all maintenance hierarchy levels.
 *
 * @category Catalog Models
 */
interface MaintenanceCenter {
  /** Internal identifier */
  internal_id: string;
  /** Display name */
  name: string;
}

/**
 * Regional maintenance center - mid-level organizational unit.
 *
 * @remarks
 * A regional center belongs to a maintenance center and
 * manages multiple maintenance teams.
 *
 * @category Catalog Models
 */
export interface RegionalMaintenanceCenter extends MaintenanceCenter {
  /** ID of the parent maintenance center */
  maintenance_center_internal_id: string;
}

/**
 * Maintenance team - lowest level organizational unit.
 *
 * @remarks
 * A team belongs to a regional maintenance center and is
 * responsible for specific sections of the power grid.
 *
 * @category Catalog Models
 */
export interface MaintenanceTeam extends MaintenanceCenter {
  /** ID of the parent regional maintenance center */
  regional_maintenance_center_internal_id: string;
}

/**
 * Complete maintenance hierarchy data model.
 *
 * @remarks
 * Contains the full organizational path from maintenance center
 * down to the specific maintenance team, with both names and IDs.
 *
 * @example
 * ```typescript
 * const maintenance: CatalogMaintenance = {
 *   maintenance_center: 'Paris Nord',
 *   maintenance_center_id: 'MC001',
 *   regional_team: 'Ile-de-France',
 *   regional_team_id: 'RT001',
 *   maintenance_team: 'Team Alpha',
 *   maintenance_team_id: 'MT001'
 * };
 * ```
 *
 * @category Catalog Models
 */
export interface CatalogMaintenance {
  /** Name of the maintenance center */
  maintenance_center: string;
  /** Name of the regional team */
  regional_team: string;
  /** Name of the maintenance team */
  maintenance_team: string;
  /** Internal ID of the maintenance center */
  maintenance_center_id: string;
  /** Internal ID of the regional team */
  regional_team_id: string;
  /** Internal ID of the maintenance team */
  maintenance_team_id: string;
}
