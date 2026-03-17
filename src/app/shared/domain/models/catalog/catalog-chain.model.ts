/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Catalog chain domain model - represents insulator chain specifications.
 *
 * @remarks
 * Contains physical properties of insulator chains used to
 * attach conductors to support structures.
 *
 * @example
 * ```typescript
 * const chain: CatalogChain = {
 *   uuid: '123e4567-e89b-12d3-a456-426614174000',
 *   chain_name: 'Standard 400kV',
 *   mean_length: 4.5,
 *   mean_mass: 250,
 *   v_chain: false,
 *   chain_type: 'suspension',
 *   chain_surface: 0.8
 * };
 * ```
 *
 * @category Catalog Models
 */
export interface CatalogChain {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** Name of the insulator chain */
  chain_name: string;
  /** Mean length of the chain in meters */
  mean_length: number;
  /** Mean mass of the chain in kg */
  mean_mass: number;
  /** Whether it's a V-shaped chain */
  v_chain: boolean;
  /** Type of chain (suspension, tension, etc.) */
  chain_type: string;
  /** Surface area of the chain in m² */
  chain_surface: number;
}
