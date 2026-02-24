/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * DTO for importing insulator chain data from RTE CSV files.
 *
 * @remarks
 * Maps to rows in the `chains.csv` file. All numeric values are
 * represented as strings as parsed from CSV.
 *
 * @category Infrastructure DTO
 */
export interface ChainCsvDto {
  /** Name/model of the insulator chain */
  chain_name: string;
  /** Average length of the chain (string-encoded number) */
  mean_length: string;
  /** Average mass of the chain (string-encoded number) */
  mean_mass: string;
  /** Whether this is a V-shaped chain configuration */
  v_chain: string;
  /** Type classification of the chain */
  chain_type: string;
  /** Surface area of the chain (string-encoded number) */
  chain_surface: string;
  /** Unique identifier */
  uuid: string;
}
