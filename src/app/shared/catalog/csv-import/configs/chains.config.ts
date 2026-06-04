/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { ChainCsvDto } from '@infrastructure/dto';
import type { CatalogChainEntity } from '@infrastructure/database';
import type { Table } from 'dexie';
import type { CsvImportConfig } from '../csv-import.engine.interfaces';

const parseNumber = (value: string | undefined): number => Number((value ?? '').replace(',', '.'));

/** Maps one parsed CSV row to a `CatalogChainEntity`, or returns `null` to skip. */
export const mapChainRow = (item: ChainCsvDto): CatalogChainEntity | null => {
  if (!item?.chain_name) return null;
  return {
    uuid: item.uuid,
    chain_name: item.chain_name,
    mean_length: parseNumber(item.mean_length),
    mean_mass: parseNumber(item.mean_mass),
    v_chain: item.v_chain === 'true',
    chain_type: item.chain_type,
    chain_surface: parseNumber(item.chain_surface)
  };
};

/** Replace-mode config for `chains.csv`. */
export const createChainsConfig = (): CsvImportConfig<ChainCsvDto> => ({
  csvKey: 'chains',
  filename: 'chains.csv',
  tableName: 'catChains',
  async processChunk(rows, { table }) {
    const entities = rows.map(mapChainRow).filter((e): e is CatalogChainEntity => e !== null);
    if (entities.length === 0) {
      return { processedRows: rows.length };
    }
    await (table as Table<CatalogChainEntity, string>).bulkPut(entities);
    return { processedRows: rows.length, keys: entities.map((e) => e.uuid) };
  }
});
