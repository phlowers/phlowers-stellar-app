/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { mapChainRow, createChainsConfig } from './chains.config';
import type { ChainCsvDto } from '@infrastructure/dto';
import { parseFixtureCsv } from '../__tests__/csv-fixture.helpers';

describe('chains.config - mapChainRow', () => {
  it('returns null for empty chain_name or null item', () => {
    expect(mapChainRow({ chain_name: '' } as ChainCsvDto)).toBeNull();
    expect(mapChainRow(null as unknown as ChainCsvDto)).toBeNull();
  });

  it('parses French decimal commas to JS numbers', () => {
    const [first] = parseFixtureCsv<ChainCsvDto>('chains');
    const e = mapChainRow(first);
    expect(e?.mean_length).toBeCloseTo(3.25);
    expect(e?.mean_mass).toBeCloseTo(12.5);
    expect(e?.chain_surface).toBeCloseTo(0.15);
  });

  it('coerces v_chain to strict boolean (only "true" is truthy)', () => {
    const rows = parseFixtureCsv<ChainCsvDto>('chains');
    expect(mapChainRow(rows[0])?.v_chain).toBe(false); // "false"
    expect(mapChainRow(rows[1])?.v_chain).toBe(true); // "true"
  });

  it('passes through uuid, chain_type unchanged', () => {
    const [first] = parseFixtureCsv<ChainCsvDto>('chains');
    const e = mapChainRow(first);
    expect(e?.uuid).toBe('chain-uuid-001');
    expect(e?.chain_type).toBe('Standard');
  });
});

describe('chains.config - createChainsConfig', () => {
  it('uses bulkPut and exposes uuid as key', async () => {
    const config = createChainsConfig();
    const bulkPut = vi.fn().mockResolvedValue(undefined);
    const rows = parseFixtureCsv<ChainCsvDto>('chains');
    const r = await config.processChunk(rows, { table: { bulkPut } as never, now: '2026-01-01' });
    expect(bulkPut).toHaveBeenCalled();
    expect(r.keys?.length).toBe(4);
    expect(r.keys?.[0]).toBe('chain-uuid-001');
  });

  it('returns no keys when all rows are filtered out', async () => {
    const config = createChainsConfig();
    const bulkPut = vi.fn();
    const r = await config.processChunk([{ chain_name: '' } as ChainCsvDto], {
      table: { bulkPut } as never,
      now: '2026-01-01'
    });
    expect(bulkPut).not.toHaveBeenCalled();
    expect(r.keys).toBeUndefined();
  });
});
