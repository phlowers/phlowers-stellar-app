/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Papa from 'papaparse';
import type { Table } from 'dexie';
import { runCsvImport } from './csv-import.engine';
import type { CsvImportConfig } from './csv-import.engine.interfaces';
import type { CsvImportWorkerResponse } from './csv-import.worker.interfaces';
import { parseFixtureCsv } from './__tests__/csv-fixture.helpers';
import type { CableCsvDto, ChainCsvDto, LineCsvDto, AttachmentCsvDto } from '@infrastructure/dto';
import { createAttachmentsConfig } from './configs/attachments.config';
import { createCablesConfig } from './configs/cables.config';
import { createChainsConfig } from './configs/chains.config';
import { createLinesConfig } from './configs/lines.config';
import { createMaintenanceConfig } from './configs/maintenance.config';

vi.mock('uuid', () => {
  let i = 0;
  return { v4: vi.fn(() => `mock-uuid-${++i}`) };
});

/**
 * Builds a fake Dexie table that captures writes in memory and exposes
 * spies for assertions.
 */
function makeFakeTable() {
  const store = new Map<unknown, unknown>();
  const recorder = {
    clearCalls: 0,
    bulkAddCalls: [] as unknown[][],
    bulkPutCalls: [] as unknown[][],
    bulkGetCalls: [] as unknown[][]
  };
  const table = {
    clear: vi.fn(async () => {
      recorder.clearCalls += 1;
      store.clear();
    }),
    bulkAdd: vi.fn(async (items: unknown[]) => {
      recorder.bulkAddCalls.push(items);
      for (const item of items) {
        const it = item as Record<string, unknown>;
        const key =
          it['uuid'] ??
          it['name'] ??
          it['support_name'] ??
          it['obstacle_type'] ??
          it['maintenance_team_id'] ??
          JSON.stringify(it);
        store.set(key, item);
      }
    }),
    bulkPut: vi.fn(async (items: unknown[]) => {
      recorder.bulkPutCalls.push(items);
      for (const item of items) {
        const it = item as Record<string, unknown>;
        const key =
          it['uuid'] ??
          it['name'] ??
          it['support_name'] ??
          it['obstacle_type'] ??
          it['maintenance_team_id'] ??
          JSON.stringify(it);
        store.set(key, item);
      }
    }),
    bulkGet: vi.fn(async (keys: unknown[]) => {
      recorder.bulkGetCalls.push(keys);
      return keys.map((k) => store.get(k));
    })
  };
  return { table: table as unknown as Table<unknown, unknown>, store, recorder };
}

/**
 * Builds a fake `Papa.parse` driver that, on call, synchronously emits the
 * given rows as a single chunk and resolves via `complete`.
 *
 * Used to keep the engine deterministic without spinning up a real PapaParse
 * pipeline (which would require streaming a network resource).
 */
function makePapaSingleChunkDriver<T>(rows: T[]): typeof Papa {
  return {
    parse: vi.fn((_url: unknown, opts: Papa.ParseConfig<T>) => {
      const parser = { pause: vi.fn(), resume: vi.fn(), abort: vi.fn() } as unknown as Papa.Parser;
      void (async () => {
        await opts.chunk?.({ data: rows, errors: [], meta: {} as Papa.ParseMeta }, parser);
        opts.complete?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, undefined);
      })();
    })
  } as unknown as typeof Papa;
}

describe('runCsvImport (engine)', () => {
  describe('replace mode (cables fixture)', () => {
    it('clears the table once, maps every valid row, posts progress + done', async () => {
      const { table, recorder } = makeFakeTable();
      const rows = parseFixtureCsv<CableCsvDto>('cables');
      const papa = makePapaSingleChunkDriver(rows);
      const config = createCablesConfig();

      const messages: CsvImportWorkerResponse[] = [];
      const result = await runCsvImport(
        'http://test/cables.csv',
        config,
        { papa, resolveTable: () => table, now: () => '2026-01-01T00:00:00.000Z' },
        (m) => messages.push(m)
      );

      expect(recorder.clearCalls).toBe(1);
      expect(recorder.bulkPutCalls).toHaveLength(1);
      // Fixture has 4 rows, 1 has empty name → 3 entities
      const entities = recorder.bulkPutCalls[0] as { name: string }[];
      expect(entities.map((e) => e.name).sort()).toEqual(['FAKE_ALPHA', 'FAKE_BRAVO', 'FAKE_DELTA']);
      expect(result.totalRows).toBe(rows.length);
      expect(result.totalKeys).toBe(3);
      expect(messages.filter((m) => m.type === 'progress')).toHaveLength(1);
      expect(messages.at(-1)).toMatchObject({ type: 'done', csvKey: 'cables', totalRows: rows.length, totalKeys: 3 });
    });

    it('emits progress with processedRows = chunk length', async () => {
      const { table } = makeFakeTable();
      const rows = parseFixtureCsv<CableCsvDto>('cables');
      const papa = makePapaSingleChunkDriver(rows);
      const messages: CsvImportWorkerResponse[] = [];
      await runCsvImport('http://x', createCablesConfig(), { papa, resolveTable: () => table }, (m) =>
        messages.push(m)
      );
      const progress = messages.find((m) => m.type === 'progress');
      expect(progress).toMatchObject({ type: 'progress', csvKey: 'cables', processedRows: rows.length });
    });

    it('does not call bulkPut when no row is valid', async () => {
      const { table, recorder } = makeFakeTable();
      const papa = makePapaSingleChunkDriver([{ name: '' }] as CableCsvDto[]);
      await runCsvImport('http://x', createCablesConfig(), { papa, resolveTable: () => table }, () => undefined);
      expect(recorder.bulkPutCalls).toHaveLength(0);
    });
  });

  describe('replace mode without clear (clearBeforeImport: false)', () => {
    it('does NOT call clear when clearBeforeImport is false', async () => {
      const { table, recorder } = makeFakeTable();
      const papa = makePapaSingleChunkDriver<{ name: string }>([{ name: 'x' }]);
      const config: CsvImportConfig<{ name: string }> = {
        csvKey: 'cables',
        filename: 'x.csv',
        tableName: 't',
        clearBeforeImport: false,
        processChunk: async (rows) => ({ processedRows: rows.length })
      };
      await runCsvImport('http://x', config, { papa, resolveTable: () => table }, () => undefined);
      expect(recorder.clearCalls).toBe(0);
    });
  });

  describe('grouped mode (attachments fixture)', () => {
    it('groups by support_name and stores one entity per support', async () => {
      const { table, recorder } = makeFakeTable();
      const rows = parseFixtureCsv<AttachmentCsvDto>('attachments');
      const papa = makePapaSingleChunkDriver(rows);
      await runCsvImport(
        'http://x',
        createAttachmentsConfig(),
        { papa, resolveTable: () => table, now: () => '2026-01-01T00:00:00.000Z' },
        () => undefined
      );
      const groups = recorder.bulkPutCalls[0] as { support_name: string; attachments: unknown[] }[];
      const names = groups.map((g) => g.support_name).sort();
      // SUP-A, SUP-B from idr; "Support Charlie" from adr fallback
      expect(names).toEqual(['SUP-A', 'SUP-B', 'Support Charlie']);
      const alpha = groups.find((g) => g.support_name === 'SUP-A');
      expect(alpha?.attachments).toHaveLength(3);
    });

    it('forwards `now` from deps into mergeSupportAttachmentGroup', async () => {
      const { table, recorder } = makeFakeTable();
      const rows = parseFixtureCsv<AttachmentCsvDto>('attachments');
      const papa = makePapaSingleChunkDriver(rows);
      await runCsvImport(
        'http://x',
        createAttachmentsConfig(),
        { papa, resolveTable: () => table, now: () => '2026-06-15T12:00:00.000Z' },
        () => undefined
      );
      const groups = recorder.bulkPutCalls[0] as { created_at: string; updated_at: string }[];
      for (const g of groups) {
        expect(g.created_at).toBe('2026-06-15T12:00:00.000Z');
        expect(g.updated_at).toBe('2026-06-15T12:00:00.000Z');
      }
    });
  });

  describe('lines mode (dedup + sort in finalize)', () => {
    it('deduplicates by composite key and persists via bulkAdd in finalize', async () => {
      const { table, recorder } = makeFakeTable();
      const rows = parseFixtureCsv<LineCsvDto>('lines');
      const papa = makePapaSingleChunkDriver(rows);
      await runCsvImport('http://x', createLinesConfig(), { papa, resolveTable: () => table }, () => undefined);
      // bulkAdd called once in finalize
      expect(recorder.bulkAddCalls).toHaveLength(1);
      const persisted = recorder.bulkAddCalls[0] as {
        voltage_idr: string;
        voltage_adr: string;
        link_idr: string;
      }[];
      // Fixture 8 rows: 1 has empty link_idr (skipped). Two pairs of perfect
      // duplicates on the composite key → 5 unique entities persisted.
      expect(persisted).toHaveLength(5);
      // Sorted by voltage_adr (string sort): "0.0" → "NO_VOLTAGE" then numeric strings
      // (lodash sortBy is lexicographic on strings here)
      // Empty voltage_adr rows get 'NO_VOLTAGE'
      const noVolt = persisted.find((p) => p.voltage_adr === 'NO_VOLTAGE');
      expect(noVolt).toBeDefined();
    });
  });

  describe('chunkSize override', () => {
    it('forwards override.chunkSize over config.chunkSize', async () => {
      const { table } = makeFakeTable();
      const captured: { chunkSize?: number } = {};
      const papa = {
        parse: vi.fn((_url, opts: Papa.ParseConfig<unknown>) => {
          captured.chunkSize = opts.chunkSize;
          const parser = { pause: vi.fn(), resume: vi.fn(), abort: vi.fn() } as unknown as Papa.Parser;
          opts.complete?.({ data: [], errors: [], meta: {} as Papa.ParseMeta }, parser);
        })
      } as unknown as typeof Papa;
      const config = createCablesConfig();
      config.chunkSize = 1024;
      await runCsvImport('http://x', config, { papa, resolveTable: () => table }, () => undefined, { chunkSize: 2048 });
      expect(captured.chunkSize).toBe(2048);
    });
  });

  describe('error handling', () => {
    it('rejects when PapaParse emits an error', async () => {
      const { table } = makeFakeTable();
      const papa = {
        parse: vi.fn((_url, opts: Papa.ParseConfig<unknown>) => {
          opts.error?.(new Error('csv broke'), undefined as unknown as File);
        })
      } as unknown as typeof Papa;
      await expect(
        runCsvImport('http://x', createCablesConfig(), { papa, resolveTable: () => table }, () => undefined)
      ).rejects.toThrow('csv broke');
    });

    it('aborts the parser and rejects when processChunk throws', async () => {
      const { table } = makeFakeTable();
      const abort = vi.fn();
      const papa = {
        parse: vi.fn((_url, opts: Papa.ParseConfig<unknown>) => {
          const parser = { pause: vi.fn(), resume: vi.fn(), abort } as unknown as Papa.Parser;
          void (async () => {
            await opts.chunk?.({ data: [{ name: 'x' }], errors: [], meta: {} as Papa.ParseMeta }, parser);
          })();
        })
      } as unknown as typeof Papa;
      const config: CsvImportConfig<unknown> = {
        csvKey: 'cables',
        filename: 'x.csv',
        tableName: 't',
        processChunk: async () => {
          throw new Error('chunk failed');
        }
      };
      await expect(
        runCsvImport('http://x', config, { papa, resolveTable: () => table }, () => undefined)
      ).rejects.toThrow('chunk failed');
      expect(abort).toHaveBeenCalled();
    });

    it('wraps non-Error rejections from Papa.error', async () => {
      const { table } = makeFakeTable();
      const papa = {
        parse: vi.fn((_url, opts: Papa.ParseConfig<unknown>) => {
          opts.error?.('string error' as unknown as Error, undefined as unknown as File);
        })
      } as unknown as typeof Papa;
      await expect(
        runCsvImport('http://x', createCablesConfig(), { papa, resolveTable: () => table }, () => undefined)
      ).rejects.toThrow('string error');
    });

    it('wraps non-Error rejections from processChunk', async () => {
      const { table } = makeFakeTable();
      const papa = {
        parse: vi.fn((_url, opts: Papa.ParseConfig<unknown>) => {
          const parser = { pause: vi.fn(), resume: vi.fn(), abort: vi.fn() } as unknown as Papa.Parser;
          void (async () => {
            await opts.chunk?.({ data: [{ name: 'x' }], errors: [], meta: {} as Papa.ParseMeta }, parser);
          })();
        })
      } as unknown as typeof Papa;
      const config: CsvImportConfig<unknown> = {
        csvKey: 'cables',
        filename: 'x.csv',
        tableName: 't',
        processChunk: async () => {
          throw 'string failure';
        }
      };
      await expect(
        runCsvImport('http://x', config, { papa, resolveTable: () => table }, () => undefined)
      ).rejects.toThrow('string failure');
    });
  });

  describe('finalize hook', () => {
    it('calls finalize after the last chunk', async () => {
      const { table } = makeFakeTable();
      const finalize = vi.fn().mockResolvedValue(undefined);
      const config: CsvImportConfig<{ x: number }> = {
        csvKey: 'cables',
        filename: 'x.csv',
        tableName: 't',
        processChunk: async (rows) => ({ processedRows: rows.length }),
        finalize
      };
      const papa = makePapaSingleChunkDriver([{ x: 1 }]);
      await runCsvImport('http://x', config, { papa, resolveTable: () => table }, () => undefined);
      expect(finalize).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration with all configs', () => {
    it('chains fixture parses through createChainsConfig', async () => {
      const { table, recorder } = makeFakeTable();
      const rows = parseFixtureCsv<ChainCsvDto>('chains');
      const papa = makePapaSingleChunkDriver(rows);
      await runCsvImport('http://x', createChainsConfig(), { papa, resolveTable: () => table }, () => undefined);
      const entities = recorder.bulkPutCalls[0] as { chain_name: string; mean_length: number }[];
      // One row has empty chain_name → filtered. Fixture has 5 rows, 4 valid.
      expect(entities).toHaveLength(4);
      // Comma decimals parsed: "3,250" → 3.25
      const a = entities.find((e) => e.chain_name === 'FAKE_CHAIN_A');
      expect(a?.mean_length).toBeCloseTo(3.25);
    });

    it('maintenance fixture parses through createMaintenanceConfig', async () => {
      const { table, recorder } = makeFakeTable();
      const rows = parseFixtureCsv('maintenance');
      const papa = makePapaSingleChunkDriver(rows);
      await runCsvImport('http://x', createMaintenanceConfig(), { papa, resolveTable: () => table }, () => undefined);
      const entities = recorder.bulkPutCalls[0] as { maintenance_team_id: string; maintenance_center_id: string }[];
      // One row has empty maintenance_team_id → filtered
      expect(entities).toHaveLength(6);
      // Fallback maintenance_center_id ← maintenance_id when empty
      const fallback = entities.find((e) => e.maintenance_team_id === 'TEAM-SA2');
      expect(fallback?.maintenance_center_id).toBe('FALLBACK-CTR');
    });
  });
});
