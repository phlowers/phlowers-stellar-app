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
  it('hands the already-downloaded payload to apply, and posts progress + done (never fetches itself)', async () => {
    const payload = { hello: 'world' };
    const apply = vi.fn(async () => ({ totalRows: 5, totalKeys: 3 }));
    const messages: CsvImportWorkerResponse[] = [];

    const result = await runJsonImport(
      payload,
      makeConfig(apply),
      { db: fakeDb, now: () => '2026-06-05T00:00:00Z' },
      (m) => messages.push(m)
    );

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

  it('propagates the error and does not post messages when apply rejects', async () => {
    const apply = vi.fn().mockRejectedValue(new Error('apply failed'));
    const messages: CsvImportWorkerResponse[] = [];
    await expect(
      runJsonImport({ hello: 'world' }, makeConfig(apply), { db: fakeDb }, (m) => messages.push(m))
    ).rejects.toThrow('apply failed');
    expect(messages).toEqual([]);
  });

  it('uses a default now() when none is provided', async () => {
    let capturedNow = '';
    const apply = vi.fn(async (_payload, ctx: { now: string }) => {
      capturedNow = ctx.now;
      return { totalRows: 0, totalKeys: 0 };
    });
    await runJsonImport({ hello: 'world' }, makeConfig(apply), { db: fakeDb }, () => undefined);
    expect(capturedNow).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
