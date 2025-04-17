/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// export const attachmentTable = {
//   attachments:
//     '&uuid, updated_at, created_at, support_internal_id, support_order, support_number, support_catalog_internal_id, support_short_name, support_name, tower_model, line_angle, support_ground_z, support_ground_x, support_ground_y, attachment_type, attachment_set, attachment_set_z, attachment_set_x, attachment_set_y, cross_arm_relative_altitude, cross_arm_length, chain_drn_catalog_internal_id, chain_drn_internal_id, chain_drn_short_name, chain_drn_name, chain_drn_length, chain_drn_weight, chain_drn_surface, chain_inl_catalog_internal_id, chain_inl_internal_id, chain_inl_short_name, chain_inl_name, chain_inl_length, chain_inl_weight, chain_inl_surface, cable_attachment_z, cable_attachment_x, cable_attachment_y'
// };

export interface Attachment {
  uuid: string;
  updated_at: string;
  created_at: string;
  support_internal_id: string;
  support_order: number;
  support_number: number;
  support_catalog_internal_id: string;
  support_short_name: string;
  support_name: string;
  tower_model: string;
  line_angle: number;
  support_ground_z: number;
  support_ground_x: number;
  support_ground_y: number;
  attachment_type: string;
  attachment_set: string;
  attachment_set_z: number;
  attachment_set_x: number;
  attachment_set_y: number;
  cross_arm_relative_altitude: number;
  cross_arm_length: number;
  chain_drn_catalog_internal_id: string;
  chain_drn_internal_id: string;
  chain_drn_short_name: string;
  chain_drn_name: string;
  chain_drn_length: number;
  chain_drn_weight: number;
  chain_drn_surface: string;
  chain_inl_catalog_internal_id: string;
  chain_inl_internal_id: string;
  chain_inl_short_name: string;
  chain_inl_name: string;
  chain_inl_length: number;
  chain_inl_weight: number;
  chain_inl_surface: string;
  cable_attachment_z: number;
  cable_attachment_x: number;
  cable_attachment_y: number;
}
