/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@core/services/logger/logger.service';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject } from 'rxjs';
import { CatalogMaintenanceEntity } from '@infrastructure/database';
import { MaintenanceCsvDto } from '@infrastructure/dto';
import Papa from 'papaparse';
import { replaceTableData } from '@services/storage/replace-table-data.helper';

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

  private readonly storageService = inject(StorageService);
  private readonly logger = inject(LoggerService);

  constructor() {
    this.storageService.ready$.pipe(takeUntilDestroyed()).subscribe((value) => {
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
  private static readonly CSV_PARSE_TIMEOUT_MS = 60_000;

  async importFromFile() {
    await this.parseCsvAndStore();
  }

  private async parseCsvAndStore(): Promise<void> {
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

    let rawData: MaintenanceCsvDto[];
    try {
      rawData = await this.parseCsvFromUrl(`${globalThis.location.origin}/data/maintenance-teams.csv`);
    } catch (error) {
      this.logger.error('Error importing maintenance teams', error);
      return;
    }
    if (!rawData.length) {
      return;
    }
    const maintenanceTable: CatalogMaintenanceEntity[] = mapData(rawData);
    await replaceTableData(this.storageService.db?.catMaintenance, maintenanceTable);
  }

  private parseCsvFromUrl(url: string): Promise<MaintenanceCsvDto[]> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error('CSV parse timeout')),
        MaintenanceService.CSV_PARSE_TIMEOUT_MS
      );
      Papa.parse<MaintenanceCsvDto>(url, {
        download: true,
        worker: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          clearTimeout(timeoutId);
          resolve(results.data ?? []);
        },
        error: (err) => {
          clearTimeout(timeoutId);
          reject(new Error(String(err)));
        }
      });
    });
  }
}
