/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Papa from 'papaparse';
import { AttachmentImportWorkerResponse } from './attachment-import.worker.interfaces';

// Hoisted mock state for Dexie
const dexieState = vi.hoisted(() => {
  return {
    clear: vi.fn().mockResolvedValue(undefined),
    bulkGet: vi.fn().mockResolvedValue([]),
    bulkPut: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    open: vi.fn().mockResolvedValue(undefined)
  };
});

vi.mock('dexie', () => {
  class DexieMock {
    catSupportAttachments = {
      clear: dexieState.clear,
      bulkGet: dexieState.bulkGet,
      bulkPut: dexieState.bulkPut
    };
    open = dexieState.open;
    close = dexieState.close;
    version() {
      return { stores: () => this };
    }
  }
  return { __esModule: true, default: DexieMock, Table: class {} };
});

vi.mock('papaparse', () => ({
  __esModule: true,
  default: { parse: vi.fn() }
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

describe('attachment-import worker - runImport', () => {
  beforeEach(() => {
    dexieState.clear.mockClear();
    dexieState.bulkGet.mockReset().mockResolvedValue([]);
    dexieState.bulkPut.mockReset().mockResolvedValue(undefined);
    dexieState.open.mockClear();
    dexieState.close.mockClear();
    vi.mocked(Papa.parse).mockReset();
  });

  it('clears the table, parses the CSV by chunks, upserts merged groups, and posts done', async () => {
    const { runImport } = await import('./attachment-import.worker');

    vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
      const opts = args[1] as Papa.ParseConfig<Record<string, string>>;
      const parser = { pause: vi.fn(), resume: vi.fn(), abort: vi.fn() } as unknown as Papa.Parser;
      // Chunk 1: two rows for "S1"
      void (async () => {
        await opts.chunk?.(
          {
            data: [
              {
                support_idr: 'S1',
                support_adr: '',
                support_tower: 'T1',
                position: '1',
                X: '1',
                Y: '2',
                Z: '3',
                L: '4'
              },
              { support_idr: 'S1', support_adr: '', support_tower: 'T1', position: '2', X: '1', Y: '2', Z: '3', L: '4' }
            ],
            errors: [],
            meta: {} as Papa.ParseMeta
          },
          parser
        );
        opts.complete?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, undefined);
      })();
    });

    const messages: AttachmentImportWorkerResponse[] = [];
    await runImport({ url: 'http://x/test.csv' }, (m) => messages.push(m));

    expect(dexieState.clear).toHaveBeenCalled();
    expect(dexieState.bulkGet).toHaveBeenCalledWith(['S1']);
    expect(dexieState.bulkPut).toHaveBeenCalledTimes(1);
    const put = dexieState.bulkPut.mock.calls[0][0];
    expect(put).toHaveLength(1);
    expect(put[0].support_name).toBe('S1');
    expect(put[0].attachments).toHaveLength(2);
    expect(messages.at(-1)).toEqual({ type: 'done', totalRows: 2, totalSupports: 1 });
  });

  it('skips bulkGet/bulkPut when chunk has no valid rows', async () => {
    const { runImport } = await import('./attachment-import.worker');
    vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
      const opts = args[1] as Papa.ParseConfig<Record<string, string>>;
      const parser = { pause: vi.fn(), resume: vi.fn(), abort: vi.fn() } as unknown as Papa.Parser;
      void (async () => {
        await opts.chunk?.(
          {
            data: [{ support_idr: '', support_adr: '', position: '1' }],
            errors: [],
            meta: {} as Papa.ParseMeta
          },
          parser
        );
        opts.complete?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, undefined);
      })();
    });

    const messages: AttachmentImportWorkerResponse[] = [];
    await runImport({ url: 'http://x/test.csv' }, (m) => messages.push(m));

    expect(dexieState.bulkPut).not.toHaveBeenCalled();
    expect(messages.at(-1)).toEqual({ type: 'done', totalRows: 1, totalSupports: 0 });
  });

  it('rejects when PapaParse emits an error', async () => {
    const { runImport } = await import('./attachment-import.worker');
    vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
      const opts = args[1] as Papa.ParseConfig<Record<string, string>>;
      opts.error?.(new Error('csv broke'), undefined as unknown as File);
    });

    await expect(runImport({ url: 'http://x/test.csv' }, () => undefined)).rejects.toThrow('csv broke');
  });
});
