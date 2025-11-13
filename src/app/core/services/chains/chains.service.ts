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

const mockChains: () => Chain[] = () => {
  return [
    {
      name: 'Chain 1',
      length: 100,
      weight: 100,
      surface: 100,
      v: false
    }
  ];
};

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
          name: item.name,
          length: Number(item.length.replace(',', '.')),
          weight: Number(item.weight.replace(',', '.')),
          surface: Number(item.surface.replace(',', '.')),
          v: item.v === 'true'
        }))
        .filter((item) => item.name);
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
            await this.storageService.db?.chains.clear();
            if (!data || data.length === 0) {
              await this.storageService.db?.chains.bulkAdd(mockChains());
              resolve();
              return;
            }
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
