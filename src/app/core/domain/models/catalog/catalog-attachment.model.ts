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
  /** Order of the support in the section */
  support_order?: number;
  /** Support number on the line */
  support_number?: number;
  /** Internal ID referencing the support catalog entry */
  support_catalog_internal_id?: string;
  /** Short display name of the support */
  support_short_name?: string;
  /** Full name of the support */
  support_name?: string;
  /** Tower model/type identifier */
  support_tower: string;
  /** Angle of the line at this support (gradients) */
  line_angle?: number;
  /** Ground altitude at the support (meters) */
  support_ground_z?: number;
  /** Ground X coordinate of the support */
  support_ground_x?: number;
  /** Ground Y coordinate of the support */
  support_ground_y?: number;
  /** Type of attachment (suspension, tension, etc.) */
  attachment_type?: string;
  /** Attachment set number */
  attachment_set?: number;
  /** Z coordinate of the attachment set */
  attachment_set_z?: number;
  /** X coordinate of the attachment set */
  attachment_set_x?: number;
  /** Y coordinate of the attachment set */
  attachment_set_y?: number;
  /** Altitude of the attachment point (meters) */
  attachment_altitude?: number;
  /** Relative altitude of the crossarm */
  cross_arm_relative_altitude?: number;
  /** Length of the crossarm (meters) */
  cross_arm_length?: number;
  /** Catalog internal ID for DRN chain */
  chain_drn_catalog_internal_id?: string;
  /** Internal ID of the DRN chain */
  chain_drn_internal_id?: string;
  /** Short name of the DRN chain */
  chain_drn_short_name?: string;
  /** Full name of the DRN chain */
  chain_drn_name?: string;
  /** Length of the DRN chain (meters) */
  chain_drn_length?: number;
  /** Weight of the DRN chain (kg) */
  chain_drn_weight?: number;
  /** Surface area of the DRN chain */
  chain_drn_surface?: string;
  /** Catalog internal ID for INL chain */
  chain_inl_catalog_internal_id?: string;
  /** Internal ID of the INL chain */
  chain_inl_internal_id?: string;
  /** Short name of the INL chain */
  chain_inl_short_name?: string;
  /** Full name of the INL chain */
  chain_inl_name?: string;
  /** Length of the INL chain (meters) */
  chain_inl_length?: number;
  /** Weight of the INL chain (kg) */
  chain_inl_weight?: number;
  /** Surface area of the INL chain */
  chain_inl_surface?: string;
  /** Z coordinate of the cable attachment point */
  cable_attachment_z?: number;
  /** X coordinate of the cable attachment point */
  cable_attachment_x?: number;
  /** Y coordinate of the cable attachment point */
  cable_attachment_y?: number;
}
