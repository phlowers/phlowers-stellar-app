/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Catalog cable domain model
 */
export interface CatalogCable {
  id?: string;
  name: string;
  data_source: string;
  section: number;
  diameter: number;
  young_modulus: number;
  linear_mass: number;
  dilatation_coefficient: number;
  temperature_reference: number;
  stress_strain_a0: number | undefined;
  stress_strain_a1: number | undefined;
  stress_strain_a2: number | undefined;
  stress_strain_a3: number | undefined;
  stress_strain_a4: number | undefined;
  stress_strain_b0: number | undefined;
  stress_strain_b1: number | undefined;
  stress_strain_b2: number | undefined;
  stress_strain_b3: number | undefined;
  stress_strain_b4: number | undefined;
  is_polynomial: boolean;
  diameter_heart: number | undefined;
  section_conductor: number | undefined;
  section_heart: number | undefined;
  solar_absorption: number | undefined;
  emissivity: number | undefined;
  electric_resistance_20: number | undefined;
  linear_resistance_temperature_coef: number | undefined;
  radial_thermal_conductivity: number | undefined;
  has_magnetic_heart: boolean | undefined;
}
