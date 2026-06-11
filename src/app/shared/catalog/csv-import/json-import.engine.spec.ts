/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { runJsonImport } from './json-import.engine';
import type { JsonImportConfig, StellarDexieHandle } from './json-import.engine.interfaces';
import type { CsvImportWorkerResponse } from './csv-import.worker.interfaces';

const fakeDb = {} as unknown as StellarDexieHandle;

function makeConfig(apply: JsonImportConfig['apply']): JsonImportConfig {
  return { kind: 'json', csvKey: 'obstacles', filename: 'x.json', apply };
}

describe('runJsonImport', () => {
  it('fetches the URL, hands the parsed payload to apply, and posts progress + done', async () => {
    const payload = { hello: 'world' };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    const apply = vi.fn(async () => ({ totalRows: 5, totalKeys: 3 }));
    const messages: CsvImportWorkerResponse[] = [];

    const result = await runJsonImport(
      'http://x/file.json',
      makeConfig(apply),
      { db: fakeDb, fetcher, now: () => '2026-06-05T00:00:00Z' },
      (m) => messages.push(m)
    );

    expect(fetcher).toHaveBeenCalledWith('http://x/file.json');
    expect(apply).toHaveBeenCalledWith(payload, {
      db: fakeDb,
      now: '2026-06-05T00:00:00Z'
    });
    expect(messages).toEqual([
      { type: 'progress', csvKey: 'obstacles', processedRows: 5 },
      { type: 'done', csvKey: 'obstacles', totalRows: 5, totalKeys: 3 }
    ]);
    expect(result).toEqual({ totalRows: 5, totalKeys: 3 });
  });

  it('rejects with a descriptive error when the HTTP response is not OK', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('boom', { status: 404 }));
    const apply = vi.fn();
    await expect(
      runJsonImport('http://x/missing.json', makeConfig(apply), { db: fakeDb, fetcher }, () => undefined)
    ).rejects.toThrow('Failed to fetch http://x/missing.json: HTTP 404');
    expect(apply).not.toHaveBeenCalled();
  });

  it('propagates the error and does not post messages when apply rejects', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    const apply = vi.fn().mockRejectedValue(new Error('apply failed'));
    const messages: CsvImportWorkerResponse[] = [];
    await expect(
      runJsonImport('http://x/file.json', makeConfig(apply), { db: fakeDb, fetcher }, (m) => messages.push(m))
    ).rejects.toThrow('apply failed');
    expect(messages).toEqual([]);
  });

  it('defaults to globalThis.fetch when no fetcher is injected', async () => {
    const payload = { ok: true };
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    const apply = vi.fn(async () => ({ totalRows: 0, totalKeys: 0 }));
    await runJsonImport('http://x/default.json', makeConfig(apply), { db: fakeDb }, () => undefined);
    expect(fetchSpy).toHaveBeenCalledWith('http://x/default.json');
    fetchSpy.mockRestore();
  });

  it('uses a default now() when none is provided', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    let capturedNow = '';
    const apply = vi.fn(async (_payload, ctx: { now: string }) => {
      capturedNow = ctx.now;
      return { totalRows: 0, totalKeys: 0 };
    });
    await runJsonImport('http://x/file.json', makeConfig(apply), { db: fakeDb, fetcher }, () => undefined);
    expect(capturedNow).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
