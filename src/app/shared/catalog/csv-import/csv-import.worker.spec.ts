/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Papa from 'papaparse';
import type { CsvImportWorkerResponse } from './csv-import.worker.interfaces';

const dexieState = vi.hoisted(() => {
  const tableState = {
    clear: vi.fn().mockResolvedValue(undefined),
    bulkGet: vi.fn().mockResolvedValue([]),
    bulkPut: vi.fn().mockResolvedValue(undefined),
    bulkAdd: vi.fn().mockResolvedValue(undefined)
  };
  return {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    tableState
  };
});

vi.mock('dexie', () => {
  class DexieMock {
    catSupportAttachments = dexieState.tableState;
    catCables = dexieState.tableState;
    catChains = dexieState.tableState;
    catLines = dexieState.tableState;
    catMaintenance = dexieState.tableState;
    catObstacleTypes = dexieState.tableState;
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

describe('csv-import.worker - runWorkerImport', () => {
  beforeEach(() => {
    dexieState.tableState.clear.mockClear().mockResolvedValue(undefined);
    dexieState.tableState.bulkGet.mockReset().mockResolvedValue([]);
    dexieState.tableState.bulkPut.mockReset().mockResolvedValue(undefined);
    dexieState.tableState.bulkAdd.mockReset().mockResolvedValue(undefined);
    dexieState.open.mockClear();
    dexieState.close.mockClear();
    vi.mocked(Papa.parse).mockReset();
  });

  it('opens Dexie, dispatches to the cables config, and closes on success', async () => {
    const { runWorkerImport } = await import('./csv-import.worker');
    vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
      const opts = args[1] as Papa.ParseConfig<Record<string, string>>;
      const parser = { pause: vi.fn(), resume: vi.fn(), abort: vi.fn() } as unknown as Papa.Parser;
      void (async () => {
        await opts.chunk?.(
          {
            data: [{ name: 'FAKE_X', cable_id: 'ID' } as Record<string, string>],
            errors: [],
            meta: {} as Papa.ParseMeta
          },
          parser
        );
        opts.complete?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, undefined);
      })();
    });

    const messages: CsvImportWorkerResponse[] = [];
    await runWorkerImport({ csvKey: 'cables', url: 'http://x/cables.csv' }, (m) => messages.push(m));

    expect(dexieState.open).toHaveBeenCalled();
    expect(dexieState.close).toHaveBeenCalled();
    expect(dexieState.tableState.clear).toHaveBeenCalledTimes(1);
    expect(messages.at(-1)).toMatchObject({ type: 'done', csvKey: 'cables', totalRows: 1 });
  });

  it('dispatches to the attachments config (grouped mode)', async () => {
    const { runWorkerImport } = await import('./csv-import.worker');
    vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
      const opts = args[1] as Papa.ParseConfig<Record<string, string>>;
      const parser = { pause: vi.fn(), resume: vi.fn(), abort: vi.fn() } as unknown as Papa.Parser;
      void (async () => {
        await opts.chunk?.(
          {
            data: [{ support_idr: 'S1', support_adr: '', support_tower: 'T', position: '1' } as Record<string, string>],
            errors: [],
            meta: {} as Papa.ParseMeta
          },
          parser
        );
        opts.complete?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, undefined);
      })();
    });
    const messages: CsvImportWorkerResponse[] = [];
    await runWorkerImport({ csvKey: 'attachments', url: 'http://x/a.csv' }, (m) => messages.push(m));
    expect(dexieState.tableState.bulkGet).toHaveBeenCalledWith(['S1']);
    expect(dexieState.tableState.bulkPut).toHaveBeenCalled();
    expect(messages.at(-1)).toMatchObject({ type: 'done', csvKey: 'attachments', totalKeys: 1 });
  });

  it('closes Dexie even when the engine rejects', async () => {
    const { runWorkerImport } = await import('./csv-import.worker');
    vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
      const opts = args[1] as Papa.ParseConfig<Record<string, string>>;
      opts.error?.(new Error('parse exploded'), undefined as unknown as File);
    });
    await expect(runWorkerImport({ csvKey: 'cables', url: 'http://x' }, () => undefined)).rejects.toThrow(
      'parse exploded'
    );
    expect(dexieState.close).toHaveBeenCalled();
  });
});
