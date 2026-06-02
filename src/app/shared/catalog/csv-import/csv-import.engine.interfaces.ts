/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { Table } from 'dexie';

/** Catalogs supported by the generic CSV import pipeline. */
export type CsvKey = 'attachments' | 'cables' | 'chains' | 'lines' | 'maintenance' | 'obstacles';

/** Per-import context handed to every config hook. */
export interface CsvImportContext {
  /** Dexie table where rows must be written. */
  table: Table<unknown, unknown>;
  /** ISO 8601 timestamp captured once at engine start. */
  now: string;
}

/** Result of `CsvImportConfig.processChunk`. */
export interface CsvProcessChunkResult {
  /** Number of rows consumed in this chunk (used for `progress` events). */
  processedRows: number;
  /** Optional distinct primary keys touched in the chunk (used for the final summary). */
  keys?: string[];
}

/**
 * Declarative description of how to import one CSV catalog.
 *
 * @typeParam TRow - Shape of one parsed CSV row (e.g. `CableCsvDto`).
 *
 * @remarks
 * Configs are created by factory functions (one per catalog) and registered
 * in the `CSV_IMPORT_REGISTRY`. The engine drives PapaParse + Dexie
 * generically; the config only owns row mapping & merge semantics.
 */
export interface CsvImportConfig<TRow = Record<string, string>> {
  /** Catalog key used to dispatch the worker. */
  csvKey: CsvKey;
  /** Filename under `/data/` (no leading slash). */
  filename: string;
  /** Target Dexie table name on the database. */
  tableName: string;
  /** PapaParse delimiter; default `,`. */
  delimiter?: string;
  /** PapaParse stream chunk size in bytes; default 512 KB. */
  chunkSize?: number;
  /** When true, the engine calls `table.clear()` once before streaming. Default `true`. */
  clearBeforeImport?: boolean;
  /**
   * Process one PapaParse chunk. Implementations map rows to entities and
   * write them (`bulkPut` / `bulkAdd` / merge). The engine never writes
   * directly — it only handles streaming and progress.
   */
  processChunk(rows: TRow[], ctx: CsvImportContext): Promise<CsvProcessChunkResult>;
  /**
   * Optional final hook called after the last chunk. Useful for dedup-then-write
   * patterns that need the full dataset before persisting.
   */
  finalize?(ctx: CsvImportContext): Promise<void>;
}
