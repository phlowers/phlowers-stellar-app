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
import { CatalogCableEntity } from '@infrastructure/database';
import { CableCsvDto } from '@infrastructure/dto';
import Papa from 'papaparse';
import { HttpClient } from '@angular/common/http';
import { convertStringToNumber } from '@shared/helpers/convertStringToNumber';
import { replaceTableData } from '@services/storage/replace-table-data.helper';

/**
 * Service for managing electrical cable catalog data.
 *
 * @remarks
 * The CablesService handles loading, storing, and querying cable catalog
 * data from CSV files into the IndexedDB database. Cables contain
 * technical specifications for conductors used in transmission lines.
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
   * Retrieve all cables from the catalog.
   *
   * @returns Promise resolving to an array of all cable entities
   */
  async getCables() {
    return this.storageService.db?.catCables?.toArray();
  }

  /**
   * Retrieve a specific cable by its name.
   *
   * @param name - The unique name identifier of the cable
   * @returns Promise resolving to the cable entity if found, undefined otherwise
   */
  async getCable(name: string): Promise<CatalogCableEntity | undefined> {
    return this.storageService.db?.catCables?.where('name').equals(name).first();
  }

  /**
   * Import cable catalog data from a CSV file.
   *
   * @remarks
   * This method fetches the cables.csv file from the server, parses it,
   * transforms the data into the appropriate entity format, and stores
   * the results in the IndexedDB database.
   *
   * The CSV should contain columns for all cable properties including
   * mechanical and electrical characteristics like section, diameter,
   * young_modulus, linear_mass, stress-strain coefficients, etc.
   *
   * @returns Promise that resolves when import is complete
   */
  async importFromFile() {
    const cables = this.http
      .get(`${globalThis.location.origin}/data/cables.csv`, {
        responseType: 'text'
      })
      .pipe(
        catchError((error) => {
          this.logger.error('Error importing cables', error);
          return of('');
        })
      );

    const mapData = (data: CableCsvDto[]): CatalogCableEntity[] => {
      return data
        .map((item) => ({
          id: item.cable_id,
          name: item.name,
          data_source: item.data_source,
          section: convertStringToNumber(item.section),
          diameter: convertStringToNumber(item.diameter),
          young_modulus: convertStringToNumber(item.young_modulus),
          linear_mass: convertStringToNumber(item.linear_mass),
          dilatation_coefficient: convertStringToNumber(item.dilatation_coefficient),
          temperature_reference: convertStringToNumber(item.temperature_reference),
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
          is_polynomial: item.is_polynomial === 'true' || item.is_polynomial === 'True',
          diameter_heart: convertStringToNumber(item.diameter_heart),
          section_conductor: convertStringToNumber(item.section_conductor),
          section_heart: convertStringToNumber(item.section_heart),
          solar_absorption: convertStringToNumber(item.solar_absorption),
          emissivity: convertStringToNumber(item.emissivity),
          electric_resistance_20: convertStringToNumber(item.electric_resistance_20),
          linear_resistance_temperature_coef: convertStringToNumber(item.linear_resistance_temperature_coef),
          radial_thermal_conductivity: convertStringToNumber(item.radial_thermal_conductivity),
          has_magnetic_heart: item.has_magnetic_heart === 'true',
          is_bimetallic:
            item.is_bimetallic == null || item.is_bimetallic.trim() === ''
              ? undefined
              : item.is_bimetallic.toLowerCase() === 'true',
          rts_cable: convertStringToNumber(item.rts_cable),
          rts_layer_1: convertStringToNumber(item.rts_layer_1),
          nb_strand_layer_1: convertStringToNumber(item.nb_strand_layer_1),
          rts_layer_2: convertStringToNumber(item.rts_layer_2),
          nb_strand_layer_2: convertStringToNumber(item.nb_strand_layer_2),
          rts_layer_3: convertStringToNumber(item.rts_layer_3),
          nb_strand_layer_3: convertStringToNumber(item.nb_strand_layer_3),
          rts_layer_4: convertStringToNumber(item.rts_layer_4),
          nb_strand_layer_4: convertStringToNumber(item.nb_strand_layer_4),
          rts_layer_5: convertStringToNumber(item.rts_layer_5),
          nb_strand_layer_5: convertStringToNumber(item.nb_strand_layer_5),
          rts_layer_6: convertStringToNumber(item.rts_layer_6),
          nb_strand_layer_6: convertStringToNumber(item.nb_strand_layer_6),
          rts_layer_7: convertStringToNumber(item.rts_layer_7),
          nb_strand_layer_7: convertStringToNumber(item.nb_strand_layer_7),
          rts_layer_8: convertStringToNumber(item.rts_layer_8),
          nb_strand_layer_8: convertStringToNumber(item.nb_strand_layer_8),
          safety_coefficient: convertStringToNumber(item.safety_coefficient)
        }))
        .filter((item) => item.name);
    };

    await new Promise<void>((resolve) => {
      cables.subscribe(async (cables) => {
        Papa.parse(cables, {
          header: true,
          skipEmptyLines: true,
          complete: (async (jsonResults: Papa.ParseResult<CableCsvDto>) => {
            const data = jsonResults.data;
            if (!data || data.length === 0) {
              resolve();
              return;
            }
            const cablesTable: CatalogCableEntity[] = mapData(data);
            await replaceTableData(this.storageService.db?.catCables, cablesTable);
            resolve();
          }) as (jsonResults: Papa.ParseResult<CableCsvDto>) => void
        });
      });
    });
  }
}
