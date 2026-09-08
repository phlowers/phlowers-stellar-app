/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { CsvImportClientService } from '@shared/catalog/csv-import';

/**
 * Service for managing electrical transmission line catalog data.
 *
 * @remarks
 * Delegates CSV import to the shared `CsvImportClientService` which
 * streams `lines.csv` through a dedicated Web Worker. Dedup-by-voltage is
 * performed inside the worker's config finalize hook.
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class LinesService {
  /** BehaviorSubject indicating whether the service is ready to use. */
  public readonly ready = new BehaviorSubject<boolean>(false);

  /** Emits after each successful `importFromFile()` call. */
  private readonly _imported$ = new Subject<void>();
  readonly imported$ = this._imported$.asObservable();

  private readonly storageService = inject(StorageService);
  private readonly csvImportClient = inject(CsvImportClientService);

  constructor() {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  /** Get the total count of lines in the catalog. */
  async getLinesCount() {
    return this.storageService.db?.catLines.count();
  }

  /** Retrieve all lines from the catalog. */
  async getLines() {
    return this.storageService.db?.catLines.toArray();
  }

  /**
   * Import line catalog data from `lines.csv` via the generic Web Worker.
   */
  async importFromFile(expectedHash?: string): Promise<void> {
    await this.csvImportClient.importCsv('lines', { expectedHash });
    this._imported$.next();
  }
}
