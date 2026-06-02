/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * A single attachment set carried by a support.
 *
 * @remarks
 * Lightweight value object stored inside the parent {@link CatalogSupportAttachmentEntity}.
 * Mirrors the geometric columns of the legacy attachments CSV without the support-level metadata.
 */
export interface AttachmentSetItem {
  /** Attachment set number (CSV `position`) */
  attachment_set: number;
  /** Altitude of the attachment point (meters, CSV `Z`) */
  attachment_altitude?: number;
  /** Length of the crossarm (meters, CSV `L`) */
  cross_arm_length?: number;
  /** X coordinate of the attachment set */
  attachment_set_x?: number;
  /** Y coordinate of the attachment set */
  attachment_set_y?: number;
  /** Z coordinate of the attachment set */
  attachment_set_z?: number;
}

/**
 * Grouped catalog attachment entity: one row per `support_name`.
 *
 * @remarks
 * Replaces the legacy flat `catAttachments` table (one row per attachment set).
 * The grouping drastically reduces the number of IndexedDB B-tree entries
 * (from ~230k to ~500 for a typical attachments.csv), which makes both
 * write and read operations orders of magnitude faster.
 *
 * @category Infrastructure
 */
export interface CatalogSupportAttachmentEntity {
  /** Primary key: full name of the support */
  support_name: string;
  /** Tower model/type identifier */
  support_tower: string;
  /** UUID v4 kept for traceability with the original CSV rows */
  uuid: string;
  /** ISO 8601 timestamp of creation */
  created_at: string;
  /** ISO 8601 timestamp of last update */
  updated_at: string;
  /** Attachment sets carried by this support, sorted by `attachment_set` */
  attachments: AttachmentSetItem[];
}
