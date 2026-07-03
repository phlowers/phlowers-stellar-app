/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ClimateCharge, SymmetryType } from '@shared/domain/models/charge.model';

/** Default base temperature in degrees Celsius used for climatic charge calculations. */
export const DEFAULT_BASE_TEMPERATURE = 15;

/** Default climatic charge values used when creating a new charge case. */
export const defaultClimaticCharge: ClimateCharge = {
  windPressure: 0,
  cableTemperature: DEFAULT_BASE_TEMPERATURE,
  symmetryType: SymmetryType.SYMMETRIC,
  iceThickness: 0,
  frontierSupportNumber: null,
  iceThicknessBefore: 0,
  iceThicknessAfter: 0
};

/**
 * Returns the base climate values that match the base state calculation.
 * The base state uses the initial condition's base_temperature (or 15 if none),
 * with no wind pressure and no ice.
 */
export const getBaseClimate = (
  section: {
    initial_conditions: { uuid: string; base_temperature: number }[];
    selected_initial_condition_uuid?: string;
  } | null
): ClimateCharge => {
  const selectedInitialCondition = section?.initial_conditions?.find(
    (ic) => ic.uuid === section?.selected_initial_condition_uuid
  );
  const baseTemperature = selectedInitialCondition?.base_temperature ?? DEFAULT_BASE_TEMPERATURE;

  return {
    ...defaultClimaticCharge,
    cableTemperature: baseTemperature
  };
};
