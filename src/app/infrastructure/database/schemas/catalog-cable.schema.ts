/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Dexie schema for the catalog cables table
 */
export const CATALOG_CABLE_SCHEMA = {
  catCables: `&name, data_source, section, diameter, young_modulus, linear_mass, dilatation_coefficient, temperature_reference, stress_strain_a0, stress_strain_a1, stress_strain_a2, stress_strain_a3, stress_strain_a4, stress_strain_b0, stress_strain_b1, stress_strain_b2, stress_strain_b3, stress_strain_b4, is_polynomial, diameter_heart, section_conductor, section_heart, solar_absorption, emissivity, electric_resistance_20, linear_resistance_temperature_coef, is_bimetallic, rts_cable, rts_layer_1, nb_strand_layer_1, rts_layer_2, nb_strand_layer_2, rts_layer_3, nb_strand_layer_3, rts_layer_4, nb_strand_layer_4, rts_layer_5, nb_strand_layer_5, rts_layer_6, nb_strand_layer_6, rts_layer_7, nb_strand_layer_7, rts_layer_8, nb_strand_layer_8, safety_coefficient`
};
