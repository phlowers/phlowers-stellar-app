/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject, catchError, of } from 'rxjs';
import { CatalogChainEntity } from '@core/infrastructure/database';
import { ChainCsvDto } from '@core/infrastructure/dto';
import Papa from 'papaparse';
import { HttpClient } from '@angular/common/http';

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

  constructor(
    private readonly storageService: StorageService,
    private readonly http: HttpClient
  ) {
    this.storageService.ready$.subscribe((value) => {
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
  async importFromFile() {
    const chains = this.http
      .get(`${globalThis.location.origin}/data/chains.csv`, {
        responseType: 'text'
      })
      .pipe(
        catchError((error) => {
          console.error('Error importing chains', error);
          return of('');
        })
      );
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

    await new Promise<void>((resolve) => {
      chains.subscribe(async (chains) => {
        Papa.parse(chains, {
          header: true,
          skipEmptyLines: true,
          complete: (async (jsonResults: Papa.ParseResult<ChainCsvDto>) => {
            const data = jsonResults.data;
            if (!data || data.length === 0) {
              resolve();
              return;
            }
            await this.storageService.db?.catChains.clear();
            const chainsTable: CatalogChainEntity[] = mapData(data);
            console.log('adding chains data', chainsTable.length);
            await this.storageService.db?.catChains.bulkAdd(chainsTable);
            resolve();
          }) as (jsonResults: Papa.ParseResult<ChainCsvDto>) => void
        });
      });
    });
  }
}
