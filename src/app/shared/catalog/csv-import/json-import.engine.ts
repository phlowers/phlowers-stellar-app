/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { JsonImportApplyResult, JsonImportConfig, StellarDexieHandle } from './json-import.engine.interfaces';
import type { CsvImportWorkerResponse } from './csv-import.worker.interfaces';

/** Minimal `fetch` signature used by the JSON engine — kept narrow to ease testing. */
export type JsonImportFetcher = (url: string) => Promise<Response>;

/** Engine dependencies — injected to keep the engine pure & testable. */
export interface JsonImportEngineDeps {
  /** Worker-owned Dexie instance exposing every catalog table by name. */
  db: StellarDexieHandle;
  /** Network fetcher used to download the JSON payload. Defaults to `globalThis.fetch`. */
  fetcher?: JsonImportFetcher;
  /** Returns the current ISO 8601 timestamp (allows test injection). */
  now?: () => string;
}

/**
 * Fetches a JSON catalog, hands the parsed payload to the config, and posts
 * worker messages mirroring the CSV pipeline's protocol.
 *
 * @remarks
 * - Deterministic when `deps.fetcher` and `deps.now` are injected; otherwise falls back to the global `fetch`/`Date`.
 * - Posts a single `progress` message (1 chunk = whole file) and a `done`
 *   message at the end. Errors abort and bubble up as a rejected promise.
 * - The config owns transactional multi-table writes
 *
 * @param url - Absolute URL to the JSON file (downloaded via the injected fetcher).
 * @param config - Catalog-specific JSON validation & persistence logic.
 * @param deps - Injected dependencies (Dexie handle, fetcher, clock).
 * @param post - Callback used to forward worker messages to the main thread.
 * @returns Total rows and keys persisted by the config.
 */
export async function runJsonImport(
  url: string,
  config: JsonImportConfig,
  deps: JsonImportEngineDeps,
  post: (msg: CsvImportWorkerResponse) => void
): Promise<JsonImportApplyResult> {
  const fetcher: JsonImportFetcher = deps.fetcher ?? ((u) => globalThis.fetch(u));
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  const payload: unknown = await response.json();
  const now = (deps.now ?? (() => new Date().toISOString()))();
  const result = await config.apply(payload, { db: deps.db, now });
  post({ type: 'progress', csvKey: config.csvKey, processedRows: result.totalRows });
  post({ type: 'done', csvKey: config.csvKey, totalRows: result.totalRows, totalKeys: result.totalKeys });
  return result;
}
