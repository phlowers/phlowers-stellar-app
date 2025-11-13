/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { BehaviorSubject, catchError, of } from 'rxjs';
import {
  MaintenanceData,
  RteMaintenanceTeamsCsvFile
} from '../../data/database/interfaces/maintenance';
import Papa from 'papaparse';
import { HttpClient } from '@angular/common/http';

const mockMaintenance: MaintenanceData[] = [
  {
    cm_id: '1',
    cm_name: 'cm_name_1',
    gmr_id: '1',
    gmr_name: 'gmr_name_1',
    eel_id: '1',
    eel_name: 'eel_name_1'
  },
  {
    cm_id: '2',
    cm_name: 'cm_name_2',
    gmr_id: '2',
    gmr_name: 'gmr_name_2',
    eel_id: '2',
    eel_name: 'eel_name_2'
  }
];

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
    const maintenanceTeams = this.http
      .get(`${window.location.origin}/data/maintenance-teams.csv`, {
        responseType: 'text'
      })
      .pipe(
        catchError((error) => {
          console.error('Error importing maintenance teams', error);
          return of('');
        })
      );

    const mapData = (data: RteMaintenanceTeamsCsvFile[]) => {
      return data
        .map((item) => ({
          cm_id: item.CM_CUR,
          cm_name: item.CM_DESIGNATION,
          gmr_id: item.GMR_CUR,
          gmr_name: item.GMR_DESIGNATION,
          eel_id: item.EEL_CUR,
          eel_name: item.EEL_DESIGNATION
        }))
        .filter((item) => item.eel_id);
    };

    await new Promise<void>((resolve) => {
      maintenanceTeams.subscribe(async (maintenanceTeams) => {
        Papa.parse(maintenanceTeams, {
          header: true,
          skipEmptyLines: true,
          complete: (async (
            jsonResults: Papa.ParseResult<RteMaintenanceTeamsCsvFile>
          ) => {
            const data = jsonResults.data;
            await this.storageService.db?.maintenance.clear();
            if (!data || data.length === 0) {
              await this.storageService.db?.maintenance.bulkAdd(
                mockMaintenance
              );
              resolve();
              return;
            }
            const maintenanceTable: MaintenanceData[] = mapData(data);
            console.log('adding maintenance data', maintenanceTable.length);
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
