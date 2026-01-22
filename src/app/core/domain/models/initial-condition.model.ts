/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Initial condition domain model - represents initial calculation parameters
 */
export interface InitialCondition {
  uuid: string;
  name: string;
  base_parameters: number | null;
  base_temperature: number;
  cable_pretension: number;
  min_temperature: number;
  max_wind_pressure: number;
  max_frost_width: number;
}
