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
    bulkAdd: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined)
  };
  return {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    transaction: vi.fn(async (..._args: unknown[]) => {
      const cb = _args[2] as () => Promise<void>;
      await cb();
    }),
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
    catObstacleConfigurations = dexieState.tableState;
    catObstacleRuleDefinitions = dexieState.tableState;
    catObstacleDistances = dexieState.tableState;
    catObstacleWindZones = dexieState.tableState;
    catObstacleConformityConfig = dexieState.tableState;
    open = dexieState.open;
    close = dexieState.close;
    transaction = dexieState.transaction;
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
    dexieState.tableState.put.mockReset().mockResolvedValue(undefined);
    dexieState.open.mockClear();
    dexieState.close.mockClear();
    dexieState.transaction.mockClear().mockImplementation(async (..._args: unknown[]) => {
      const cb = _args[2] as () => Promise<void>;
      await cb();
    });
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

  it('dispatches obstacles to the JSON engine and writes every obstacle table in one transaction', async () => {
    const payload = {
      obstacles: [
        {
          obstacleType: 'ordinary_ground',
          obstacleName: 'Terrain ordinaire',
          details: 'd',
          redZone: false,
          conformity: 'overhang',
          distances: [{ ruleType: 'AT', active: true, overhang: { '63': 6.2 }, lateral: null }]
        }
      ],
      rules: [
        {
          ruleType: 'AT',
          ruleName: 'AT',
          color: '#FF0000',
          lateralPoint: { temperature: 15, pressure: 'WindZoneInput', redZone: false },
          overhangPoint: { temperature: null, pressure: 0, redZone: false }
        }
      ],
      repartitionTemperatureFields: { defaultValue: 75 },
      lateralTemperatureFields: { ruleType: 'CCG-LA', message: 'm' },
      windZone: { default: 'ZVN', values: [{ label: 'ZVN', normal: 240, redZone: 360 }] },
      intermediatePointPositions: [0.33, 0.66]
    };
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));

    const { runWorkerImport } = await import('./csv-import.worker');
    const messages: CsvImportWorkerResponse[] = [];
    await runWorkerImport({ csvKey: 'obstacles', url: 'http://x/obstacle_configuration.json' }, (m) =>
      messages.push(m)
    );

    expect(fetchSpy).toHaveBeenCalledWith('http://x/obstacle_configuration.json');
    // Single transaction wrapping all six obstacle tables.
    expect(dexieState.transaction).toHaveBeenCalledTimes(1);
    expect(dexieState.tableState.bulkPut).toHaveBeenCalled();
    expect(dexieState.tableState.put).toHaveBeenCalledTimes(1);
    // progress + done messages emitted by the JSON engine.
    expect(messages.at(0)).toMatchObject({ type: 'progress', csvKey: 'obstacles' });
    expect(messages.at(-1)).toMatchObject({ type: 'done', csvKey: 'obstacles' });

    fetchSpy.mockRestore();
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
