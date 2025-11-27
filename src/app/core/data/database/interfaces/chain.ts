/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export interface Chain {
  chain_name: string;
  mean_length: number;
  mean_mass: number;
  v_chain: boolean;
  chain_type: string;
  chain_surface: number;
  uuid: string;
}

export interface RteChainsCsvFile {
  chain_name: string;
  mean_length: string;
  mean_mass: string;
  v_chain: string;
  chain_type: string;
  chain_surface: string;
  uuid: string;
}
