/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { mapCableRow, createCablesConfig } from './cables.config';
import type { CableCsvDto } from '@infrastructure/dto';
import { parseFixtureCsv } from '../__tests__/csv-fixture.helpers';

describe('cables.config - mapCableRow', () => {
  it('returns null when name is empty', () => {
    const row = { name: '' } as CableCsvDto;
    expect(mapCableRow(row)).toBeNull();
  });

  it('returns null when item is null/undefined', () => {
    expect(mapCableRow(null as unknown as CableCsvDto)).toBeNull();
    expect(mapCableRow(undefined as unknown as CableCsvDto)).toBeNull();
  });

  it('coerces numeric strings to numbers', () => {
    const [alpha] = parseFixtureCsv<CableCsvDto>('cables');
    const e = mapCableRow(alpha);
    expect(e).not.toBeNull();
    expect(e?.section).toBeCloseTo(228);
    expect(e?.diameter).toBeCloseTo(19.6);
    expect(e?.safety_coefficient).toBe(3);
  });

  it('parses is_polynomial as case-tolerant boolean (true / True)', () => {
    const rows = parseFixtureCsv<CableCsvDto>('cables');
    const alpha = mapCableRow(rows[0]); // is_polynomial = "true"
    const bravo = mapCableRow(rows[1]); // is_polynomial = "True"
    expect(alpha?.is_polynomial).toBe(true);
    expect(bravo?.is_polynomial).toBe(true);
  });

  it('parses has_magnetic_heart only as strict "true"', () => {
    const rows = parseFixtureCsv<CableCsvDto>('cables');
    const alpha = mapCableRow(rows[0]); // has_magnetic_heart = "true"
    const bravo = mapCableRow(rows[1]); // has_magnetic_heart = "false"
    expect(alpha?.has_magnetic_heart).toBe(true);
    expect(bravo?.has_magnetic_heart).toBe(false);
  });

  it('parses is_bimetallic via toOptionalBoolean (handles empty)', () => {
    const rows = parseFixtureCsv<CableCsvDto>('cables');
    const alpha = mapCableRow(rows[0]); // "false"
    const bravo = mapCableRow(rows[1]); // "True"
    const delta = mapCableRow(rows[3]); // "" → undefined
    expect(alpha?.is_bimetallic).toBe(false);
    expect(bravo?.is_bimetallic).toBe(true);
    expect(delta?.is_bimetallic).toBeUndefined();
  });
});

describe('cables.config - createCablesConfig', () => {
  it('returns a config with the expected static shape', () => {
    const config = createCablesConfig();
    expect(config.csvKey).toBe('cables');
    expect(config.tableName).toBe('catCables');
    expect(config.filename).toBe('cables.csv');
    expect(config.clearBeforeImport).toBeUndefined(); // defaults to true
    expect(typeof config.processChunk).toBe('function');
  });

  it('processChunk returns processedRows but no keys when chunk has no valid rows', async () => {
    const config = createCablesConfig();
    const bulkPut = vi.fn().mockResolvedValue(undefined);
    const ctx = { table: { bulkPut } as never, now: '2026-01-01' };
    const r = await config.processChunk([{ name: '' } as CableCsvDto], ctx);
    expect(r).toEqual({ processedRows: 1 });
    expect(bulkPut).not.toHaveBeenCalled();
  });

  it('processChunk bulkPuts mapped entities and returns their names as keys', async () => {
    const config = createCablesConfig();
    const bulkPut = vi.fn().mockResolvedValue(undefined);
    const rows = parseFixtureCsv<CableCsvDto>('cables');
    const r = await config.processChunk(rows, { table: { bulkPut } as never, now: '2026-01-01' });
    expect(bulkPut).toHaveBeenCalledTimes(1);
    expect(r.processedRows).toBe(rows.length);
    expect(r.keys).toEqual(['FAKE_ALPHA', 'FAKE_BRAVO', 'FAKE_DELTA']);
  });
});
