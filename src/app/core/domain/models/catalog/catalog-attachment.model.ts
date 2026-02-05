/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Catalog attachment domain model - represents cable attachment points on supports.
 *
 * @remarks
 * An attachment defines the geometric position where a cable connects to a
 * support structure. It includes support information, chain specifications,
 * and 3D coordinates for the attachment point.
 *
 * @example
 * ```typescript
 * const attachment: CatalogAttachment = {
 *   uuid: '123e4567-e89b-12d3-a456-426614174000',
 *   support_tower: 'P42',
 *   attachment_altitude: 25.5,
 *   cross_arm_length: 3.2,
 *   // ... other properties
 * };
 * ```
 *
 * @category Catalog Models
 */
export interface CatalogAttachment {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** ISO 8601 timestamp of last update */
  updated_at: string;
  /** ISO 8601 timestamp of creation */
  created_at: string;
  /** Internal ID of the support */
  support_internal_id?: string;
  support_order?: number;
  support_number?: number;
  support_catalog_internal_id?: string;
  support_short_name?: string;
  support_name?: string;
  support_tower: string;
  line_angle?: number;
  support_ground_z?: number;
  support_ground_x?: number;
  support_ground_y?: number;
  attachment_type?: string;
  attachment_set?: number;
  attachment_set_z?: number;
  attachment_set_x?: number;
  attachment_set_y?: number;
  attachment_altitude?: number;
  cross_arm_relative_altitude?: number;
  cross_arm_length?: number;
  chain_drn_catalog_internal_id?: string;
  chain_drn_internal_id?: string;
  chain_drn_short_name?: string;
  chain_drn_name?: string;
  chain_drn_length?: number;
  chain_drn_weight?: number;
  chain_drn_surface?: string;
  chain_inl_catalog_internal_id?: string;
  chain_inl_internal_id?: string;
  chain_inl_short_name?: string;
  chain_inl_name?: string;
  chain_inl_length?: number;
  chain_inl_weight?: number;
  chain_inl_surface?: string;
  cable_attachment_z?: number;
  cable_attachment_x?: number;
  cable_attachment_y?: number;
}
