/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject, catchError, of } from 'rxjs';
import { CatalogMaintenanceEntity } from '@core/infrastructure/database';
import { MaintenanceCsvDto } from '@core/infrastructure/dto';
import Papa from 'papaparse';
import { HttpClient } from '@angular/common/http';

/**
 * Service for managing maintenance team catalog data.
 *
 * @remarks
 * The MaintenanceService handles loading, storing, and querying maintenance
 * team information from CSV files into the IndexedDB database. This includes
 * organizational hierarchy of maintenance centers, regional teams, and
 * maintenance teams.
 *
 * @example
 * ```typescript
 * // Get all maintenance teams
 * const teams = await this.maintenanceService.getMaintenance();
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  /**
   * BehaviorSubject indicating whether the service is ready to use.
   * Becomes true when the storage service is initialized.
   */
  public readonly ready = new BehaviorSubject<boolean>(false);

  constructor(
    private readonly storageService: StorageService,
    private readonly http: HttpClient
  ) {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  /**
   * Retrieve all maintenance team records from the catalog.
   *
   * @returns Promise resolving to an array of all maintenance entities
   */
  async getMaintenance() {
    return this.storageService.db?.catMaintenance.toArray();
  }

  /**
   * Import maintenance team data from a CSV file.
   *
   * @remarks
   * This method fetches the maintenance-teams.csv file from the server,
   * parses it, transforms the data into the appropriate entity format,
   * and stores the results in the IndexedDB database.
   *
   * The CSV should contain columns: maintenance_center_id, maintenance_center,
   * regional_team_id, regional_team, maintenance_team_id, maintenance_team.
   *
   * @returns Promise that resolves when import is complete
   */
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

    const mapData = (data: MaintenanceCsvDto[]) => {
      return data
        .map((item) => ({
          maintenance_center_id: item.maintenance_center_id || item.maintenance_id || '',
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
          complete: (async (jsonResults: Papa.ParseResult<MaintenanceCsvDto>) => {
            const data = jsonResults.data;
            if (!data || data.length === 0) {
              resolve();
              return;
            }
            await this.storageService.db?.catMaintenance.clear();
            const maintenanceTable: CatalogMaintenanceEntity[] = mapData(data);
            console.log('adding maintenance data', maintenanceTable.length);
            await this.storageService.db?.catMaintenance.bulkAdd(maintenanceTable);
            resolve();
          }) as (jsonResults: Papa.ParseResult<MaintenanceCsvDto>) => void
        });
      });
    });
  }
}
