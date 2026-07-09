/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type Papa from 'papaparse';
import type { Table } from 'dexie';
import type { CsvImportConfig } from './csv-import.engine.interfaces';
import type { CsvImportWorkerResponse } from './csv-import.worker.interfaces';

const DEFAULT_CHUNK_SIZE = 512 * 1024;

/** Engine dependencies — injected to keep the engine pure & testable. */
export interface CsvImportEngineDeps {
  /** PapaParse module reference. */
  papa: typeof Papa;
  /** Resolves the Dexie table by name; engine never opens the database itself. */
  resolveTable: (tableName: string) => Table<unknown, unknown>;
  /** Returns the current ISO 8601 timestamp (allows test injection). */
  now?: () => string;
}

/** Final result of a single import run. */
export interface CsvImportEngineResult {
  totalRows: number;
  totalKeys: number;
}

/**
 * Streams a CSV through PapaParse and drives a `CsvImportConfig` to
 * persist the data into a Dexie table chunk-by-chunk.
 *
 * @remarks
 * - Pure function: takes deps explicitly, does not touch globals.
 * - Pauses the parser per chunk to back-pressure IndexedDB writes.
 * - Posts a `progress` message after every chunk and a `done` message at the
 *   end. Errors abort the parser and bubble up as a rejected promise.
 *
 * @param url - Absolute URL to the CSV file (downloaded by PapaParse).
 * @param config - Catalog-specific row mapping & merge logic.
 * @param deps - Injected dependencies (Papa, table resolver, clock).
 * @param post - Callback used to forward worker messages to the main thread.
 * @returns Total rows and keys processed.
 */
export async function runCsvImport<TRow>(
  url: string,
  config: CsvImportConfig<TRow>,
  deps: CsvImportEngineDeps,
  post: (msg: CsvImportWorkerResponse) => void,
  overrides: { chunkSize?: number } = {}
): Promise<CsvImportEngineResult> {
  const table = deps.resolveTable(config.tableName);
  const now = (deps.now ?? (() => new Date().toISOString()))();
  const ctx = { table, now };

  if (config.clearBeforeImport !== false) {
    await table.clear();
  }

  let totalRows = 0;
  const seenKeys = new Set<string>();
  const chunkSize = overrides.chunkSize ?? config.chunkSize ?? DEFAULT_CHUNK_SIZE;

  await new Promise<void>((resolve, reject) => {
    deps.papa.parse<TRow>(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      delimiter: config.delimiter,
      chunkSize,
      chunk: (results, parser) => {
        parser.pause();
        void (async () => {
          try {
            const { processedRows, keys } = await config.processChunk(results.data, ctx);
            totalRows += processedRows;
            if (keys) {
              for (const k of keys) seenKeys.add(k);
            }
            post({ type: 'progress', csvKey: config.csvKey, processedRows });
          } catch (e) {
            parser.abort();
            reject(e instanceof Error ? e : new Error(String(e)));
            return;
          }
          parser.resume();
        })();
      },
      complete: () => resolve(),
      error: (err) => reject(err instanceof Error ? err : new Error(String(err)))
    });
  });

  if (config.finalize) {
    await config.finalize(ctx);
  }

  const result: CsvImportEngineResult = { totalRows, totalKeys: seenKeys.size };
  post({ type: 'done', csvKey: config.csvKey, totalRows: result.totalRows, totalKeys: result.totalKeys });
  return result;
}
