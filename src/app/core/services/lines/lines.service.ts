/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { BehaviorSubject, catchError, of } from 'rxjs';
import Papa from 'papaparse';
import { HttpClient } from '@angular/common/http';
import { Line, RteLinesCsvFile } from '../../data/database/interfaces/line';
import { v4 as uuidv4 } from 'uuid';
import { sortBy } from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class LinesService {
  public readonly ready = new BehaviorSubject<boolean>(false);

  constructor(
    private readonly storageService: StorageService,
    private readonly http: HttpClient
  ) {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  async getLinesCount() {
    return this.storageService.db?.lines.count();
  }

  async getLines() {
    return this.storageService.db?.lines.toArray();
  }

  async importFromFile() {
    const linesFile = this.http
      .get(`${window.location.origin}/data/lines.csv`, {
        responseType: 'text'
      })
      .pipe(
        catchError((error) => {
          console.error('Error importing lines', error);
          return of('');
        })
      );

    const mapData = (data: RteLinesCsvFile[]) => {
      return data
        .map((item) => ({
          uuid: uuidv4(),
          link_idr: item.LIAISON_IDR || '',
          lit_idr: item.LIT_IDR || '',
          lit_adr: item.LIT_ADR || '',
          branch_idr: item.BRANCHE_IDR || '',
          branch_adr: item.BRANCHE_ADR || '',
          electric_tension_level_idr: item.TENSION_ELECTRIQUE_IDR || '',
          electric_tension_level_adr: item.TENSION_ELECTRIQUE_ADR || ''
        }))
        .filter((item) => item.link_idr);
    };
    await new Promise<void>((resolve) => {
      linesFile.subscribe(async (linesDataCsv) => {
        Papa.parse(linesDataCsv, {
          header: true,
          skipEmptyLines: true,
          complete: (async (jsonResults: Papa.ParseResult<RteLinesCsvFile>) => {
            const data = jsonResults.data;
            if (!data || data.length === 0) {
              resolve();
              return;
            }
            await this.storageService.db?.lines.clear();
            const table: Line[] = mapData(data);
            console.log('adding lines data', table.length);
            await this.storageService.db?.lines.bulkAdd(
              sortBy(table, 'electric_tension_level_adr')
            );
            resolve();
          }) as (jsonResults: Papa.ParseResult<RteLinesCsvFile>) => void
        });
      });
    });
  }
}
