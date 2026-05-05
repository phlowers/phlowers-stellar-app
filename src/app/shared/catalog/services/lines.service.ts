/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger/logger.service';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject, catchError, of } from 'rxjs';
import Papa from 'papaparse';
import { HttpClient } from '@angular/common/http';
import { CatalogLineEntity } from '@infrastructure/database';
import { LineCsvDto } from '@infrastructure/dto';
import { v4 as uuidv4 } from 'uuid';
import { sortBy, uniqBy } from 'lodash';
import { replaceTableData } from '@services/storage/replace-table-data.helper';

/**
 * Service for managing electrical transmission line catalog data.
 *
 * @remarks
 * The LinesService handles loading, storing, and querying line catalog data
 * from CSV files into the IndexedDB database. Lines represent electrical
 * transmission circuits with their identification codes.
 *
 * @example
 * ```typescript
 * // Wait for service to be ready
 * this.linesService.ready.subscribe(ready => {
 *   if (ready) {
 *     const lines = await this.linesService.getLines();
 *   }
 * });
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class LinesService {
  /**
   * BehaviorSubject indicating whether the service is ready to use.
   * Becomes true when the storage service is initialized.
   */
  public readonly ready = new BehaviorSubject<boolean>(false);

  private readonly storageService = inject(StorageService);
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);

  constructor() {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  /**
   * Get the total count of lines in the catalog.
   *
   * @returns Promise resolving to the number of lines in the database
   */
  async getLinesCount() {
    return this.storageService.db?.catLines.count();
  }

  /**
   * Retrieve all lines from the catalog.
   *
   * @returns Promise resolving to an array of all line entities
   */
  async getLines() {
    return this.storageService.db?.catLines.toArray();
  }

  /**
   * Import line catalog data from a CSV file.
   *
   * @remarks
   * This method fetches the lines.csv file from the server, parses it,
   * transforms the data into the appropriate entity format, removes
   * duplicates, and stores the results in the IndexedDB database.
   *
   * The CSV should contain columns: link_idr, link_adr, lit_idr, lit_adr,
   * branch_id, branch_idr, branch_adr, voltage_idr, voltage_adr.
   *
   * @returns Promise that resolves when import is complete
   */
  async importFromFile() {
    const linesFile = this.http
      .get(`${globalThis.location.origin}/data/lines.csv`, {
        responseType: 'text'
      })
      .pipe(
        catchError((error) => {
          this.logger.error('Error importing lines', error);
          return of('');
        })
      );

    const mapData = (data: LineCsvDto[]) => {
      return data
        .map((item) => {
          const hasNoVoltage = !item.voltage_idr || !item.voltage_adr || item.voltage_adr === '0.0';

          return {
            uuid: uuidv4(),
            link_idr: item.link_idr || '',
            link_adr: item.link_adr || '',
            lit_idr: item.lit_idr || '',
            lit_adr: item.lit_adr || '',
            branch_id: item.branch_id || '',
            branch_idr: item.branch_idr || '',
            branch_adr: item.branch_adr || '',
            voltage_idr: hasNoVoltage ? $localize`NO VOLTAGE` : item.voltage_idr,
            voltage_adr: hasNoVoltage ? 'NO_VOLTAGE' : item.voltage_adr
          };
        })
        .filter((item) => item.link_idr);
    };

    const persistParsedData = async (
      jsonResults: Papa.ParseResult<LineCsvDto>,
      resolve: () => void,
      reject: (reason: unknown) => void
    ): Promise<void> => {
      try {
        const data = jsonResults.data;
        if (!data || data.length === 0) {
          resolve();
          return;
        }
        const table: CatalogLineEntity[] = mapData(data);
        const uniqueTable = uniqBy(table, (element) =>
          [element.voltage_idr, element.link_idr, element.lit_idr, element.branch_id, element.branch_idr].join('')
        );
        await replaceTableData(this.storageService.db?.catLines, sortBy(uniqueTable, 'voltage_adr'));
      } catch (error) {
        this.logger.error('Error persisting lines catalog', error);
        reject(error);
        return;
      }
      resolve();
    };

    const parseCsv = (linesDataCsv: string, resolve: () => void, reject: (reason: unknown) => void) => {
      Papa.parse(linesDataCsv, {
        header: true,
        skipEmptyLines: true,
        complete: ((jsonResults: Papa.ParseResult<LineCsvDto>) => {
          void persistParsedData(jsonResults, resolve, reject);
        }) as (jsonResults: Papa.ParseResult<LineCsvDto>) => void
      });
    };

    await new Promise<void>((resolve, reject) => {
      linesFile.subscribe((linesDataCsv) => parseCsv(linesDataCsv, resolve, reject));
    });
  }
}
