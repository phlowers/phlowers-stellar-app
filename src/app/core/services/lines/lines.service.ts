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
import { sortBy, uniqBy } from 'lodash';

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
          link_idr: item.link_idr || '',
          link_adr: item.link_adr || '',
          lit_idr: item.lit_idr || '',
          lit_adr: item.lit_adr || '',
          branch_idr: item.branch_idr || item.branch_id || '',
          branch_adr: item.branch_adr || '',
          voltage_idr: item.voltage_idr || '0',
          voltage_adr: item.voltage_adr || '0'
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
            const uniqueTable = uniqBy(table, (element) =>
              [
                element.voltage_idr,
                element.link_idr,
                element.lit_idr,
                element.branch_idr
              ].join('')
            );
            await this.storageService.db?.lines.bulkAdd(
              sortBy(uniqueTable, 'voltage_adr')
            );
            resolve();
          }) as (jsonResults: Papa.ParseResult<RteLinesCsvFile>) => void
        });
      });
    });
  }
}
