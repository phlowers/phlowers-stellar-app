/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Papa from 'papaparse';
import type { Table } from 'dexie';
import { runCsvImport } from '../csv-import.engine';
import { runJsonImport } from '../json-import.engine';
import { openWorkerDb } from '../csv-import.worker-db';
import { isJsonImportConfig, resolveCsvImportConfig } from '../configs';
import type { StellarDexieHandle } from '../json-import.engine.interfaces';
import type { CsvImportWorkerRequest, CsvImportWorkerResponse } from '../csv-import.worker.interfaces';
import { downloadAndHash } from './verified-download.helpers';
import { STAGING_TABLE_PREFIX } from '@infrastructure/database/app-database.versions';

/** Shape of a `metadata` row (mirrors `MetadataEntity`, kept local to avoid a runtime import). */
interface MetadataRow {
  key: string;
  value: string;
  updated_at: string;
}

/** Rows promoted per round-trip — bounds peak memory regardless of catalog size. */
const PROMOTION_BATCH_SIZE = 2000;

/**
 * Copies `stagingTable` into `liveTable` (already cleared) in bounded
 * batches, deleting each promoted batch from staging as it goes.
 *
 * @remarks
 * Never materializes the full table: each iteration reads at most
 * `PROMOTION_BATCH_SIZE` rows via a cursor, so staging always shrinks from
 * the front and the same rows are never re-scanned.
 */
async function promoteTableInBatches(
  liveTable: Table<unknown, unknown>,
  stagingTable: Table<unknown, unknown>
): Promise<void> {
  for (;;) {
    const batch: { key: unknown; row: unknown }[] = [];
    await stagingTable.limit(PROMOTION_BATCH_SIZE).each((row, cursor) => {
      batch.push({ key: cursor.primaryKey, row });
    });
    if (batch.length === 0) {
      break;
    }
    await liveTable.bulkPut(batch.map((entry) => entry.row));
    await stagingTable.bulkDelete(batch.map((entry) => entry.key));
  }
}

/**
 * Promotes the staging table(s) of one catalog to their live counterparts,
 * and records the verified hash — all inside a single Dexie transaction.
 *
 * @remarks
 * This is the ONLY place `live` catalog tables are ever mutated by the
 * import pipeline: the catalog's data and its recorded `catalog_hash:<file>`
 * always change together, or not at all. Staging tables end up empty once
 * fully promoted, so a retried import always starts from empty staging.
 */
async function promoteStagingToLive(
  db: StellarDexieHandle,
  tableNames: string[],
  metadataKey: string,
  verifiedHash: string
): Promise<void> {
  const liveTables = tableNames.map((name) => db[name] as Table<unknown, unknown>);
  const stagingTables = tableNames.map((name) => db[`${STAGING_TABLE_PREFIX}${name}`] as Table<unknown, unknown>);
  const metadataTable = db['metadata'] as Table<MetadataRow, string>;

  await db.transaction('rw', [...liveTables, ...stagingTables, metadataTable], async () => {
    for (let i = 0; i < tableNames.length; i++) {
      await liveTables[i].clear();
      await promoteTableInBatches(liveTables[i], stagingTables[i]);
    }
    await metadataTable.put({
      key: metadataKey,
      value: verifiedHash,
      updated_at: new Date().toISOString()
    });
  });
}

/**
 * Handles one catalog import request inside the worker. Downloads and
 * SHA-256-hashes the catalog exactly once, verifies it against
 * `request.expectedHash` (when provided) BEFORE touching Dexie, imports the
 * verified content into staging table(s) only, then promotes staging to
 * live (+ records the hash) in a single transaction. The `done` message is
 * only sent to the caller once promotion has fully succeeded, so a consumer
 * never sees "done" for a catalog that isn't actually live yet.
 *
 * @remarks
 * Exported so unit tests can drive it without spawning a real Web Worker.
 * Lives in its own module (without any top-level `addEventListener`) so it
 * can be imported safely from jsdom test environments. The actual worker
 * entry point is `csv-import.worker.ts`.
 */
export async function runWorkerImport(
  request: CsvImportWorkerRequest,
  post: (msg: CsvImportWorkerResponse) => void
): Promise<void> {
  const { blob, hash } = await downloadAndHash(request.url);
  if (request.expectedHash && request.expectedHash !== hash) {
    throw new Error(
      `Catalog hash mismatch for ${request.url}: expected ${request.expectedHash}, got ${hash} — refusing to import`
    );
  }

  const db = openWorkerDb();
  await db.open();
  try {
    const config = resolveCsvImportConfig(request.csvKey);

    // The engine's own 'done' is never forwarded as-is: it only reflects
    // staging having been fully written, not yet promoted to live.
    let stagedDone: CsvImportWorkerResponse | null = null;
    const stagingPost = (msg: CsvImportWorkerResponse) => {
      if (msg.type === 'done') {
        stagedDone = msg;
        return;
      }
      post(msg);
    };

    let tableNames: string[];
    if (isJsonImportConfig(config)) {
      const payload: unknown = JSON.parse(await blob.text());
      await runJsonImport(
        payload,
        config,
        { db: db as unknown as StellarDexieHandle, tableNamePrefix: STAGING_TABLE_PREFIX },
        stagingPost
      );
      tableNames = config.tableNames;
    } else {
      await runCsvImport(
        blob,
        config,
        {
          papa: Papa,
          resolveTable: (tableName) => db[`${STAGING_TABLE_PREFIX}${tableName}`] as Table<unknown, unknown>
        },
        stagingPost,
        { chunkSize: request.chunkSize }
      );
      tableNames = [config.tableName];
    }

    await promoteStagingToLive(
      db as unknown as StellarDexieHandle,
      tableNames,
      `catalog_hash:${config.filename}`,
      hash
    );

    if (!stagedDone || stagedDone.type !== 'done') {
      throw new Error(`Catalog import for ${config.filename} completed without a done message`);
    }
    post({ ...stagedDone, verifiedHash: hash });
  } finally {
    db.close();
  }
}
