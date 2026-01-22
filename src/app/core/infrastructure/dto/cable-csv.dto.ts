/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * DTO for importing cables from RTE CSV files
 */
export interface CableCsvDto {
  cable_id: string;
  name: string;
  data_source: string;
  section: string;
  diameter: string;
  young_modulus: string;
  linear_mass: string;
  dilatation_coefficient: string;
  temperature_reference: string;
  stress_strain_a0: string | undefined;
  stress_strain_a1: string | undefined;
  stress_strain_a2: string | undefined;
  stress_strain_a3: string | undefined;
  stress_strain_a4: string | undefined;
  stress_strain_b0: string | undefined;
  stress_strain_b1: string | undefined;
  stress_strain_b2: string | undefined;
  stress_strain_b3: string | undefined;
  stress_strain_b4: string | undefined;
  is_polynomial: string;
  diameter_heart: string;
  section_conductor: string;
  section_heart: string;
  solar_absorption: string;
  emissivity: string;
  electric_resistance_20: string;
  linear_resistance_temperature_coef: string;
  radial_thermal_conductivity: string;
  has_magnetic_heart: string;
}
