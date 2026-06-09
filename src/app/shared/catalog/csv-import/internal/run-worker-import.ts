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

/**
 * Handles one catalog import request inside the worker. Opens Dexie, resolves
 * the config for the requested catalog, dispatches to the CSV or JSON engine
 * depending on the config kind, then closes the database.
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
  const db = openWorkerDb();
  await db.open();
  try {
    const config = resolveCsvImportConfig(request.csvKey);
    if (isJsonImportConfig(config)) {
      await runJsonImport(request.url, config, { db: db as unknown as StellarDexieHandle }, post);
      return;
    }
    await runCsvImport(
      request.url,
      config,
      {
        papa: Papa,
        resolveTable: (tableName) => db[tableName] as Table<unknown, unknown>
      },
      post,
      { chunkSize: request.chunkSize }
    );
  } finally {
    db.close();
  }
}
