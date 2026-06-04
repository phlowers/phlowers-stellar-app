/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { LineCsvDto } from '@infrastructure/dto';
import type { CatalogLineEntity } from '@infrastructure/database';
import type { Table } from 'dexie';
import { sortBy, uniqBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { CsvImportConfig } from '../csv-import.engine.interfaces';

/** Maps one parsed CSV row to a `CatalogLineEntity`, or returns `null` to skip. */
export const mapLineRow = (item: LineCsvDto): CatalogLineEntity | null => {
  if (!item?.link_idr) return null;
  const hasNoVoltage = !item.voltage_idr || !item.voltage_adr || item.voltage_adr === '0.0';
  return {
    uuid: uuidv4(),
    link_idr: item.link_idr || '',
    link_adr: item.link_adr || '',
    lit_idr: item.lit_idr || '',
    lit_adr: item.lit_adr || '',
    branch_id: item.branch_id || '',
    branch_idr: item.branch_idr || '',
    branch_adr: item.branch_adr || '',
    voltage_idr: hasNoVoltage ? $localize`NO VOLTAGE` : item.voltage_idr,
    voltage_adr: hasNoVoltage ? 'NO_VOLTAGE' : item.voltage_adr
  };
};

const lineDedupKey = (e: CatalogLineEntity): string =>
  [e.voltage_idr, e.link_idr, e.lit_idr, e.branch_id, e.branch_idr].join('');

/**
 * Replace-mode config for `lines.csv` with chunk accumulation, then a
 * dedupe+sort post-pass before writing. The accumulator pattern is required
 * because dedup must consider the full dataset across all chunks.
 */
export const createLinesConfig = (): CsvImportConfig<LineCsvDto> => {
  const accumulator: CatalogLineEntity[] = [];
  return {
    csvKey: 'lines',
    filename: 'lines.csv',
    tableName: 'catLines',
    async processChunk(rows) {
      const entities = rows.map(mapLineRow).filter((e): e is CatalogLineEntity => e !== null);
      accumulator.push(...entities);
      return { processedRows: rows.length };
    },
    async finalize({ table }) {
      if (accumulator.length === 0) return;
      const unique = uniqBy(accumulator, lineDedupKey);
      const sorted = sortBy(unique, 'voltage_adr');
      await (table as Table<CatalogLineEntity, string>).bulkAdd(sorted);
      accumulator.length = 0;
    }
  };
};
