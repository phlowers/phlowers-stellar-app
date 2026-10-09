/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { Section } from '@shared/domain';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';

/**
 * Fills the maintenance center, maintenance team and regional team IDs of an imported section from
 * its `cm_designation`, `eel_designation` and `gmr_designation` (RG.CAN.CEM / RG.CAN.EEL / RG.CAN.GMR).
 * A designation without catalog match leaves the corresponding ID unchanged.
 */
@Injectable({ providedIn: 'root' })
export class MaintenanceCorrectionService {
  private readonly maintenanceService = inject(MaintenanceService);

  async correctMaintenance(section: Section): Promise<Section> {
    const catalog = (await this.maintenanceService.getMaintenance()) ?? [];

    const center = section.cm_designation
      ? catalog.find((entry) => entry.maintenance_center === section.cm_designation)
      : undefined;
    const team = section.eel_designation
      ? catalog.find((entry) => entry.maintenance_team === section.eel_designation)
      : undefined;
    const regional = section.gmr_designation
      ? catalog.find((entry) => entry.regional_team === section.gmr_designation)
      : undefined;

    return {
      ...section,
      maintenance_center_id: center?.maintenance_center_id ?? section.maintenance_center_id,
      maintenance_team_id: team?.maintenance_team_id ?? section.maintenance_team_id,
      regional_team_id: regional?.regional_team_id ?? section.regional_team_id
    };
  }
}
