/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * DTO for importing maintenance teams from RTE CSV files
 */
export interface MaintenanceCsvDto {
  maintenance_center: string;
  regional_team: string;
  maintenance_team: string;
  maintenance_center_id?: string;
  maintenance_id?: string;
  regional_team_id: string;
  maintenance_team_id: string;
}
