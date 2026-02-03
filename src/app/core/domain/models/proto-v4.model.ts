/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Proto V4 Support model - used for legacy import compatibility
 */
export interface ProtoV4Support {
  alt_acc: number;
  angle_ligne: number;
  ch_en_V: boolean;
  ctr_poids: number;
  long_bras: number;
  long_ch: number;
  nom: string;
  num: string;
  pds_ch: number;
  portée: number;
  surf_ch: number;
  suspension: boolean;
}

/**
 * Proto V4 Parameters model - calculation parameters from legacy format
 */
export interface ProtoV4Parameters {
  conductor: string;
  cable_amount: number;
  temperature_reference: number;
  parameter: number;
  cra: number;
  temp_load: number;
  wind_load: number;
  frost_load: number;
  section_name: string;
  project_name: string;
}
