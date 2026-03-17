/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * DTO for importing maintenance team data from RTE CSV files.
 *
 * @remarks
 * Maps to rows in the `maintenance-teams.csv` file. Represents
 * the organisational hierarchy: maintenance center → regional team → maintenance team.
 *
 * @category Infrastructure DTO
 */
export interface MaintenanceCsvDto {
  /** Name of the maintenance center */
  maintenance_center: string;
  /** Name of the regional team */
  regional_team: string;
  /** Name of the maintenance team */
  maintenance_team: string;
  /** Optional identifier for the maintenance center */
  maintenance_center_id?: string;
  /** Optional general maintenance identifier */
  maintenance_id?: string;
  /** Identifier of the regional team */
  regional_team_id: string;
  /** Identifier of the maintenance team */
  maintenance_team_id: string;
}
