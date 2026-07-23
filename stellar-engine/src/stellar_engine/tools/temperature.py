# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


from datetime import datetime

import numpy as np
from mechaphlowers import BalanceEngine, ThermalEngine, units

from stellar_engine.entities.errors import NightTimeError
from stellar_engine.entities.inputs import (
    DiffuseAndBeamRadiationInputs,
    SkyCoverEstimationInputs,
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

SKY_COVER_MAP = {
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

REVERSED_SKY_COVER_MAP = {
    conver_int: cover_str for cover_str, conver_int in SKY_COVER_MAP.items()
}

UNIT_MAP = {"kmh": "km/h", "ms": "m/s"}


def _check_inputs_are_datetimes(date, time) -> None:
    error_messages = []
    if not isinstance(date, datetime):
        error_messages.append(
            f"`date` should be a datetime, found {type(date)} instead."
        )
    if not isinstance(time, datetime):
        error_messages.append(
            f"`time` should be a datetime, found {type(time)} instead."
        )
    if error_messages:
        error_message = "\n".join(error_messages)
        raise TypeError(error_message)


def _check_sky_cover_input(sky_cover: str) -> None:
    if not isinstance(sky_cover, str):
        raise TypeError("`sky_cover` should be a string")
    if sky_cover not in SKY_COVER_MAP:
        raise ValueError(
            "`sky_cover` should be one of following values:\n"
            + ", ".join(SKY_COVER_MAP)
            + ".\n"
            f"Got {sky_cover}"
        )


def _build_np_datetime64(date: datetime, time: datetime) -> np.datetime64:
    _check_inputs_are_datetimes(date, time)
    return np.datetime64(
        f"{date.strftime('%Y-%m-%d')}T{time.strftime('%H:%M')}"
    )


def temperature_calculation(inputs: dict, engine: BalanceEngine):
    # TODO: remove engine in inputs and use temp_inputs.cableName instead
    temp_inputs = TemperatureCalculationInputs(**inputs)
    _check_sky_cover_input(temp_inputs.skyCover)
    thermal_engine = ThermalEngine()
    wind_speed = (
        units(temp_inputs.windSpeed, UNIT_MAP[temp_inputs.windSpeedUnit])
        .to("m/s")
        .m
    )
    wind_angle = DIRECTION_MAP[temp_inputs.windDirection]
    sky_cover = SKY_COVER_MAP[temp_inputs.skyCover]
    thermal_engine.set(
        cable_array=engine.cable_array,
        latitude=np.array([temp_inputs.latitude]),
        longitude=np.array([temp_inputs.longitude]),
        altitude=np.array([temp_inputs.altitude]),
        azimuth=np.array([temp_inputs.azimuth]),
        datetime_utc=np.array(
            [_build_np_datetime64(temp_inputs.date, temp_inputs.time)]
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


def compute_diffuse_and_beam_radiations(inputs: dict) -> dict[str, float]:
    parsed_inputs = DiffuseAndBeamRadiationInputs(**inputs)
    _check_sky_cover_input(parsed_inputs.skyCover)
    datetime_utc = _build_np_datetime64(parsed_inputs.date, parsed_inputs.time)
    nebulosity = SKY_COVER_MAP[parsed_inputs.skyCover]
    radiation_result = ThermalEngine.diffuse_and_beam_solar_radiations(
        datetime_utc=np.array([datetime_utc]),
        latitude=np.array([parsed_inputs.latitude]),
        longitude=np.array([parsed_inputs.longitude]),
        nebulosity=np.array([nebulosity]),
    )
    return {
        "diffuseRadiation": radiation_result.data["diffuse_radiation"].iloc[0],
        "beamRadiation": radiation_result.data["beam_radiation"].iloc[0],
        "diffusePlusBeamRadiation": radiation_result.data[
            "diffuse_plus_beam_radiation"
        ].iloc[0],
    }


def get_wind_attack_angle(inputs: dict):
    wind_inputs = WindAngleCalculationInputs(**inputs)
    wind_azimuth = DIRECTION_MAP[wind_inputs.windDirection]
    wind_incidence = ThermalEngine.compute_wind_attack_angle(
        np.array(wind_inputs.azimuth), np.array(wind_azimuth)
    )
    return {"windIncidence": wind_incidence}


def compute_nebulosity(inputs: dict) -> dict[str, str]:
    parsed_inputs = SkyCoverEstimationInputs(**inputs)
    print(parsed_inputs)
    datetime_utc = _build_np_datetime64(parsed_inputs.date, parsed_inputs.time)
    nebulosity = ThermalEngine.nebulosity(
        diffuse_plus_beam_radiation=np.array(
            [parsed_inputs.measuredSolarRadiation]
        ),
        datetime_utc=np.array([datetime_utc]),
        latitude=np.array([parsed_inputs.latitude]),
        longitude=np.array([parsed_inputs.longitude]),
    )
    result_sky_cover = nebulosity.data["nebulosity"].iloc[0]
    if np.isnan(result_sky_cover):
        raise NightTimeError(
            "Cannot compute sky cover if input time is during the night"
        )

    try:
        nebulosity_value = int(result_sky_cover)
        nebulosity_str = REVERSED_SKY_COVER_MAP[nebulosity_value]
    except (KeyError, ValueError) as e:
        raise ValueError(
            "Failed to compute nebulosity. Please verify inputs"
        ) from e
    return {"skyCover": nebulosity_str}
