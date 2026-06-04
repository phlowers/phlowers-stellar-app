/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger/logger.service';
import { resolveCsvImportConfig } from './configs';
import type { CsvKey } from './csv-import.engine.interfaces';
import type {
  CsvImportDoneMessage,
  CsvImportWorkerRequest,
  CsvImportWorkerResponse
} from './csv-import.worker.interfaces';

/** Optional per-call hooks. */
export interface CsvImportClientOptions {
  /** Called for every `progress` message emitted by the worker. */
  onProgress?: (processedRows: number) => void;
  /** PapaParse chunk size in bytes (overrides config default). */
  chunkSize?: number;
}

/**
 * Spawns the generic CSV import Web Worker and waits for completion.
 *
 * @remarks
 * Stateless service; spawns one Worker per call, terminates it on `done`,
 * `error`, or `onerror`. Reuses `globalThis.Worker` so unit tests can replace
 * it with a fake.
 *
 * @category Services
 */
@Injectable({ providedIn: 'root' })
export class CsvImportClientService {
  private readonly logger = inject(LoggerService);

  /**
   * Imports a CSV catalog by streaming it through the generic worker.
   *
   * @param csvKey - Catalog key (selects the config registered in the registry).
   * @param options - Optional progress callback and chunk size override.
   * @returns Resolves with the final `done` payload on success; rejects on error.
   */
  async importCsv(csvKey: CsvKey, options: CsvImportClientOptions = {}): Promise<CsvImportDoneMessage> {
    const config = resolveCsvImportConfig(csvKey);
    const url = `${globalThis.location.origin}/data/${config.filename}`;
    const request: CsvImportWorkerRequest = { csvKey, url, chunkSize: options.chunkSize };

    return new Promise<CsvImportDoneMessage>((resolve, reject) => {
      const worker = new Worker(new URL('./csv-import.worker', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }: MessageEvent<CsvImportWorkerResponse>) => {
        if (data.type === 'progress') {
          options.onProgress?.(data.processedRows);
        } else if (data.type === 'done') {
          worker.terminate();
          resolve(data);
        } else if (data.type === 'error') {
          worker.terminate();
          this.logger.error(`CSV import worker failed for '${csvKey}'`, data.message);
          reject(new Error(data.message));
        }
      };
      worker.onerror = (event) => {
        worker.terminate();
        this.logger.error(`CSV import worker crashed for '${csvKey}'`, event.message);
        reject(new Error(event.message));
      };
      worker.postMessage(request);
    });
  }
}
