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
          maintenance_center_id:
            item.maintenance_center_id || item.maintenance_id || '',
          maintenance_center: item.maintenance_center,
          regional_team_id: item.regional_team_id,
          regional_team: item.regional_team,
          maintenance_team_id: item.maintenance_team_id,
          maintenance_team: item.maintenance_team
        }))
        .filter((item) => item.maintenance_team_id);
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
            if (!data || data.length === 0) {
              resolve();
              return;
            }
            await this.storageService.db?.maintenance.clear();
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
