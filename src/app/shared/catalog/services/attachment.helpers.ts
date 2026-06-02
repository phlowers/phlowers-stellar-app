import { AttachmentSetItem, CatalogAttachmentEntity, CatalogSupportAttachmentEntity } from '@infrastructure/database';
import { AttachmentCsvDto } from '@infrastructure/dto';
import { v4 as uuidv4 } from 'uuid';
import { toNumber } from 'lodash';

/**
 * Partial group emitted while streaming a CSV chunk.
 * Transient value passed between `groupChunkBySupport` and the storage upsert.
 */
export interface SupportAttachmentGroupChunk {
  support_name: string;
  support_tower: string;
  attachments: AttachmentSetItem[];
}

const toOptionalNumber = (value: string | number | undefined | null): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Groups a streamed CSV chunk into one entry per `support_name`.
 * Pure function. Discards rows missing both `support_idr` and `support_adr`,
 * as well as rows whose `position` is empty or not a finite number (which
 * would otherwise produce `0`/`NaN` and break sort/lookup by `attachment_set`).
 */
export const groupChunkBySupport = (rows: AttachmentCsvDto[]): SupportAttachmentGroupChunk[] => {
  const map = new Map<string, SupportAttachmentGroupChunk>();
  for (const row of rows) {
    const supportName = row.support_idr || row.support_adr;
    if (!supportName) continue;
    const attachmentSet = toOptionalNumber(row.position);
    if (attachmentSet === undefined) continue;
    const item: AttachmentSetItem = {
      attachment_set: attachmentSet,
      attachment_altitude: toOptionalNumber(row.Z),
      cross_arm_length: toOptionalNumber(row.L),
      attachment_set_x: toOptionalNumber(row.X),
      attachment_set_y: toOptionalNumber(row.Y),
      attachment_set_z: toOptionalNumber(row.Z)
    };
    const existing = map.get(supportName);
    if (existing) {
      existing.attachments.push(item);
    } else {
      map.set(supportName, {
        support_name: supportName,
        support_tower: row.support_tower ?? '',
        attachments: [item]
      });
    }
  }
  return [...map.values()];
};

/**
 * Merges a streamed chunk-group into an existing stored entity (or creates a new one).
 * Pure function: returns a new entity, never mutates inputs.
 * Preserves the `CatalogSupportAttachmentEntity.attachments` invariant of being
 * sorted ascending by `attachment_set`.
 */
export const mergeSupportAttachmentGroup = (
  existing: CatalogSupportAttachmentEntity | undefined,
  chunk: SupportAttachmentGroupChunk,
  now: string = new Date().toISOString()
): CatalogSupportAttachmentEntity => {
  const bySet = (a: AttachmentSetItem, b: AttachmentSetItem): number =>
    (a.attachment_set ?? 0) - (b.attachment_set ?? 0);
  if (!existing) {
    return {
      uuid: uuidv4(),
      created_at: now,
      updated_at: now,
      support_name: chunk.support_name,
      support_tower: chunk.support_tower,
      attachments: [...chunk.attachments].sort(bySet)
    };
  }
  return {
    ...existing,
    support_tower: chunk.support_tower || existing.support_tower,
    updated_at: now,
    attachments: [...existing.attachments, ...chunk.attachments].sort(bySet)
  };
};

/**
 * Reconstructs a flat `CatalogAttachmentEntity` from a grouped entity row
 * and one of its attachment sets, for backward-compatible reads from the legacy API.
 */
export const toLegacyEntity = (
  group: CatalogSupportAttachmentEntity,
  item: AttachmentSetItem
): CatalogAttachmentEntity => ({
  uuid: group.uuid,
  created_at: group.created_at,
  updated_at: group.updated_at,
  support_name: group.support_name,
  support_tower: group.support_tower,
  attachment_set: item.attachment_set,
  attachment_altitude: item.attachment_altitude,
  cross_arm_length: item.cross_arm_length,
  attachment_set_x: item.attachment_set_x,
  attachment_set_y: item.attachment_set_y,
  attachment_set_z: item.attachment_set_z
});

/**
 * @deprecated Replaced by `groupChunkBySupport` + `mergeSupportAttachmentGroup`.
 * Kept temporarily for backwards compatibility while consumers are migrated.
 * Maps raw CSV attachment DTOs to flat catalog attachment entities.
 */
export const mapAttachmentCsvToEntities = (data: AttachmentCsvDto[]): CatalogAttachmentEntity[] => {
  return data
    .filter((item) => item.support_idr || item.support_adr)
    .map((item) => ({
      uuid: uuidv4(),
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      support_name: item.support_idr || item.support_adr,
      attachment_set: toNumber(item.position),
      attachment_altitude: parseFloat(item.Z),
      cross_arm_length: parseFloat(item.L),
      attachment_set_x: parseFloat(item.X),
      attachment_set_y: parseFloat(item.Y),
      attachment_set_z: parseFloat(item.Z),
      support_tower: item.support_tower
    }));
};
