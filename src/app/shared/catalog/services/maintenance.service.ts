/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
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
   *
   * @param expectedHash - SHA-256 hex digest the downloaded file must match
   * (see `CatalogUpdateService`). Verified by the worker before any Dexie
   * mutation; errors are propagated (never swallowed) so a caller can decide
   * whether to continue with other catalogs.
   */
  async importFromFile(expectedHash?: string): Promise<void> {
    await this.csvImportClient.importCsv('maintenance', { expectedHash });
  }
}
