/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { CsvKey } from './csv-import.engine.interfaces';

/** Input message: main thread asks the worker to import one CSV catalog. */
export interface CsvImportWorkerRequest {
  /** Catalog to import; selects the config in the registry. */
  csvKey: CsvKey;
  /** Absolute URL to fetch (e.g. `https://host/data/cables.csv`). */
  url: string;
  /** Optional PapaParse chunk size in bytes (overrides config default). */
  chunkSize?: number;
  /**
   * SHA-256 hex digest the downloaded content must match (e.g. from the
   * asset manifest's `data_hashes`). When provided, the worker verifies it
   * BEFORE any Dexie mutation and rejects on mismatch — the catalog is never
   * partially or incorrectly promoted.
   */
  expectedHash?: string;
}

/** Emitted after each processed chunk. */
export interface CsvImportProgressMessage {
  type: 'progress';
  csvKey: CsvKey;
  processedRows: number;
}

/** Final success message. */
export interface CsvImportDoneMessage {
  type: 'done';
  csvKey: CsvKey;
  totalRows: number;
  totalKeys: number;
  /** SHA-256 hex digest of the content that was actually downloaded and imported. */
  verifiedHash?: string;
}

/** Failure message — caller is expected to terminate the worker. */
export interface CsvImportErrorMessage {
  type: 'error';
  csvKey: CsvKey;
  message: string;
}

export type CsvImportWorkerResponse = CsvImportProgressMessage | CsvImportDoneMessage | CsvImportErrorMessage;
