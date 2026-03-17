/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Initial condition domain model - represents initial calculation parameters.
 *
 * @remarks
 * Initial conditions define the reference state for sag-tension calculations,
 * including temperature, pretension, and environmental limits.
 *
 * @example
 * ```typescript
 * const initialCondition: InitialCondition = {
 *   uuid: '123e4567-e89b-12d3-a456-426614174000',
 *   name: 'Standard Conditions',
 *   base_parameters: 1500,
 *   base_temperature: 15,
 *   cable_pretension: 12,
 *   min_temperature: -20,
 *   max_wind_pressure: 480,
 *   max_frost_width: 20
 * };
 * ```
 *
 * @category Domain Models
 */
export interface InitialCondition {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** Display name of the initial condition */
  name: string;
  /** Base parameter value (sag parameter in meters) */
  base_parameters: number | null;
  /** Reference temperature in °C */
  base_temperature: number;
  /** Cable pretension value in % of RTS */
  cable_pretension: number;
  /** Minimum temperature for calculations in °C */
  min_temperature: number;
  /** Maximum wind pressure in Pa */
  max_wind_pressure: number;
  /** Maximum frost/ice width in mm */
  max_frost_width: number;
}
