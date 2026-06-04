/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { AttachmentCsvDto } from '@infrastructure/dto';
import { CatalogSupportAttachmentEntity } from '@infrastructure/database';
import {
  groupChunkBySupport,
  mapAttachmentCsvToEntities,
  mergeSupportAttachmentGroup,
  toLegacyEntity
} from './attachment.helpers';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid')
}));

const makeDto = (overrides: Partial<AttachmentCsvDto> = {}): AttachmentCsvDto => ({
  support_id_catalog: 'cat1',
  support_idr: 'idr1',
  support_adr: 'Support 1',
  support_tower: 'tower1',
  support_family: 'Family 1',
  position: '2',
  X: '1.1',
  Y: '2.2',
  Z: '10.5',
  L: '3.0',
  ...overrides
});

describe('groupChunkBySupport', () => {
  it('groups rows sharing the same support_idr into a single entry', () => {
    const rows = [makeDto({ support_idr: 'A', position: '1' }), makeDto({ support_idr: 'A', position: '2' })];
    const result = groupChunkBySupport(rows);
    expect(result).toHaveLength(1);
    expect(result[0].support_name).toBe('A');
    expect(result[0].attachments.map((a) => a.attachment_set)).toEqual([1, 2]);
  });

  it('assigns a uuid to each grouped attachment item', () => {
    const result = groupChunkBySupport([makeDto({ support_idr: 'A', position: '1' })]);
    expect(result[0].attachments[0].uuid).toBe('mock-uuid');
  });

  it('falls back to support_adr when support_idr is empty', () => {
    const result = groupChunkBySupport([makeDto({ support_idr: '', support_adr: 'Fallback' })]);
    expect(result[0].support_name).toBe('Fallback');
  });

  it('filters out rows with neither support_idr nor support_adr', () => {
    const result = groupChunkBySupport([
      makeDto({ support_idr: '', support_adr: '' }),
      makeDto({ support_idr: 'kept' })
    ]);
    expect(result.map((g) => g.support_name)).toEqual(['kept']);
  });

  it('returns undefined for invalid numeric fields', () => {
    const result = groupChunkBySupport([
      makeDto({ X: '', Y: '', Z: 'abc' as unknown as string, L: '' as unknown as string })
    ]);
    expect(result[0].attachments[0].attachment_set_x).toBeUndefined();
    expect(result[0].attachments[0].attachment_set_y).toBeUndefined();
    expect(result[0].attachments[0].attachment_altitude).toBeUndefined();
    expect(result[0].attachments[0].cross_arm_length).toBeUndefined();
  });

  it('defaults support_tower to empty string when missing', () => {
    const result = groupChunkBySupport([makeDto({ support_tower: undefined as unknown as string })]);
    expect(result[0].support_tower).toBe('');
  });

  it('returns empty array when given empty input', () => {
    expect(groupChunkBySupport([])).toEqual([]);
  });

  it('skips rows whose position is empty or not a finite number', () => {
    const result = groupChunkBySupport([
      makeDto({ support_idr: 'A', position: '' }),
      makeDto({ support_idr: 'A', position: 'NaN' }),
      makeDto({ support_idr: 'A', position: '3' })
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].attachments.map((a) => a.attachment_set)).toEqual([3]);
  });
});

describe('mergeSupportAttachmentGroup', () => {
  const chunk = {
    support_name: 'S1',
    support_tower: 'T1',
    attachments: [{ attachment_set: 1 }]
  };

  it('creates a new entity when none exists', () => {
    const result = mergeSupportAttachmentGroup(undefined, chunk, '2026-01-01T00:00:00Z');
    expect(result).toMatchObject({
      uuid: 'mock-uuid',
      support_name: 'S1',
      support_tower: 'T1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      attachments: [{ attachment_set: 1 }]
    });
  });

  it('appends attachments to an existing entity without mutating it', () => {
    const existing: CatalogSupportAttachmentEntity = {
      uuid: 'kept',
      created_at: 'c',
      updated_at: 'u',
      support_name: 'S1',
      support_tower: 'T0',
      attachments: [{ attachment_set: 0 }]
    };
    const result = mergeSupportAttachmentGroup(existing, chunk, 'NOW');
    expect(result.uuid).toBe('kept');
    expect(result.created_at).toBe('c');
    expect(result.updated_at).toBe('NOW');
    expect(result.support_tower).toBe('T1');
    expect(result.attachments).toEqual([{ attachment_set: 0 }, { attachment_set: 1 }]);
    expect(existing.attachments).toEqual([{ attachment_set: 0 }]);
  });

  it('keeps the existing support_tower when chunk tower is empty', () => {
    const existing: CatalogSupportAttachmentEntity = {
      uuid: 'k',
      created_at: 'c',
      updated_at: 'u',
      support_name: 'S1',
      support_tower: 'KEEP',
      attachments: []
    };
    const result = mergeSupportAttachmentGroup(existing, { ...chunk, support_tower: '' }, 'NOW');
    expect(result.support_tower).toBe('KEEP');
  });
});

describe('toLegacyEntity', () => {
  it('flattens a grouped entity + attachment into the legacy shape, using the per-item uuid', () => {
    const result = toLegacyEntity(
      {
        uuid: 'g',
        created_at: 'c',
        updated_at: 'u',
        support_name: 'S1',
        support_tower: 'T1',
        attachments: []
      },
      { uuid: 'item-uuid', attachment_set: 3, attachment_altitude: 9, cross_arm_length: 1, attachment_set_x: 2 }
    );
    expect(result).toEqual({
      uuid: 'item-uuid',
      created_at: 'c',
      updated_at: 'u',
      support_name: 'S1',
      support_tower: 'T1',
      attachment_set: 3,
      attachment_altitude: 9,
      cross_arm_length: 1,
      attachment_set_x: 2,
      attachment_set_y: undefined,
      attachment_set_z: undefined
    });
  });

  it('falls back to a generated uuid for legacy items that lack one', () => {
    const result = toLegacyEntity(
      {
        uuid: 'g',
        created_at: 'c',
        updated_at: 'u',
        support_name: 'S1',
        support_tower: 'T1',
        attachments: []
      },
      { attachment_set: 1 }
    );
    expect(result.uuid).toBe('mock-uuid');
  });

  it('produces distinct uuids for two attachment sets of the same support', () => {
    const group = {
      uuid: 'g',
      created_at: 'c',
      updated_at: 'u',
      support_name: 'S1',
      support_tower: 'T1',
      attachments: []
    };
    const a = toLegacyEntity(group, { uuid: 'a', attachment_set: 1 });
    const b = toLegacyEntity(group, { uuid: 'b', attachment_set: 2 });
    expect(a.uuid).not.toBe(b.uuid);
  });
});

describe('mapAttachmentCsvToEntities (legacy)', () => {
  it('maps a valid DTO to a flat CatalogAttachmentEntity', () => {
    const result = mapAttachmentCsvToEntities([makeDto()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      uuid: 'mock-uuid',
      support_name: 'idr1',
      support_tower: 'tower1',
      attachment_set: 2,
      attachment_altitude: 10.5,
      cross_arm_length: 3.0,
      attachment_set_x: 1.1,
      attachment_set_y: 2.2,
      attachment_set_z: 10.5
    });
  });

  it('filters out items with neither support_idr nor support_adr', () => {
    const data = [makeDto({ support_idr: '', support_adr: '' }), makeDto({ support_idr: 'valid', support_adr: '' })];
    expect(mapAttachmentCsvToEntities(data)).toHaveLength(1);
  });
});
