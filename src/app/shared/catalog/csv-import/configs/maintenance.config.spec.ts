/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { mapMaintenanceRow, createMaintenanceConfig } from './maintenance.config';
import type { MaintenanceCsvDto } from '@infrastructure/dto';
import { parseFixtureCsv } from '../__tests__/csv-fixture.helpers';

describe('maintenance.config - mapMaintenanceRow', () => {
  it('returns null when maintenance_team_id is empty', () => {
    const row = { maintenance_team_id: '' } as MaintenanceCsvDto;
    expect(mapMaintenanceRow(row)).toBeNull();
  });

  it('falls back to maintenance_id when maintenance_center_id is empty', () => {
    const rows = parseFixtureCsv<MaintenanceCsvDto>('maintenance');
    const fallbackRow = rows.find((r) => r.maintenance_team_id === 'TEAM-SA2');
    expect(fallbackRow?.maintenance_center_id).toBe('');
    const e = mapMaintenanceRow(fallbackRow as MaintenanceCsvDto);
    expect(e?.maintenance_center_id).toBe('FALLBACK-CTR');
  });

  it('prefers maintenance_center_id when present', () => {
    const rows = parseFixtureCsv<MaintenanceCsvDto>('maintenance');
    const e = mapMaintenanceRow(rows[0]);
    expect(e?.maintenance_center_id).toBe('CTR-N');
  });

  it('falls back to empty string when both ids are missing', () => {
    const row: MaintenanceCsvDto = {
      maintenance_team_id: 'T',
      maintenance_center_id: '',
      maintenance_id: '',
      maintenance_center: '',
      regional_team: '',
      maintenance_team: '',
      regional_team_id: ''
    } as unknown as MaintenanceCsvDto;
    expect(mapMaintenanceRow(row)?.maintenance_center_id).toBe('');
  });
});

describe('maintenance.config - createMaintenanceConfig', () => {
  it('uses bulkAdd and returns team ids as keys', async () => {
    const config = createMaintenanceConfig();
    const bulkAdd = vi.fn().mockResolvedValue(undefined);
    const rows = parseFixtureCsv<MaintenanceCsvDto>('maintenance');
    const r = await config.processChunk(rows, { table: { bulkAdd } as never, now: '2026-01-01' });
    expect(bulkAdd).toHaveBeenCalledTimes(1);
    expect(r.processedRows).toBe(rows.length);
    expect(r.keys).toEqual(['TEAM-NA1', 'TEAM-NA2', 'TEAM-NB1', 'TEAM-SA1', 'TEAM-SA2', 'TEAM-SB1']);
  });

  it('skips empty chunks', async () => {
    const config = createMaintenanceConfig();
    const bulkAdd = vi.fn();
    const r = await config.processChunk([{ maintenance_team_id: '' } as MaintenanceCsvDto], {
      table: { bulkAdd } as never,
      now: '2026-01-01'
    });
    expect(bulkAdd).not.toHaveBeenCalled();
    expect(r.keys).toBeUndefined();
  });
});
