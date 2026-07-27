/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { mapLineRow, createLinesConfig } from './lines.config';
import type { LineCsvDto } from '@infrastructure/dto';
import { parseFixtureCsv } from '../__tests__/csv-fixture.helpers';

vi.mock('uuid', () => {
  let i = 0;
  return { v4: vi.fn(() => `line-uuid-${++i}`) };
});

describe('lines.config - mapLineRow', () => {
  it('returns null when link_idr is empty', () => {
    const row = { link_idr: '' } as LineCsvDto;
    expect(mapLineRow(row)).toBeNull();
  });

  it('returns null for null/undefined item', () => {
    expect(mapLineRow(null as unknown as LineCsvDto)).toBeNull();
  });

  it('substitutes voltage_adr "0.0" with NO_VOLTAGE sentinel', () => {
    const row: LineCsvDto = {
      link_idr: 'L',
      voltage_idr: 'V',
      voltage_adr: '0.0',
      link_adr: '',
      lit_idr: '',
      lit_adr: '',
      branch_id: '',
      branch_idr: '',
      branch_adr: ''
    } as unknown as LineCsvDto;
    const e = mapLineRow(row);
    expect(e?.voltage_adr).toBe('NO_VOLTAGE');
  });

  it('substitutes when voltage_idr is empty', () => {
    const row: LineCsvDto = {
      link_idr: 'L',
      voltage_idr: '',
      voltage_adr: '225.0',
      link_adr: '',
      lit_idr: '',
      lit_adr: '',
      branch_id: '',
      branch_idr: '',
      branch_adr: ''
    } as unknown as LineCsvDto;
    const e = mapLineRow(row);
    expect(e?.voltage_adr).toBe('NO_VOLTAGE');
  });

  it('substitutes voltage_idr with plain-string "NO VOLTAGE" when hasNoVoltage', () => {
    const row: LineCsvDto = {
      link_idr: 'L',
      voltage_idr: '',
      voltage_adr: '225.0',
      link_adr: '',
      lit_idr: '',
      lit_adr: '',
      branch_id: '',
      branch_idr: '',
      branch_adr: ''
    } as unknown as LineCsvDto;
    const e = mapLineRow(row);
    expect(e?.voltage_idr).toBe('NO VOLTAGE');
    expect(e?.voltage_adr).toBe('NO_VOLTAGE');
  });

  it('keeps voltage values intact when both are present and non-zero', () => {
    const row: LineCsvDto = {
      link_idr: 'L',
      voltage_idr: 'V-225',
      voltage_adr: '225.0',
      link_adr: '',
      lit_idr: '',
      lit_adr: '',
      branch_id: '',
      branch_idr: '',
      branch_adr: ''
    } as unknown as LineCsvDto;
    const e = mapLineRow(row);
    expect(e?.voltage_adr).toBe('225.0');
    expect(e?.voltage_idr).toBe('V-225');
  });

  it('assigns a fresh uuid per row', () => {
    const rows = parseFixtureCsv<LineCsvDto>('lines').filter((r) => r.link_idr);
    const entities = rows.map(mapLineRow);
    const uuids = entities.map((e) => e?.uuid);
    expect(new Set(uuids).size).toBe(uuids.length);
  });
});

    const ctx = { table: { bulkAdd } as never, now: '2026-01-01' };
    const rows = parseFixtureCsv<LineCsvDto>('lines');
    const half = Math.ceil(rows.length / 2);
    await config.processChunk(rows.slice(0, half), ctx);
    await config.processChunk(rows.slice(half), ctx);
    expect(bulkAdd).not.toHaveBeenCalled(); // not yet — finalize will write
    await config.finalize?.(ctx);
    expect(bulkAdd).toHaveBeenCalledTimes(1);
    const persisted = bulkAdd.mock.calls[0][0] as unknown[];
    // 5 unique entities after dedup
    expect(persisted.length).toBe(5);
  });

  it('does not call bulkAdd when no row is valid', async () => {
    const config = createLinesConfig();
    const bulkAdd = vi.fn();
    const ctx = { table: { bulkAdd } as never, now: '2026-01-01' };
    await config.processChunk([{ link_idr: '' } as LineCsvDto], ctx);
    await config.finalize?.(ctx);
    expect(bulkAdd).not.toHaveBeenCalled();
  });

  it('isolates state across config instances (factory pattern)', async () => {
    const a = createLinesConfig();
    const b = createLinesConfig();
    const bulkAdd = vi.fn().mockResolvedValue(undefined);
    const ctx = { table: { bulkAdd } as never, now: '2026-01-01' };
    const rows = parseFixtureCsv<LineCsvDto>('lines');
    await a.processChunk(rows, ctx);
    await a.finalize?.(ctx);
    // Second factory must start fresh
    await b.finalize?.(ctx);
    // Only the first finalize wrote rows; second was a no-op
    expect(bulkAdd).toHaveBeenCalledTimes(1);
  });
});
