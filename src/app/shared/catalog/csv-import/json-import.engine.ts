/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { JsonImportApplyResult, JsonImportConfig, StellarDexieHandle } from './json-import.engine.interfaces';
import type { CsvImportWorkerResponse } from './csv-import.worker.interfaces';

/** Engine dependencies — injected to keep the engine pure & testable. */
export interface JsonImportEngineDeps {
  /** Worker-owned Dexie instance exposing every catalog table by name. */
  db: StellarDexieHandle;
  /** Returns the current ISO 8601 timestamp (allows test injection). */
  now?: () => string;
}

/**
 * Hands an already-downloaded, already-parsed JSON payload to the config,
 * and posts worker messages mirroring the CSV pipeline's protocol.
 *
 * @remarks
 * - Never fetches: `payload` is the exact content already downloaded (and
 *   SHA-256-verified) by the caller (see `run-worker-import.ts`) — a
 *   catalog must be fetched over the network exactly once.
 * - Deterministic when `deps.now` is injected; otherwise falls back to `Date`.
 * - Posts a single `progress` message (1 chunk = whole file) and a `done`
 *   message at the end. Errors abort and bubble up as a rejected promise.
 * - The config owns transactional multi-table writes
 *
 * @param payload - The already-downloaded and parsed JSON content (never re-fetched).
 * @param config - Catalog-specific JSON validation & persistence logic.
 * @param deps - Injected dependencies (Dexie handle, clock).
 * @param post - Callback used to forward worker messages to the main thread.
 * @returns Total rows and keys persisted by the config.
 */
export async function runJsonImport(
  payload: unknown,
  config: JsonImportConfig,
  deps: JsonImportEngineDeps,
  post: (msg: CsvImportWorkerResponse) => void
): Promise<JsonImportApplyResult> {
  const now = (deps.now ?? (() => new Date().toISOString()))();
  const result = await config.apply(payload, { db: deps.db, now });
  post({ type: 'progress', csvKey: config.csvKey, processedRows: result.totalRows });
  post({ type: 'done', csvKey: config.csvKey, totalRows: result.totalRows, totalKeys: result.totalKeys });
  return result;
}
