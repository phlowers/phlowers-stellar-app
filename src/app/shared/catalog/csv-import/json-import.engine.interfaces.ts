/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type Dexie from 'dexie';
import type { Table } from 'dexie';
import type { CsvKey } from './csv-import.engine.interfaces';

/** Loose Dexie handle exposing every Stellar catalog table by name. */
export type StellarDexieHandle = Dexie & Record<string, Table<unknown, unknown>>;

/** Per-import context handed to a JSON import config. */
export interface JsonImportContext {
  /** Worker-owned Dexie instance exposing every catalog table by name. */
  db: StellarDexieHandle;
  /** ISO 8601 timestamp captured once at engine start. */
  now: string;
}

/** Aggregated outcome returned by a JSON import application step. */
export interface JsonImportApplyResult {
  /** Total number of source rows / entries processed (sum across tables). */
  totalRows: number;
  /** Total number of distinct primary keys written. */
  totalKeys: number;
}

/**
 * Declarative description of how to import one JSON catalog.
 *
 * @remarks
 * Unlike `CsvImportConfig`, JSON configs receive the full parsed payload at
 * once and own the multi-table write semantics (typically wrapped in a
 * single Dexie `rw` transaction for atomicity).
 */
export interface JsonImportConfig {
  /** Discriminator — distinguishes JSON configs from CSV configs in the registry. */
  kind: 'json';
  /** Catalog key used to dispatch the worker. */
  csvKey: CsvKey;
  /** Filename under `/data/` (no leading slash). */
  filename: string;
  /**
   * Validate and persist the parsed JSON payload to Dexie. Implementations
   * must write atomically (single `db.transaction` call) and return the
   * aggregated row/key counts used to emit the final `done` message.
   */
  apply(content: unknown, ctx: JsonImportContext): Promise<JsonImportApplyResult>;
}
