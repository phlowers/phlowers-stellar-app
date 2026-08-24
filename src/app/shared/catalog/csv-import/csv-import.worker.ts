/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/// <reference lib="webworker" />

import { runWorkerImport } from './internal/run-worker-import.helpers';
import type { CsvImportWorkerRequest, CsvImportWorkerResponse } from './csv-import.worker.interfaces';

export { runWorkerImport } from './internal/run-worker-import.helpers';

/**
 * Web Worker entry point. Only registers the `message` listener when running
 * inside an actual `DedicatedWorkerGlobalScope` so importing this module from
 * a jsdom unit-test environment is a no-op.
 */
const isWorkerContext =
  typeof self !== 'undefined' &&
  typeof (globalThis as { DedicatedWorkerGlobalScope?: unknown }).DedicatedWorkerGlobalScope !== 'undefined' &&
  self instanceof (globalThis as { DedicatedWorkerGlobalScope: new () => unknown }).DedicatedWorkerGlobalScope;

if (isWorkerContext) {
  addEventListener('message', async ({ data }: MessageEvent<CsvImportWorkerRequest>) => {
    try {
      await runWorkerImport(data, (msg) => postMessage(msg));
    } catch (e) {
      postMessage({
        type: 'error',
        csvKey: data?.csvKey,
        message: e instanceof Error ? e.message : String(e)
      } satisfies CsvImportWorkerResponse);
    }
  });
}
