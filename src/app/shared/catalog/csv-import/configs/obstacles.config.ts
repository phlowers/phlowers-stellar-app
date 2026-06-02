/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { ObstacleTypeCsvDto } from '@infrastructure/dto';
import type { CatalogObstacleTypeEntity } from '@infrastructure/database';
import type { Table } from 'dexie';
import type { CsvImportConfig } from '../csv-import.engine.interfaces';

/** Maps one parsed CSV row to a `CatalogObstacleTypeEntity`, or returns `null` to skip. */
export const mapObstacleTypeRow = (item: ObstacleTypeCsvDto): CatalogObstacleTypeEntity | null => {
  if (!item?.obstacle_type) return null;
  return {
    obstacle_type: item.obstacle_type,
    obstacle_type_name: item.obstacle_type_name,
    details: item.details
  };
};

/** Replace-mode config for `obstacle_type_rte.csv` (semicolon-delimited). */
export const createObstaclesConfig = (): CsvImportConfig<ObstacleTypeCsvDto> => ({
  csvKey: 'obstacles',
  filename: 'obstacle_type_rte.csv',
  tableName: 'catObstacleTypes',
  delimiter: ';',
  async processChunk(rows, { table }) {
    const entities = rows.map(mapObstacleTypeRow).filter((e): e is CatalogObstacleTypeEntity => e !== null);
    if (entities.length === 0) {
      return { processedRows: rows.length };
    }
    await (table as Table<CatalogObstacleTypeEntity, string>).bulkPut(entities);
    return { processedRows: rows.length, keys: entities.map((e) => e.obstacle_type) };
  }
});
