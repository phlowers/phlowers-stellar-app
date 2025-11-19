/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export interface Attachment {
  uuid: string;
  updated_at: string;
  created_at: string;
  support_internal_id?: string;
  support_order?: number;
  support_number?: number;
  support_catalog_internal_id?: string;
  support_short_name?: string;
  support_name?: string;
  tower_model?: string;
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

export interface RteAttachmentsCsvFile {
  support_id_catalog: string;
  support_idr: string;
  support_adr: string;
  support_tower: string;
  support_family: string;
  position: string;
  X: string;
  Y: string;
  Z: string;
  L: string;
}
