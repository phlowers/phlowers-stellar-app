/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger/logger.service';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject } from 'rxjs';
import { CsvImportClientService } from '@shared/catalog/csv-import';

/**
 * Service for managing maintenance team catalog data.
 *
 * @remarks
 * Delegates CSV import to the shared `CsvImportClientService` which
 * streams `maintenance-teams.csv` through a dedicated Web Worker.
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  /** BehaviorSubject indicating whether the service is ready to use. */
  public readonly ready = new BehaviorSubject<boolean>(false);

  private readonly storageService = inject(StorageService);
  private readonly logger = inject(LoggerService);
  private readonly csvImportClient = inject(CsvImportClientService);

  constructor() {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  /** Retrieve all maintenance team records from the catalog. */
  async getMaintenance() {
    return this.storageService.db?.catMaintenance.toArray();
  }

  /**
   * Import maintenance team data from `maintenance-teams.csv` via the generic Web Worker.
   */
  async importFromFile(): Promise<void> {
    try {
      await this.csvImportClient.importCsv('maintenance');
    } catch (error) {
      this.logger.error('Error importing maintenance teams', error);
    }
  }
}
