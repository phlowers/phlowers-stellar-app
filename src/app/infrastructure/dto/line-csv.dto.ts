/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * DTO for importing power line section data from RTE CSV files.
 *
 * @remarks
 * Maps to rows in the `lines.csv` file. Contains hierarchical identification
 * of line sections (section → cable → link → lit → branch → voltage level),
 * each with an id, idr (short reference), and adr (full address/label).
 *
 * @category Infrastructure DTO
 */
export interface LineCsvDto {
  /** Unique identifier of the line section */
  section_id: string;
  /** Type of the section */
  section_type: string;
  /** Cable identifier within the section */
  cable_id: string;
  /** Cable short reference */
  cable_idr: string;
  /** Cable full address/label */
  cable_adr: string;
  /** Number of electric phases */
  electric_phase_number: number;
  /** Number of conductors in the bundle */
  cable_bundle_amount: number;
  /** Number of optical fibers (note: typo from source CSV) */
  opical_fiber_amount: number;
  /** Link identifier */
  link_id: string;
  /** Link short reference */
  link_idr: string;
  /** Link full address/label */
  link_adr: string;
  /** Lit (overhead line) identifier */
  lit_id: string;
  /** Lit short reference */
  lit_idr: string;
  /** Lit full address/label */
  lit_adr: string;
  /** Branch identifier */
  branch_id: string;
  /** Branch short reference */
  branch_idr: string;
  /** Branch full address/label */
  branch_adr: string;
  /** Voltage level identifier */
  voltage_id: string;
  /** Voltage level short reference */
  voltage_idr: string;
  /** Voltage level full address/label */
  voltage_adr: string;
}
