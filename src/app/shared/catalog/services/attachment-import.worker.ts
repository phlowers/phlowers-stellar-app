/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/// <reference lib="webworker" />

import Papa from 'papaparse';
import Dexie, { Table } from 'dexie';
import { AttachmentCsvDto } from '@infrastructure/dto';
import { AttachmentImportWorkerRequest, AttachmentImportWorkerResponse } from './attachment-import.worker.interfaces';
import { groupChunkBySupport, mergeSupportAttachmentGroup } from './attachment.helpers';
import {
  USER_SCHEMA,
  USER_SCHEMA_V3,
  STUDY_SCHEMA,
  CATALOG_ATTACHMENT_SCHEMA,
  CATALOG_SUPPORT_ATTACHMENT_SCHEMA,
  CATALOG_CABLE_SCHEMA,
  CATALOG_CHAIN_SCHEMA,
  CATALOG_LINE_SCHEMA,
  CATALOG_MAINTENANCE_SCHEMA,
  CATALOG_OBSTACLE_TYPE_SCHEMA,
  METADATA_SCHEMA
} from '@infrastructure/database/schemas';
import { CatalogSupportAttachmentEntity } from '@infrastructure/database';

const DEFAULT_CHUNK_SIZE = 512 * 1024;

/**
 * Opens the same Dexie database as the main thread, declaring every historical
 * version so the worker stays in sync if the main thread already migrated.
 * IndexedDB allows concurrent access from multiple contexts on the same origin.
 */
function openDb(): Dexie & { catSupportAttachments: Table<CatalogSupportAttachmentEntity, string> } {
  const db = new Dexie('stellar-db') as Dexie & {
    catSupportAttachments: Table<CatalogSupportAttachmentEntity, string>;
  };

  db.version(1).stores({
    ...USER_SCHEMA,
    ...STUDY_SCHEMA,
    ...CATALOG_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA
  });
  db.version(2).stores({
    ...USER_SCHEMA,
    ...STUDY_SCHEMA,
    ...CATALOG_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA,
    ...METADATA_SCHEMA
  });
  db.version(3).stores({
    ...USER_SCHEMA_V3,
    ...STUDY_SCHEMA,
    ...CATALOG_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA,
    ...METADATA_SCHEMA
  });
  db.version(4).stores({
    ...USER_SCHEMA_V3,
    ...STUDY_SCHEMA,
    ...CATALOG_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA,
    ...METADATA_SCHEMA
  });
  db.version(5).stores({
    ...USER_SCHEMA_V3,
    ...STUDY_SCHEMA,
    ...CATALOG_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA,
    ...METADATA_SCHEMA
  });
  db.version(6).stores({
    ...USER_SCHEMA_V3,
    ...STUDY_SCHEMA,
    catAttachments: null,
    ...CATALOG_SUPPORT_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA,
    ...METADATA_SCHEMA
  });

  return db;
}

/**
 * Streams a CSV from `url` through PapaParse, accumulates rows per support,
 * and upserts grouped entities into IndexedDB one chunk at a time.
 *
 * @remarks
 * Exported so the unit test can drive it without spinning up a real worker.
 */
export async function runImport(
  request: AttachmentImportWorkerRequest,
  post: (msg: AttachmentImportWorkerResponse) => void
): Promise<void> {
  const db = openDb();
  await db.open();
  await db.catSupportAttachments.clear();

  let totalRows = 0;
  const seenSupports = new Set<string>();

  await new Promise<void>((resolve, reject) => {
    Papa.parse<AttachmentCsvDto>(request.url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      chunkSize: request.chunkSize ?? DEFAULT_CHUNK_SIZE,
      chunk: async (results, parser) => {
        parser.pause();
        try {
          const groups = groupChunkBySupport(results.data);
          if (groups.length > 0) {
            const keys = groups.map((g) => g.support_name);
            const existing = await db.catSupportAttachments.bulkGet(keys);
            const now = new Date().toISOString();
            const merged = groups.map((g, i) => mergeSupportAttachmentGroup(existing[i], g, now));
            await db.catSupportAttachments.bulkPut(merged);
            for (const g of groups) seenSupports.add(g.support_name);
          }
          totalRows += results.data.length;
          post({ type: 'progress', processedRows: results.data.length });
        } catch (e) {
          parser.abort();
          reject(e instanceof Error ? e : new Error(String(e)));
          return;
        }
        parser.resume();
      },
      complete: () => resolve(),
      error: (err) => reject(err instanceof Error ? err : new Error(String(err)))
    });
  });

  db.close();
  post({ type: 'done', totalRows, totalSupports: seenSupports.size });
}

addEventListener('message', async ({ data }: MessageEvent<AttachmentImportWorkerRequest>) => {
  try {
    await runImport(data, (msg) => postMessage(msg));
  } catch (e) {
    postMessage({
      type: 'error',
      message: e instanceof Error ? e.message : String(e)
    } satisfies AttachmentImportWorkerResponse);
  }
});
