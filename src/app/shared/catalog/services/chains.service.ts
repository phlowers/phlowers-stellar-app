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
import { CatalogChainEntity } from '@infrastructure/database';
import { ChainCsvDto } from '@infrastructure/dto';
import Papa from 'papaparse';
import { replaceTableData } from '@services/storage/replace-table-data.helper';

/**
 * Service for managing insulator chain catalog data.
 *
 * @remarks
 * The ChainsService handles loading, storing, and querying insulator chain
 * catalog data from CSV files into the IndexedDB database. Chains are
 * mechanical components that attach conductors to support structures.
 *
 * @example
 * ```typescript
 * // Get all available chains
 * const chains = await this.chainsService.getChains();
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class ChainsService {
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
   * Retrieve all insulator chains from the catalog.
   *
   * @returns Promise resolving to an array of all chain entities
   */
  async getChains() {
    return this.storageService.db?.catChains?.toArray();
  }

  /**
   * Import chain catalog data from a CSV file.
   *
   * @remarks
   * This method fetches the chains.csv file from the server, parses it,
   * transforms the data into the appropriate entity format, and stores
   * the results in the IndexedDB database.
   *
   * The CSV should contain columns: uuid, chain_name, mean_length,
   * mean_mass, v_chain, chain_type, chain_surface.
   *
   * @returns Promise that resolves when import is complete
   */
  private static readonly CSV_PARSE_TIMEOUT_MS = 60_000;

  async importFromFile() {
    await this.parseCsvAndStore();
  }

  private async parseCsvAndStore(): Promise<void> {
    const mapData = (data: ChainCsvDto[]) => {
      return data
        .map((item) => ({
          uuid: item.uuid,
          chain_name: item.chain_name,
          mean_length: Number(item.mean_length.replace(',', '.')),
          mean_mass: Number(item.mean_mass.replace(',', '.')),
          v_chain: item.v_chain === 'true',
          chain_type: item.chain_type,
          chain_surface: Number(item.chain_surface.replace(',', '.'))
        }))
        .filter((item) => item.chain_name);
    };

    let rawData: ChainCsvDto[];
    try {
      rawData = await this.parseCsvFromUrl(`${globalThis.location.origin}/data/chains.csv`);
    } catch (error) {
      this.logger.error('Error importing chains', error);
      return;
    }
    if (!rawData.length) {
      return;
    }
    const chainsTable: CatalogChainEntity[] = mapData(rawData);
    await replaceTableData(this.storageService.db?.catChains, chainsTable);
  }

  private parseCsvFromUrl(url: string): Promise<ChainCsvDto[]> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error('CSV parse timeout')), ChainsService.CSV_PARSE_TIMEOUT_MS);
      Papa.parse<ChainCsvDto>(url, {
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
