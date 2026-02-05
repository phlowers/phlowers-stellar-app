/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Proto V4 Support model - represents support data from legacy format.
 *
 * @remarks
 * This interface maps to the JSON structure used by the legacy
 * Proto V4 application for importing existing project data.
 * Property names are in French to match the original format.
 *
 * @example
 * ```typescript
 * const protoSupport: ProtoV4Support = {
 *   nom: 'P42',
 *   alt_acc: 25.5,
 *   portée: 350,
 *   // ... other properties
 * };
 * ```
 *
 * @category Legacy Models
 */
export interface ProtoV4Support {
  /** Altitude of attachment point (alt_acc = altitude accrochage) */
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
 * Proto V4 Parameters model - calculation parameters from legacy format.
 *
 * @remarks
 * This interface contains the global calculation parameters used
 * by the legacy Proto V4 application. These parameters define
 * the cable type, initial conditions, and project metadata.
 *
 * @example
 * ```typescript
 * const params: ProtoV4Parameters = {
 *   conductor: 'ASTER_570',
 *   cable_amount: 2,
 *   temperature_reference: 15,
 *   parameter: 1500,
 *   cra: 12,
 *   temp_load: -20,
 *   wind_load: 480,
 *   frost_load: 20,
 *   section_name: 'Section A-B',
 *   project_name: 'Import from Proto V4'
 * };
 * ```
 *
 * @category Legacy Models
 */
export interface ProtoV4Parameters {
  /** Name of the conductor/cable */
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
