/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Papa from 'papaparse';
import { createSHA256 } from 'hash-wasm';
import type { CsvImportWorkerResponse } from './csv-import.worker.interfaces';

const LIVE_TABLE_NAMES = [
  'catSupportAttachments',
  'catCables',
  'catChains',
  'catLines',
  'catMaintenance',
  'catObstacleTypes',
  'catObstacleConfigurations',
  'catObstacleRuleDefinitions',
  'catObstacleDistances',
  'catObstacleWindZones',
  'catObstacleConformityConfig'
];

const dexieState = vi.hoisted(() => {
  function createTableMock() {
    return {
      clear: vi.fn().mockResolvedValue(undefined),
      bulkGet: vi.fn().mockResolvedValue([]),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      toArray: vi.fn().mockResolvedValue([])
    };
  }
  const liveTableNames = [
    'catSupportAttachments',
    'catCables',
    'catChains',
    'catLines',
    'catMaintenance',
    'catObstacleTypes',
    'catObstacleConfigurations',
    'catObstacleRuleDefinitions',
    'catObstacleDistances',
    'catObstacleWindZones',
    'catObstacleConformityConfig'
  ];
  // One independent mock instance per live table AND per staging_<table>
  // counterpart, so promotion (staging -> live) can be asserted precisely
  // instead of sharing a single mock across every table name.
  const tables: Record<string, ReturnType<typeof createTableMock>> = { metadata: createTableMock() };
  for (const name of liveTableNames) {
    tables[name] = createTableMock();
    tables[`staging_${name}`] = createTableMock();
  }
  return {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    transaction: vi.fn(async (..._args: unknown[]) => {
      const cb = _args[2] as () => Promise<void>;
      await cb();
    }),
    tables
  };
});

vi.mock('dexie', () => {
  class DexieMock {
    open = dexieState.open;
    close = dexieState.close;
    transaction = dexieState.transaction;
    constructor() {
      Object.assign(this, dexieState.tables);
    }
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
    for (const table of Object.values(dexieState.tables)) {
      table.clear.mockClear().mockResolvedValue(undefined);
      table.bulkGet.mockReset().mockResolvedValue([]);
      table.bulkPut.mockReset().mockResolvedValue(undefined);
      table.bulkAdd.mockReset().mockResolvedValue(undefined);
      table.put.mockReset().mockResolvedValue(undefined);
      table.toArray.mockReset().mockResolvedValue([]);
    }
    dexieState.open.mockClear();
    dexieState.close.mockClear();
    dexieState.transaction.mockClear().mockImplementation(async (..._args: unknown[]) => {
      const cb = _args[2] as () => Promise<void>;
      await cb();
    });
    vi.mocked(Papa.parse).mockReset();
    // Papa.parse is fully mocked below and ignores its first argument, so the
    // actual downloaded content never matters here — only that the single
    // verified download itself succeeds.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('placeholder', { status: 200 }));
  });

  afterEach(() => {
    vi.mocked(globalThis.fetch).mockRestore?.();
  });

  it('opens Dexie, imports into staging, promotes to live and records the hash on success', async () => {
    const { runWorkerImport } = await import('./csv-import.worker');
    vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
      const opts = args[1] as Papa.ParseConfig<Record<string, string>>;
      const parser = {
        pause: vi.fn(),
        resume: vi.fn(() => {
          opts.complete?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, undefined);
        }),
        abort: vi.fn()
      } as unknown as Papa.Parser;
      opts.chunk?.(
        {
          data: [{ name: 'FAKE_X', cable_id: 'ID' } as Record<string, string>],
          errors: [],
          meta: {} as Papa.ParseMeta
        },
        parser
      );
    });

    const messages: CsvImportWorkerResponse[] = [];
    await runWorkerImport({ csvKey: 'cables', url: 'http://x/cables.csv' }, (m) => messages.push(m));

    expect(dexieState.open).toHaveBeenCalled();
    expect(dexieState.close).toHaveBeenCalled();
    // Import writes to staging only — cleared once by the engine at start,
    // once more by the promotion step once staging has been copied to live.
    expect(dexieState.tables.staging_catCables.clear).toHaveBeenCalledTimes(2);
    expect(dexieState.tables.staging_catCables.bulkPut).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: 'FAKE_X' })])
    );
    // Live table is never written to by the engine directly, only by promotion.
    expect(dexieState.tables.catCables.clear).toHaveBeenCalledTimes(1);
    expect(dexieState.tables.metadata.put).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'catalog_hash:cables.csv' })
    );
    expect(messages.at(-1)).toMatchObject({ type: 'done', csvKey: 'cables', totalRows: 1 });
  });

  it('copies exactly the staged rows into the live table during promotion', async () => {
    const { runWorkerImport } = await import('./csv-import.worker');
    vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
      const opts = args[1] as Papa.ParseConfig<Record<string, string>>;
      const parser = {
        pause: vi.fn(),
        resume: vi.fn(() => opts.complete?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, undefined)),
        abort: vi.fn()
      } as unknown as Papa.Parser;
      opts.chunk?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, parser);
    });
    const stagedRows = [{ name: 'PROMOTED_CABLE' }];
    dexieState.tables.staging_catCables.toArray.mockResolvedValue(stagedRows);

    await runWorkerImport({ csvKey: 'cables', url: 'http://x/cables.csv' }, () => undefined);

    expect(dexieState.tables.catCables.bulkPut).toHaveBeenCalledWith(stagedRows);
  });

  it('includes the verified SHA-256 hash of the downloaded content in the done message', async () => {
    const { runWorkerImport } = await import('./csv-import.worker');
    vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
      const opts = args[1] as Papa.ParseConfig<Record<string, string>>;
      const parser = {
        pause: vi.fn(),
        resume: vi.fn(() => opts.complete?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, undefined)),
        abort: vi.fn()
      } as unknown as Papa.Parser;
      opts.chunk?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, parser);
    });

    const hasher = await createSHA256();
    hasher.init();
    hasher.update(new TextEncoder().encode('placeholder'));
    const expectedDigest = hasher.digest('hex');

    const messages: CsvImportWorkerResponse[] = [];
    await runWorkerImport({ csvKey: 'cables', url: 'http://x/cables.csv' }, (m) => messages.push(m));

    expect(messages.at(-1)).toMatchObject({ type: 'done', csvKey: 'cables', verifiedHash: expectedDigest });
  });

  it('rejects on a catalog hash mismatch before ever touching Dexie', async () => {
    const { runWorkerImport } = await import('./csv-import.worker');

    await expect(
      runWorkerImport(
        { csvKey: 'cables', url: 'http://x/cables.csv', expectedHash: 'not-the-real-hash' },
        () => undefined
      )
    ).rejects.toThrow(/Catalog hash mismatch/);

    expect(dexieState.open).not.toHaveBeenCalled();
    expect(dexieState.tables.staging_catCables.clear).not.toHaveBeenCalled();
    expect(dexieState.tables.catCables.clear).not.toHaveBeenCalled();
    expect(Papa.parse).not.toHaveBeenCalled();
  });

  it('dispatches to the attachments config (grouped mode)', async () => {
    const { runWorkerImport } = await import('./csv-import.worker');
    vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
      const opts = args[1] as Papa.ParseConfig<Record<string, string>>;
      const parser = {
        pause: vi.fn(),
        resume: vi.fn(() => {
          opts.complete?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, undefined);
        }),
        abort: vi.fn()
      } as unknown as Papa.Parser;
      opts.chunk?.(
        {
          data: [{ support_idr: 'S1', support_adr: '', support_tower: 'T', position: '1' } as Record<string, string>],
          errors: [],
          meta: {} as Papa.ParseMeta
        },
        parser
      );
    });
    const messages: CsvImportWorkerResponse[] = [];
    await runWorkerImport({ csvKey: 'attachments', url: 'http://x/a.csv' }, (m) => messages.push(m));
    expect(dexieState.tables.staging_catSupportAttachments.bulkGet).toHaveBeenCalledWith(['S1']);
    expect(dexieState.tables.staging_catSupportAttachments.bulkPut).toHaveBeenCalled();
    expect(dexieState.tables.catSupportAttachments.clear).toHaveBeenCalledTimes(1);
    expect(dexieState.tables.metadata.put).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'catalog_hash:attachments.csv' })
    );
    expect(messages.at(-1)).toMatchObject({ type: 'done', csvKey: 'attachments', totalKeys: 1 });
  });

  it('dispatches obstacles to the JSON engine, writes staging in one transaction, then promotes all 6 tables in a second transaction', async () => {
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
    // One transaction for the config's own 6-staging-table write, one more
    // for the generic staging -> live promotion.
    expect(dexieState.transaction).toHaveBeenCalledTimes(2);
    expect(dexieState.tables.staging_catObstacleTypes.bulkPut).toHaveBeenCalled();
    expect(dexieState.tables.staging_catObstacleConformityConfig.put).toHaveBeenCalledTimes(1);
    for (const name of LIVE_TABLE_NAMES.filter((n) => n.startsWith('catObstacle'))) {
      expect(dexieState.tables[name].clear).toHaveBeenCalledTimes(1);
    }
    expect(dexieState.tables.metadata.put).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'catalog_hash:obstacle_configuration.json' })
    );
    // progress + done messages emitted by the JSON engine.
    expect(messages.at(0)).toMatchObject({ type: 'progress', csvKey: 'obstacles' });
    expect(messages.at(-1)).toMatchObject({ type: 'done', csvKey: 'obstacles' });

    fetchSpy.mockRestore();
  });

  it('closes Dexie, and never promotes to live, when the engine rejects', async () => {
    const { runWorkerImport } = await import('./csv-import.worker');
    vi.mocked(Papa.parse).mockImplementation((...args: unknown[]) => {
      const opts = args[1] as Papa.ParseConfig<Record<string, string>>;
      opts.error?.(new Error('parse exploded'), undefined as unknown as File);
    });
    await expect(runWorkerImport({ csvKey: 'cables', url: 'http://x' }, () => undefined)).rejects.toThrow(
      'parse exploded'
    );
    expect(dexieState.close).toHaveBeenCalled();
    expect(dexieState.tables.catCables.clear).not.toHaveBeenCalled();
    expect(dexieState.tables.metadata.put).not.toHaveBeenCalled();
  });
});
