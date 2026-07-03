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

COVER_MAP = {
    "N0": 0,
    "N1": 1,
    "N2": 2,
    "N3": 3,
    "N4": 4,
    "N5": 5,
    "N6": 6,
    "N7": 7,
    "N8": 8,
}

UNIT_MAP = {"kmh": "km/h", "ms": "m/s"}


def temperature_calculation(inputs: dict, engine: BalanceEngine):
    # TODO: remove engine in inputs and use temp_inputs.cableName instead
    temp_inputs = TemperatureCalculationInputs(**inputs)
    thermal_engine = ThermalEngine()
    wind_speed = (
        units(temp_inputs.windSpeed, UNIT_MAP[temp_inputs.windSpeedUnit])
        .to("m/s")
        .m
    )
    wind_angle = DIRECTION_MAP[temp_inputs.windDirection]
    sky_cover = COVER_MAP[temp_inputs.skyCover]
    thermal_engine.set(
        cable_array=engine.cable_array,
        latitude=np.array([temp_inputs.latitude]),
        longitude=np.array([temp_inputs.longitude]),
        altitude=np.array([temp_inputs.altitude]),
        azimuth=np.array([temp_inputs.azimuth]),
        datetime_utc=np.array(
            [
                np.datetime64(
                    f"{temp_inputs.date.strftime('%Y-%m-%d')}T{temp_inputs.time.strftime('%H:%M')}"
                )
            ]
        ),
        intensity=np.array([temp_inputs.transit]),
        ambient_temp=np.array([temp_inputs.ambientTemperature]),
        wind_speed=np.array([wind_speed]),
        wind_angle=np.array([wind_angle]),
        nebulosity=np.array([sky_cover]),
    )
    temperature_result = thermal_engine.steady_temperature()
    return {
        "cableSolarFlux": None,
        "cableTemperature": temperature_result.data["core_temperature"].iloc[
            0
        ],
        "cableTemperatureUncertainty": 0,
    }


def get_wind_attack_angle(inputs: dict):
    wind_inputs = WindAngleCalculationInputs(**inputs)
    wind_azimuth = DIRECTION_MAP[wind_inputs.windDirection]
    wind_incidence = ThermalEngine.compute_wind_attack_angle(
        np.array(wind_inputs.azimuth), np.array(wind_azimuth)
    )
    return {"windIncidence": wind_incidence}
