/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { BehaviorSubject, catchError, of } from 'rxjs';
import { Cable, RteCablesCsvFile } from '../../data/database/interfaces/cable';
import Papa from 'papaparse';
import { HttpClient } from '@angular/common/http';
import { convertStringToNumber } from '@ui/shared/helpers/convertStringToNumber';

@Injectable({
  providedIn: 'root'
})
export class CablesService {
  public readonly ready = new BehaviorSubject<boolean>(false);

  constructor(
    private readonly storageService: StorageService,
    private readonly http: HttpClient
  ) {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  async getCables() {
    return this.storageService.db?.cables?.toArray();
  }

  async getCable(name: string): Promise<Cable | undefined> {
    return this.storageService.db?.cables?.where('name').equals(name).first();
  }

  async importFromFile() {
    const cables = this.http
      .get(`${window.location.origin}/data/cables.csv`, {
        responseType: 'text'
      })
      .pipe(
        catchError((error) => {
          console.error('Error importing cables', error);
          return of('');
        })
      );

    const mapData = (data: RteCablesCsvFile[]): Cable[] => {
      return data
        .map((item) => ({
          name: item.name,
          data_source: item.data_source,
          section: convertStringToNumber(item.section),
          diameter: convertStringToNumber(item.diameter),
          young_modulus: convertStringToNumber(item.young_modulus),
          linear_weight: convertStringToNumber(item.linear_weight),
          dilatation_coefficient: convertStringToNumber(
            item.dilatation_coefficient
          ),
          temperature_reference: convertStringToNumber(
            item.temperature_reference
          ),
          stress_strain_a0: convertStringToNumber(item.stress_strain_a0),
          stress_strain_a1: convertStringToNumber(item.stress_strain_a1),
          stress_strain_a2: convertStringToNumber(item.stress_strain_a2),
          stress_strain_a3: convertStringToNumber(item.stress_strain_a3),
          stress_strain_a4: convertStringToNumber(item.stress_strain_a4),
          stress_strain_b0: convertStringToNumber(item.stress_strain_b0),
          stress_strain_b1: convertStringToNumber(item.stress_strain_b1),
          stress_strain_b2: convertStringToNumber(item.stress_strain_b2),
          stress_strain_b3: convertStringToNumber(item.stress_strain_b3),
          stress_strain_b4: convertStringToNumber(item.stress_strain_b4),
          is_narcisse: item.is_narcisse === 'true'
        }))
        .filter((item) => item.name);
    };

    await new Promise<void>((resolve) => {
      cables.subscribe(async (cables) => {
        Papa.parse(cables, {
          header: true,
          skipEmptyLines: true,
          complete: (async (
            jsonResults: Papa.ParseResult<RteCablesCsvFile>
          ) => {
            const data = jsonResults.data;
            if (!data || data.length === 0) {
              resolve();
              return;
            }
            await this.storageService.db?.cables.clear();
            const cablesTable: Cable[] = mapData(data);
            console.log('adding cables data', cablesTable.length);
            await this.storageService.db?.cables.bulkAdd(cablesTable);
            resolve();
          }) as (jsonResults: Papa.ParseResult<RteCablesCsvFile>) => void
        });
      });
    });
  }
}
