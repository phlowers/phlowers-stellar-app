/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * DTO for importing cable/conductor specifications from RTE CSV files.
 *
 * @remarks
 * Maps to rows in the `cables.csv` file. Contains mechanical, electrical,
 * and thermal properties of overhead line conductors. All numeric values
 * are string-encoded as parsed from CSV. Stress-strain polynomial
 * coefficients (a0–a4, b0–b4) are optional.
 *
 * @category Infrastructure DTO
 */
export interface CableCsvDto {
  /** Unique cable identifier */
  cable_id: string;
  /** Cable model name (e.g. "ASTER_570") */
  name: string;
  /** Origin of the data */
  data_source: string;
  /** Cross-sectional area */
  section: string;
  /** Outer diameter */
  diameter: string;
  /** Young's modulus (elasticity) */
  young_modulus: string;
  /** Mass per unit length */
  linear_mass: string;
  /** Thermal expansion coefficient */
  dilatation_coefficient: string;
  /** Reference temperature for properties */
  temperature_reference: string;
  /** Stress-strain polynomial coefficient a0 */
  stress_strain_a0: string | undefined;
  /** Stress-strain polynomial coefficient a1 */
  stress_strain_a1: string | undefined;
  /** Stress-strain polynomial coefficient a2 */
  stress_strain_a2: string | undefined;
  /** Stress-strain polynomial coefficient a3 */
  stress_strain_a3: string | undefined;
  /** Stress-strain polynomial coefficient a4 */
  stress_strain_a4: string | undefined;
  /** Stress-strain polynomial coefficient b0 */
  stress_strain_b0: string | undefined;
  /** Stress-strain polynomial coefficient b1 */
  stress_strain_b1: string | undefined;
  /** Stress-strain polynomial coefficient b2 */
  stress_strain_b2: string | undefined;
  /** Stress-strain polynomial coefficient b3 */
  stress_strain_b3: string | undefined;
  /** Stress-strain polynomial coefficient b4 */
  stress_strain_b4: string | undefined;
  /** Whether stress-strain uses polynomial model */
  is_polynomial: string;
  /** Diameter of the steel core */
  diameter_heart: string;
  /** Cross-section of the conductor layer */
  section_conductor: string;
  /** Cross-section of the steel core */
  section_heart: string;
  /** Solar absorption coefficient */
  solar_absorption: string;
  /** Thermal emissivity coefficient */
  emissivity: string;
  /** Electrical resistance at 20°C */
  electric_resistance_20: string;
  /** Temperature coefficient of resistance */
  linear_resistance_temperature_coef: string;
  /** Radial thermal conductivity */
  radial_thermal_conductivity: string;
  /** Whether the core is magnetic steel */
  has_magnetic_heart: string;
}
