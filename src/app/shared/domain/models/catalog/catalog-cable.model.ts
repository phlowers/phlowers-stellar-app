/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Catalog cable domain model - represents conductor specifications.
 *
 * @remarks
 * Contains all physical and mechanical properties of a cable/conductor
 * needed for sag-tension and thermal calculations.
 *
 * @example
 * ```typescript
 * const cable: CatalogCable = {
 *   name: 'ASTER 570',
 *   data_source: 'RTE',
 *   section: 570.22,
 *   diameter: 31.05,
 *   linear_mass: 1.907,
 *   // ... other properties
 * };
 * ```
 *
 * @category Catalog Models
 */
export interface CatalogCable {
  /** Optional unique identifier */
  id?: string;
  /** Cable name/designation */
  name: string;
  /** Source of the cable data */
  data_source: string;
  /** Cross-sectional area in mm² */
  section: number;
  /** Outer diameter in mm */
  diameter: number;
  /** Young's modulus in MPa */
  young_modulus: number;
  /** Linear mass in kg/m */
  linear_mass: number;
  /** Thermal expansion coefficient in 1/°C */
  dilatation_coefficient: number;
  /** Reference temperature for properties in °C */
  temperature_reference: number;
  /** Stress-strain polynomial coefficient a0 */
  stress_strain_a0: number | undefined;
  /** Stress-strain polynomial coefficient a1 */
  stress_strain_a1: number | undefined;
  /** Stress-strain polynomial coefficient a2 */
  stress_strain_a2: number | undefined;
  /** Stress-strain polynomial coefficient a3 */
  stress_strain_a3: number | undefined;
  /** Stress-strain polynomial coefficient a4 */
  stress_strain_a4: number | undefined;
  /** Stress-strain polynomial coefficient b0 */
  stress_strain_b0: number | undefined;
  /** Stress-strain polynomial coefficient b1 */
  stress_strain_b1: number | undefined;
  /** Stress-strain polynomial coefficient b2 */
  stress_strain_b2: number | undefined;
  /** Stress-strain polynomial coefficient b3 */
  stress_strain_b3: number | undefined;
  /** Stress-strain polynomial coefficient b4 */
  stress_strain_b4: number | undefined;
  /** Whether stress-strain is polynomial model */
  is_polynomial: boolean;
  /** Diameter of the core/heart in mm */
  diameter_heart: number | undefined;
  /** Conductor section (outer strands) in mm² */
  section_conductor: number | undefined;
  /** Core/heart section in mm² */
  section_heart: number | undefined;
  /** Solar absorption coefficient (0-1) */
  solar_absorption: number | undefined;
  /** Thermal emissivity coefficient (0-1) */
  emissivity: number | undefined;
  /** Electrical resistance at 20°C in Ω/km */
  electric_resistance_20: number | undefined;
  /** Linear temperature coefficient for resistance */
  linear_resistance_temperature_coef: number | undefined;
  /** Radial thermal conductivity in W/(m·K) */
  radial_thermal_conductivity: number | undefined;
  /** Whether the cable has a magnetic (steel) core */
  has_magnetic_heart: boolean | undefined;
  /** Whether the cable is bimetallic */
  is_bimetallic: boolean | undefined;
  /** Rated tensile strength of the whole cable in N */
  rts_cable: number | undefined;
  /** Rated tensile strength of layer 1 in N */
  rts_layer_1: number | undefined;
  /** Number of strands in layer 1 */
  nb_strand_layer_1: number | undefined;
  /** Rated tensile strength of layer 2 in N */
  rts_layer_2: number | undefined;
  /** Number of strands in layer 2 */
  nb_strand_layer_2: number | undefined;
  /** Rated tensile strength of layer 3 in N */
  rts_layer_3: number | undefined;
  /** Number of strands in layer 3 */
  nb_strand_layer_3: number | undefined;
  /** Rated tensile strength of layer 4 in N */
  rts_layer_4: number | undefined;
  /** Number of strands in layer 4 */
  nb_strand_layer_4: number | undefined;
  /** Rated tensile strength of layer 5 in N */
  rts_layer_5: number | undefined;
  /** Number of strands in layer 5 */
  nb_strand_layer_5: number | undefined;
  /** Rated tensile strength of layer 6 in N */
  rts_layer_6: number | undefined;
  /** Number of strands in layer 6 */
  nb_strand_layer_6: number | undefined;
  /** Rated tensile strength of layer 7 in N */
  rts_layer_7: number | undefined;
  /** Number of strands in layer 7 */
  nb_strand_layer_7: number | undefined;
  /** Rated tensile strength of layer 8 in N */
  rts_layer_8: number | undefined;
  /** Number of strands in layer 8 */
  nb_strand_layer_8: number | undefined;
  /** Safety coefficient applied to the cable RTS */
  safety_coefficient: number | undefined;
}
