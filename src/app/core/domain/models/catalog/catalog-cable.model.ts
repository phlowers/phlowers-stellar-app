/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
<<<<<<<< HEAD:src/app/core/domain/models/catalog/catalog-cable.model.ts
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
========
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
>>>>>>>> d3a674f332aba58a817259a454bff7339d2f1c29:src/app/core/infrastructure/dto/cable-csv.dto.ts
}
