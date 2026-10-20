/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { CsvKey } from './csv-import.engine.interfaces';
import type { CsvImportErrorMessage } from './csv-import.worker.interfaces';
import { CatalogIntegrityError } from './csv-import.errors';

/** Builds the `error` message posted by the worker, tagging integrity failures with `code: 'integrity'`. */
export function toWorkerErrorMessage(csvKey: CsvKey, error: unknown): CsvImportErrorMessage {
  return {
    type: 'error',
    csvKey,
    message: error instanceof Error ? error.message : String(error),
    ...(error instanceof CatalogIntegrityError ? { code: 'integrity' as const } : {})
  };
}

/** Rebuilds the error rejected to the caller from an `error` message received from the worker. */
export function fromWorkerErrorMessage(data: CsvImportErrorMessage): Error {
  return data.code === 'integrity' ? new CatalogIntegrityError(data.message) : new Error(data.message);
}
