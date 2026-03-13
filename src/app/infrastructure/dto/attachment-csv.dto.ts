/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * DTO for importing cable attachment point data from RTE CSV files.
 *
 * @remarks
 * Maps to rows in the `attachments.csv` file. Describes the physical
 * attachment points of conductors on support towers.
 *
 * @category Infrastructure DTO
 */
export interface AttachmentCsvDto {
  /** Catalog identifier of the support/tower */
  support_id_catalog: string;
  /** Support short reference */
  support_idr: string;
  /** Support full address/label */
  support_adr: string;
  /** Tower type or designation */
  support_tower: string;
  /** Family/category of the support structure */
  support_family: string;
  /** Position of the attachment on the support */
  position: string;
  /** X coordinate of the attachment point (meters) */
  X: string;
  /** Y coordinate of the attachment point (meters) */
  Y: string;
  /** Z coordinate / altitude of the attachment point (meters) */
  Z: string;
  /** Span length to the next attachment point (meters) */
  L: string;
}
