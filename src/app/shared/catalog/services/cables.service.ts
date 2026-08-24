/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject } from 'rxjs';
import { CatalogCableEntity } from '@infrastructure/database';
import { CsvImportClientService } from '@shared/catalog/csv-import';

/**
 * Service for managing electrical cable catalog data.
 *
 * @remarks
 * The CablesService handles loading, storing, and querying cable catalog
 * data from CSV files into the IndexedDB database. The CSV import is
 * delegated to the shared `CsvImportClientService` which streams the
 * file through a dedicated Web Worker.
 *
 * @example
 * ```typescript
 * // Get a specific cable by name
 * const cable = await this.cablesService.getCable('ASTER_570');
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class CablesService {
  /** BehaviorSubject indicating whether the service is ready to use. */
  public readonly ready = new BehaviorSubject<boolean>(false);

  private readonly storageService = inject(StorageService);
  private readonly csvImportClient = inject(CsvImportClientService);

  constructor() {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  /** Retrieve all cables from the catalog. */
  async getCables() {
    return this.storageService.db?.catCables?.toArray();
  }

  /** Retrieve a specific cable by its name. */
  async getCable(name: string): Promise<CatalogCableEntity | undefined> {
    return this.storageService.db?.catCables?.where('name').equals(name).first();
  }

  /**
   * Import cable catalog data from `cables.csv`.
   *
   * @remarks
   * Delegates to `CsvImportClientService` which streams the file
   * through a dedicated Web Worker and persists rows to IndexedDB.
   * Errors are propagated (never swallowed): the `CatalogUpdateService`
   * orchestrator is responsible for logging a failure and continuing with
   * other catalogs. Consumers that trigger imports interactively must catch
   * the promise themselves and notify the user.
   *
   * @param expectedHash - SHA-256 hex digest the downloaded file must match
   * (see `CatalogUpdateService`). Verified by the worker before any Dexie mutation.
   */
  async importFromFile(expectedHash?: string): Promise<void> {
    await this.csvImportClient.importCsv('cables', { expectedHash });
  }
}
