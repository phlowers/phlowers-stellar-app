/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export interface Section {
  uuid: string;
  internal_id: string;
  name: string;
  short_name: string;
  created_at: string;
  updated_at: string;
  internal_catalog_id: string;
  type: string;
  cable_name: string;
  cable_short_name: string;
  cables_amount: number;
  optical_fibers_amount: number;
  spans_amount: number;
  begin_span_name: string;
  last_span_name: string;
  first_support_number: number;
  last_support_number: number;
  first_attachment_set: string;
  last_attachment_set: string;
  regional_maintenance_center_names: string[];
  maintenance_center_names: string[];
}
