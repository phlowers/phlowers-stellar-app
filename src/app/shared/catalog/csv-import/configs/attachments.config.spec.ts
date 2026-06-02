/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { createAttachmentsConfig } from './attachments.config';
import type { AttachmentCsvDto } from '@infrastructure/dto';
import { parseFixtureCsv } from '../__tests__/csv-fixture.helpers';

vi.mock('uuid', () => {
  let i = 0;
  return { v4: vi.fn(() => `att-uuid-${++i}`) };
});

describe('attachments.config - createAttachmentsConfig', () => {
  it('exposes the expected static shape', () => {
    const config = createAttachmentsConfig();
    expect(config.csvKey).toBe('attachments');
    expect(config.tableName).toBe('catSupportAttachments');
    expect(config.filename).toBe('attachments.csv');
  });

  it('groups CSV rows by support_name and persists merged entities', async () => {
    const config = createAttachmentsConfig();
    const bulkGet = vi.fn().mockResolvedValue([undefined, undefined, undefined]);
    const bulkPut = vi.fn().mockResolvedValue(undefined);
    const rows = parseFixtureCsv<AttachmentCsvDto>('attachments');
    const ctx = { table: { bulkGet, bulkPut } as never, now: '2026-01-01T00:00:00.000Z' };
    const r = await config.processChunk(rows, ctx);
    expect(r.keys?.sort()).toEqual(['SUP-A', 'SUP-B', 'Support Charlie']);
    expect(bulkGet).toHaveBeenCalledWith(expect.arrayContaining(['SUP-A', 'SUP-B', 'Support Charlie']));
    const merged = bulkPut.mock.calls[0][0] as { support_name: string; attachments: unknown[] }[];
    const alpha = merged.find((m) => m.support_name === 'SUP-A');
    expect(alpha?.attachments).toHaveLength(3);
  });

  it('skips chunks where every row is missing both support_idr and support_adr', async () => {
    const config = createAttachmentsConfig();
    const bulkGet = vi.fn();
    const bulkPut = vi.fn();
    const r = await config.processChunk([{ support_idr: '', support_adr: '', position: '1' } as AttachmentCsvDto], {
      table: { bulkGet, bulkPut } as never,
      now: '2026-01-01'
    });
    expect(bulkGet).not.toHaveBeenCalled();
    expect(bulkPut).not.toHaveBeenCalled();
    expect(r).toEqual({ processedRows: 1 });
  });

  it('merges into existing entity returned by bulkGet (appends attachments)', async () => {
    const config = createAttachmentsConfig();
    const existing = {
      uuid: 'pre-existing',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      support_name: 'SUP-A',
      support_tower: 'TOW-1',
      attachments: [{ attachment_set: 99 }]
    };
    const bulkGet = vi.fn().mockResolvedValue([existing]);
    const bulkPut = vi.fn().mockResolvedValue(undefined);
    const rows = parseFixtureCsv<AttachmentCsvDto>('attachments').filter((r) => r.support_idr === 'SUP-A');
    await config.processChunk(rows, {
      table: { bulkGet, bulkPut } as never,
      now: '2026-06-01T00:00:00.000Z'
    });
    const merged = bulkPut.mock.calls[0][0][0] as { uuid: string; attachments: unknown[]; updated_at: string };
    expect(merged.uuid).toBe('pre-existing');
    expect(merged.attachments).toHaveLength(1 + 3); // 1 existing + 3 from fixture
    expect(merged.updated_at).toBe('2026-06-01T00:00:00.000Z');
  });
});
