/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { AttachmentCsvDto } from '@infrastructure/dto';
import type { CatalogSupportAttachmentEntity } from '@infrastructure/database';
import type { Table } from 'dexie';
import { groupChunkBySupport, mergeSupportAttachmentGroup } from '../../services/attachment.helpers';
import type { CsvImportConfig } from '../csv-import.engine.interfaces';

/**
 * Streaming-grouped config for `attachments.csv`.
 *
 * @remarks
 * Multiple CSV rows are merged into a single `CatalogSupportAttachmentEntity`
 * keyed by `support_name`, drastically reducing the IndexedDB B-tree size
 * (~230 k flat rows → ~500 grouped rows for the production dataset).
 */
export const createAttachmentsConfig = (): CsvImportConfig<AttachmentCsvDto> => ({
  csvKey: 'attachments',
  filename: 'attachments.csv',
  tableName: 'catSupportAttachments',
  async processChunk(rows, { table, now }) {
    const groups = groupChunkBySupport(rows);
    if (groups.length === 0) {
      return { processedRows: rows.length };
    }
    const keys = groups.map((g) => g.support_name);
    const typedTable = table as Table<CatalogSupportAttachmentEntity, string>;
    const existing = await typedTable.bulkGet(keys);
    const merged = groups.map((g, i) => mergeSupportAttachmentGroup(existing[i], g, now));
    await typedTable.bulkPut(merged);
    return { processedRows: rows.length, keys };
  }
});
