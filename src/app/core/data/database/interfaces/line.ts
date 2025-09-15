/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export interface Line {
  uuid: string;
  link_idr: string;
  lit_idr: string;
  lit_adr: string;
  branch_idr: string;
  branch_adr: string;
  electric_tension_level_idr: string;
  electric_tension_level_adr: string;
}

export interface RteLinesCsvFile {
  LIAISON_IDR: string;
  LIT_ADR: string;
  LIT_IDR: string;
  BRANCHE_IDR: string;
  BRANCHE_ADR: string;
  TENSION_ELECTRIQUE_IDR: string;
  TENSION_ELECTRIQUE_ADR: string;
}
