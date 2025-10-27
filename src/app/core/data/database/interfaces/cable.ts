/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export interface Cable {
  name: string;
  data_source: string;
  section: number;
  diameter: number;
  young_modulus: number;
  linear_weight: number;
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
  is_narcisse: boolean;
}

export interface RteCablesCsvFile {
  name: string;
  data_source: string;
  section: string;
  diameter: string;
  young_modulus: string;
  linear_weight: string;
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
  is_narcisse: string;
}
