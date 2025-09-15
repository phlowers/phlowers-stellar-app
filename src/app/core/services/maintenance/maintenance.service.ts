/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { BehaviorSubject } from 'rxjs';
import {
  MaintenanceData,
  RteMaintenanceTeamsCsvFile
} from '../../data/database/interfaces/maintenance';
import Papa from 'papaparse';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  public readonly ready = new BehaviorSubject<boolean>(false);

  constructor(
    private readonly storageService: StorageService,
    private readonly http: HttpClient
  ) {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  async getMaintenance() {
    return this.storageService.db?.maintenance.toArray();
  }

  async importFromFile() {
    const maintenanceTeams = await this.http.get<string>(
      `${window.location.origin}/maintenance-teams.csv`,
      { responseType: 'text' as any }
    );
    await new Promise<void>((resolve) => {
      maintenanceTeams.subscribe(async (maintenanceTeams) => {
        Papa.parse(maintenanceTeams, {
          header: true,
          skipEmptyLines: true,
          complete: (async (
            jsonResults: Papa.ParseResult<RteMaintenanceTeamsCsvFile>
          ) => {
            const data = jsonResults.data;
            if (!data || data.length === 0) {
              resolve();
              return;
            }
            await this.storageService.db?.maintenance.clear();
            const maintenanceTable: MaintenanceData[] = [];
            data.forEach((item) => {
              if (item.EEL_CUR) {
                maintenanceTable.push({
                  cm_id: item.CM_CUR,
                  cm_name: item.CM_DESIGNATION,
                  gmr_id: item.GMR_CUR,
                  gmr_name: item.GMR_DESIGNATION,
                  eel_id: item.EEL_CUR,
                  eel_name: item.EEL_DESIGNATION
                });
              }
            });
            await this.storageService.db?.maintenance.bulkAdd(maintenanceTable);
            resolve();
          }) as (
            jsonResults: Papa.ParseResult<RteMaintenanceTeamsCsvFile>
          ) => void
        });
      });
    });
  }
}
