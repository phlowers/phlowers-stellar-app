# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import numpy as np
from mechaphlowers import BalanceEngine, ThermalEngine, units

from stellar_engine.entities.inputs import (
    TemperatureCalculationInputs,
    WindAngleCalculationInputs,
)

DIRECTION_MAP = {
    'North': 0,
    'North-East': 45,
    'East': 90,
    'South-East': 135,
    'South': 180,
    'South-West': 225,
    'West': 270,
    'North-West': 315,
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
    wind_angle = DIRECTION_MAP[temp_inputs.windDirection]
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
    return {
        "cableSolarFlux": None,
        "cableTemperature": temperature_result.data["t_core"].iloc[0],
        "cableTemperatureUncertainty": 0,
    }


def get_wind_attack_angle(inputs: dict):
    wind_inputs = WindAngleCalculationInputs(**inputs)
    wind_azimuth = DIRECTION_MAP[wind_inputs.windDirection]
    wind_incidence = ThermalEngine.compute_wind_attack_angle(
        np.array(wind_inputs.azimuth), np.array(wind_azimuth)
    )
    return {"windIncidence": wind_incidence}
