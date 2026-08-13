/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { CsvImportClientService } from './csv-import.client';
import type { CsvImportWorkerResponse } from './csv-import.worker.interfaces';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((ev: MessageEvent<CsvImportWorkerResponse>) => void) | null = null;
  onerror: ((ev: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor(
    public url: URL,
    public options: WorkerOptions
  ) {
    FakeWorker.instances.push(this);
  }
  emit(msg: CsvImportWorkerResponse): void {
    this.onmessage?.(new MessageEvent('message', { data: msg }));
  }
}

describe('CsvImportClientService', () => {
  let service: CsvImportClientService;
  let originalWorker: typeof Worker;

  beforeEach(() => {
    FakeWorker.instances = [];
    originalWorker = globalThis.Worker;
    (globalThis as unknown as { Worker: typeof Worker }).Worker = FakeWorker as unknown as typeof Worker;
    TestBed.configureTestingModule({ providers: [CsvImportClientService] });
    service = TestBed.inject(CsvImportClientService);
  });

  afterEach(() => {
    (globalThis as unknown as { Worker: typeof Worker }).Worker = originalWorker;
  });

  it('spawns a module worker and posts a request with the resolved URL', async () => {
    const promise = service.importCsv('cables');
    const worker = FakeWorker.instances[0];
    expect(worker).toBeDefined();
    expect(worker.options).toEqual({ type: 'module' });
    expect(worker.postMessage).toHaveBeenCalledWith({
      csvKey: 'cables',
      url: `${globalThis.location.origin}/data/cables.csv`,
      chunkSize: undefined
    });

    worker.emit({ type: 'done', csvKey: 'cables', totalRows: 3, totalKeys: 3 });
    await expect(promise).resolves.toMatchObject({ type: 'done', totalRows: 3, totalKeys: 3 });
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('resolves all 6 known csvKeys with the correct filename', async () => {
    const cases: Record<string, string> = {
      attachments: 'attachments.csv',
      cables: 'cables.csv',
      chains: 'chains.csv',
      lines: 'lines.csv',
      maintenance: 'maintenance-teams.csv',
      obstacles: 'obstacle_configuration.json'
    };
    for (const [key, filename] of Object.entries(cases)) {
      FakeWorker.instances = [];
      const promise = service.importCsv(key as 'attachments');
      const worker = FakeWorker.instances[0];
      expect(worker.postMessage).toHaveBeenCalledWith({
        csvKey: key,
        url: `${globalThis.location.origin}/data/${filename}`,
        chunkSize: undefined
      });
      worker.emit({
        type: 'done',
        csvKey: key as 'attachments',
        totalRows: 0,
        totalKeys: 0
      });
      await promise;
    }
  });

  it('forwards chunkSize override into the request', async () => {
    const promise = service.importCsv('cables', { chunkSize: 1024 });
    const worker = FakeWorker.instances[0];
    expect(worker.postMessage).toHaveBeenCalledWith({
      csvKey: 'cables',
      url: expect.stringContaining('/data/cables.csv'),
      chunkSize: 1024
    });
    worker.emit({ type: 'done', csvKey: 'cables', totalRows: 0, totalKeys: 0 });
    await promise;
  });

  it('forwards expectedHash into the request so the worker can verify the catalog before importing', async () => {
    const promise = service.importCsv('cables', { expectedHash: 'abc123' });
    const worker = FakeWorker.instances[0];
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ csvKey: 'cables', expectedHash: 'abc123' })
    );
    worker.emit({ type: 'done', csvKey: 'cables', totalRows: 0, totalKeys: 0, verifiedHash: 'abc123' });
    await expect(promise).resolves.toMatchObject({ verifiedHash: 'abc123' });
  });

  it('invokes onProgress for every progress message', async () => {
    const onProgress = vi.fn();
    const promise = service.importCsv('cables', { onProgress });
    const worker = FakeWorker.instances[0];
    worker.emit({ type: 'progress', csvKey: 'cables', processedRows: 10 });
    worker.emit({ type: 'progress', csvKey: 'cables', processedRows: 5 });
    worker.emit({ type: 'done', csvKey: 'cables', totalRows: 15, totalKeys: 2 });
    await promise;
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 10);
    expect(onProgress).toHaveBeenNthCalledWith(2, 5);
  });

  it('rejects and terminates worker on error message', async () => {
    const promise = service.importCsv('cables');
    const worker = FakeWorker.instances[0];
    worker.emit({ type: 'error', csvKey: 'cables', message: 'boom' });
    await expect(promise).rejects.toThrow('boom');
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('rejects and terminates worker when worker crashes', async () => {
    const promise = service.importCsv('cables');
    const worker = FakeWorker.instances[0];
    worker.onerror?.(new ErrorEvent('error', { message: 'crashed' }));
    await expect(promise).rejects.toThrow('crashed');
    expect(worker.terminate).toHaveBeenCalled();
  });
});
