/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export interface Line {
  uuid: string;
  link_idr: string;
  link_adr: string;
  lit_idr: string;
  lit_adr: string;
  branch_idr: string;
  branch_adr: string;
  voltage_idr: string;
  voltage_adr: string;
}

export interface RteLinesCsvFile {
  section_id: string;
  section_type: string;
  cable_id: string;
  cable_idr: string;
  cable_adr: string;
  electric_phase_number: number;
  cable_bundle_amount: number;
  opical_fiber_amount: number;
  link_id: string;
  link_idr: string;
  link_adr: string;
  lit_id: string;
  lit_idr: string;
  lit_adr: string;
  branch_id: string;
  branch_idr: string;
  branch_adr: string;
  voltage_id: string;
  voltage_idr: string;
  voltage_adr: string;
}
