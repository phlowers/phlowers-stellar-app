/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { MaintenanceCsvDto } from '@infrastructure/dto';
import type { CatalogMaintenanceEntity } from '@infrastructure/database';
import type { Table } from 'dexie';
import type { CsvImportConfig } from '../csv-import.engine.interfaces';

/** Maps one parsed CSV row to a `CatalogMaintenanceEntity`, or returns `null` to skip. */
export const mapMaintenanceRow = (item: MaintenanceCsvDto): CatalogMaintenanceEntity | null => {
  if (!item?.maintenance_team_id) return null;
  return {
    maintenance_center_id: item.maintenance_center_id || item.maintenance_id || '',
    maintenance_center: item.maintenance_center,
    regional_team_id: item.regional_team_id,
    regional_team: item.regional_team,
    maintenance_team_id: item.maintenance_team_id,
    maintenance_team: item.maintenance_team
  };
};

/**
 * Replace-mode config for `maintenance-teams.csv`.
 *
 * @remarks
 * `catMaintenance` uses `maintenance_team_id` as its primary key (see `CATALOG_MAINTENANCE_SCHEMA`).
 * Prefer `bulkPut` (upsert) so imports tolerate duplicate keys and repeated runs,
 * regardless of whether the engine clears the table before streaming.
 */
export const createMaintenanceConfig = (): CsvImportConfig<MaintenanceCsvDto> => ({
  csvKey: 'maintenance',
  filename: 'maintenance-teams.csv',
  tableName: 'catMaintenance',
  async processChunk(rows, { table }) {
    const entities = rows.map(mapMaintenanceRow).filter((e): e is CatalogMaintenanceEntity => e !== null);
    if (entities.length === 0) {
      return { processedRows: rows.length };
    }
    await (table as Table<CatalogMaintenanceEntity, string>).bulkPut(entities);
    return { processedRows: rows.length, keys: entities.map((e) => e.maintenance_team_id) };
  }
});
