/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Maintenance center base model
 */
interface MaintenanceCenter {
  internal_id: string;
  name: string;
}

/**
 * Regional maintenance center model
 */
export interface RegionalMaintenanceCenter extends MaintenanceCenter {
  maintenance_center_internal_id: string;
}

/**
 * Maintenance team model
 */
export interface MaintenanceTeam extends MaintenanceCenter {
  regional_maintenance_center_internal_id: string;
}

/**
 * Complete maintenance data model
 */
export interface CatalogMaintenance {
  maintenance_center: string;
  regional_team: string;
  maintenance_team: string;
  maintenance_center_id: string;
  regional_team_id: string;
  maintenance_team_id: string;
}
