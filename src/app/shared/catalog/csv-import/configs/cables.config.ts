/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { CableCsvDto } from '@infrastructure/dto';
import type { CatalogCableEntity } from '@infrastructure/database';
import type { Table } from 'dexie';
import { convertStringToNumber } from '@shared/helpers/convertStringToNumber';
import type { CsvImportConfig } from '../csv-import.engine.interfaces';
import { toOptionalBoolean } from './csv-cell.helpers';

/** Maps one parsed CSV row to a `CatalogCableEntity`, or returns `null` to skip. */
export const mapCableRow = (item: CableCsvDto): CatalogCableEntity | null => {
  if (!item?.name) return null;
  return {
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
    is_bimetallic: toOptionalBoolean(item.is_bimetallic),
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
  };
};

/** Replace-mode config for `cables.csv`. */
export const createCablesConfig = (): CsvImportConfig<CableCsvDto> => ({
  csvKey: 'cables',
  filename: 'cables.csv',
  tableName: 'catCables',
  async processChunk(rows, { table }) {
    const entities = rows.map(mapCableRow).filter((e): e is CatalogCableEntity => e !== null);
    if (entities.length === 0) {
      return { processedRows: rows.length };
    }
    await (table as Table<CatalogCableEntity, string>).bulkPut(entities);
    return { processedRows: rows.length, keys: entities.map((e) => e.name) };
  }
});
