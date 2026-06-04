/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Papa from 'papaparse';
import { mapObstacleTypeRow, createObstaclesConfig } from './obstacles.config';
import type { ObstacleTypeCsvDto } from '@infrastructure/dto';
import { readFixtureCsv } from '../__tests__/csv-fixture.helpers';

describe('obstacles.config - mapObstacleTypeRow', () => {
  it('returns null when obstacle_type is empty', () => {
    expect(mapObstacleTypeRow({ obstacle_type: '' } as ObstacleTypeCsvDto)).toBeNull();
  });

  it('returns null for null/undefined item', () => {
    expect(mapObstacleTypeRow(null as unknown as ObstacleTypeCsvDto)).toBeNull();
  });

  it('passes through obstacle_type, obstacle_type_name and details', () => {
    const e = mapObstacleTypeRow({
      obstacle_type: 'fake_a',
      obstacle_type_name: 'Fake A',
      details: 'details A'
    } as ObstacleTypeCsvDto);
    expect(e).toEqual({ obstacle_type: 'fake_a', obstacle_type_name: 'Fake A', details: 'details A' });
  });
});

describe('obstacles.config - createObstaclesConfig', () => {
  it('declares the semicolon delimiter', () => {
    const config = createObstaclesConfig();
    expect(config.delimiter).toBe(';');
    expect(config.tableName).toBe('catObstacleTypes');
    expect(config.csvKey).toBe('obstacles');
  });

  it('uses bulkPut and returns obstacle_type as key', async () => {
    const config = createObstaclesConfig();
    const csv = readFixtureCsv('obstacles');
    const rows = Papa.parse<ObstacleTypeCsvDto>(csv, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true
    }).data;
    const bulkPut = vi.fn().mockResolvedValue(undefined);
    const r = await config.processChunk(rows, { table: { bulkPut } as never, now: '2026-01-01' });
    expect(bulkPut).toHaveBeenCalledTimes(1);
    expect(r.keys).toEqual(['fake_type_1', 'fake_type_2', 'fake_type_3']);
  });

  it('skips empty chunks', async () => {
    const config = createObstaclesConfig();
    const bulkPut = vi.fn();
    const r = await config.processChunk([{ obstacle_type: '' } as ObstacleTypeCsvDto], {
      table: { bulkPut } as never,
      now: '2026-01-01'
    });
    expect(bulkPut).not.toHaveBeenCalled();
    expect(r.keys).toBeUndefined();
  });
});
