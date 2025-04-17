/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export interface Span {
  uuid: string;
  unit_span_internal_id: string;
  order: number;
  unit_span_name: string;
  short_name: string;
  section_internal_id: string;
  section_short_name: string;
  section_name: string;
  maintenance_center_internal_id: string;
  maintenance_center_designation: string;
  maintenance_team_internal_id: string;
  maintenance_team_designation: string;
  span_length: number;
  first_support_internal_id: string;
  last_support_internal_id: string;
  first_attachment_set_internal_id: string;
  last_attachment_set_internal_id: string;
  first_chain_catalog_internal_id: string;
  last_chain_catalog_internal_id: string;
}
