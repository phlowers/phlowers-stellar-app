import { CatalogAttachmentEntity } from '@infrastructure/database';
import { AttachmentCsvDto } from '@infrastructure/dto';
import { v4 as uuidv4 } from 'uuid';
import { toNumber } from 'lodash';

/**
 * Maps raw CSV attachment DTOs to catalog attachment entities.
 * Filters out entries with neither `support_idr` nor `support_adr`.
 *
 * @param data - Array of raw CSV rows
 * @returns Array of catalog attachment entities ready for persistence
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
