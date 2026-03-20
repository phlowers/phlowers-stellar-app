# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import numpy as np
from mechaphlowers import (
    BalanceEngine,
    ThermalEngine,
    param_calibration,
    units,
)
from mechaphlowers.core.models.guying import Guying

from stellar_engine.validation import (
    GuyingInputs,
    ParameterCalibrationInputs,
    TemperatureCalculationInputs,
)


def calculate_guying(inputs: dict, engine: BalanceEngine):
    guying_inputs = GuyingInputs(**inputs)
    guying = Guying(engine)
    guying_results = guying.compute(
        index=guying_inputs.selectedSpanIndex,
        with_pulley=guying_inputs.hasPulley,
        altitude=guying_inputs.altitude,
        horizontal_distance=guying_inputs.horizontalDistance,
        side=guying_inputs.selectedSupport.lower(),
        view="span",
    )

    # hard code units?
    return {
        "tensionInGuy": guying_results.guying_tension.to("daN").m,
        "guyAngle": guying_results.guying_angle_degrees.to("deg").m,
        "chargeVUnderConsole": guying_results.vertical_force.to("daN").m,
        "chargeLIfPulley": guying_results.longitudinal_force.to("daN").m,
        "chargeHUnderConsole": 0,
    }


def parameter_15_without_wind(inputs: dict, engine: BalanceEngine):
    param_calibr_inputs = ParameterCalibrationInputs(**inputs)
    print(param_calibr_inputs)
    param_result = param_calibration(
        measured_parameter=param_calibr_inputs.parameterPapoto,
        measured_temperature=param_calibr_inputs.cableTemperatureCalibration,
        section_array=engine.section_array,
        cable_array=engine.cable_array,
        span_index=param_calibr_inputs.span_index,
    )
    return {
        "parameter15CMinusUncertainty": None,
        "parameter15C": param_result,
        "parameter15CPlusUncertainty": None,
    }


def temperature_calculation(inputs: dict, engine: BalanceEngine):
    temp_inputs = TemperatureCalculationInputs(**inputs)
    thermal_engine = ThermalEngine()
    unit_map = {"kmh": "km/h", "ms": "m/s"}
    wind_speed = (
        units(temp_inputs.windSpeed, unit_map[temp_inputs.windSpeedUnit])
        .to("m/s")
        .m
    )
    direction_map = {
        'North': 0,
        'North-East': 45,
        'East': 90,
        'South-East': 135,
        'South': 180,
        'South-West': 225,
        'West': 270,
        'North-West': 315,
    }
    wind_angle = direction_map[temp_inputs.windDirection]
    thermal_engine.set(
        cable_array=engine.cable_array,
        latitude=np.array([temp_inputs.latitude]),
        longitude=np.array([temp_inputs.longitude]),
        altitude=np.array([temp_inputs.altitude]),
        azimuth=np.array([temp_inputs.azimuth]),
        month=np.array([temp_inputs.date.month]),
        day=np.array([temp_inputs.date.day]),
        hour=np.array([temp_inputs.time.hour]),
        intensity=np.array([temp_inputs.transit]),
        ambient_temp=np.array([temp_inputs.ambientTemperature]),
        wind_speed=np.array([wind_speed]),
        wind_angle=np.array([wind_angle]),
    )
    temperature_result = thermal_engine.steady_temperature()
    print(temperature_result)
    return {
        "cableSolarFlux": None,
        "cableTemperature": temperature_result.data["t_core"].iloc[0],
        "cableTemperatureUncertainty": 0,
    }
