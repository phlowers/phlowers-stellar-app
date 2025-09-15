/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

interface MaintenanceCenter {
  internal_id: string;
  name: string;
}

export interface RegionalMaintenanceCenter extends MaintenanceCenter {
  maintenance_center_internal_id: string;
}

export interface MaintenanceTeam extends MaintenanceCenter {
  regional_maintenance_center_internal_id: string;
}

export interface RteMaintenanceTeamsCsvFile {
  CM_CUR: string;
  CM_DESIGNATION: string;
  GMR_CUR: string;
  GMR_DESIGNATION: string;
  EEL_CUR: string;
  EEL_DESIGNATION: string;
}

export interface MaintenanceData {
  cm_id: string;
  cm_name: string;
  gmr_id: string;
  gmr_name: string;
  eel_id: string;
  eel_name: string;
}
