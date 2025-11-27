/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { BehaviorSubject, catchError, of } from 'rxjs';
import { Chain, RteChainsCsvFile } from '../../data/database/interfaces/chain';
import Papa from 'papaparse';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ChainsService {
  public readonly ready = new BehaviorSubject<boolean>(false);

  constructor(
    private readonly storageService: StorageService,
    private readonly http: HttpClient
  ) {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  async getChains() {
    return this.storageService.db?.chains?.toArray();
  }

  async importFromFile() {
    const chains = this.http
      .get(`${window.location.origin}/data/chains.csv`, {
        responseType: 'text'
      })
      .pipe(
        catchError((error) => {
          console.error('Error importing chains', error);
          return of('');
        })
      );
    const mapData = (data: RteChainsCsvFile[]) => {
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
          complete: (async (
            jsonResults: Papa.ParseResult<RteChainsCsvFile>
          ) => {
            const data = jsonResults.data;
            if (!data || data.length === 0) {
              resolve();
              return;
            }
            await this.storageService.db?.chains.clear();
            const chainsTable: Chain[] = mapData(data);
            console.log('adding chains data', chainsTable.length);
            await this.storageService.db?.chains.bulkAdd(chainsTable);
            resolve();
          }) as (jsonResults: Papa.ParseResult<RteChainsCsvFile>) => void
        });
      });
    });
  }
}
