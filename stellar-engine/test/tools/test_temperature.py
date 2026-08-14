# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import datetime

import numpy as np
import pytest
from mechaphlowers import BalanceEngine

from stellar_engine.entities.errors import NightTimeError
from stellar_engine.tools.temperature import (
    compute_diffuse_and_beam_radiations,
    compute_nebulosity,
    get_wind_attack_angle,
    temperature_calculation,
)


def test_wind_incidence():
    inputs = {"azimuth": 90, "windDirection": "North-East"}
    result = get_wind_attack_angle(inputs)
    assert "windIncidence" in result
    np.testing.assert_allclose(result["windIncidence"], 45)


def test_temp_calculation(balance_engine_base: BalanceEngine):
    inputs = {
        "cableName": "ASTER 600",
        "ambientTemperature": 15,
        "longitude": 45.0,
        "latitude": 0.0,
        "transit": 100.0,
        "skyCover": "N0",
        "altitude": 0,
        "azimuth": 0,
        "date": datetime.datetime(1970, 3, 21, 22),
        "time": datetime.datetime(1970, 3, 21, 22),
        "windSpeed": 10,
        "windSpeedUnit": 'ms',
        "windDirection": 'East',
    }
    result = temperature_calculation(inputs, engine=balance_engine_base)
    assert "cableTemperature" in result
    np.testing.assert_allclose(result["cableTemperature"], 15.1, atol=1e-1)


def test_diffuse_and_beam_radiation() -> None:
    inputs = {
        "date": datetime.datetime(1970, 12, 21),
        "time": datetime.datetime(1970, 3, 21, 12),
        "longitude": 45.0,
        "latitude": 0.0,
        "skyCover": "N0",
    }
    result = compute_diffuse_and_beam_radiations(inputs)
    expected_diffuse_radiation = 167.01
    expected_beam_radiation = 604.43
    np.testing.assert_allclose(
        result["diffuseRadiation"], expected_diffuse_radiation, atol=0.01
    )
    np.testing.assert_allclose(
        result["beamRadiation"], expected_beam_radiation, atol=0.01
    )
    np.testing.assert_allclose(
        result["diffusePlusBeamRadiation"],
        expected_diffuse_radiation + expected_beam_radiation,
        atol=0.01,
    )


# Documentation test
def test_diffuse_and_beam_radiation__night_pacific_ocean() -> None:
    inputs = {
        "date": datetime.datetime(1970, 12, 21),
        # midday in Greenwich so night at longitude = 180 (Pacific Ocean)
        # we interpret "time" as UTC, we do *not* infer a timezone from given longitude.
        "time": datetime.datetime(1970, 3, 21, 12),
        "longitude": 180,
        "latitude": 0.0,
        "skyCover": "N0",
    }
    result = compute_diffuse_and_beam_radiations(inputs)
    # night so no radiation
    expected_diffuse_radiation = 0
    expected_beam_radiation = 0
    np.testing.assert_allclose(
        result["diffuseRadiation"], expected_diffuse_radiation, atol=0.01
    )
    np.testing.assert_allclose(
        result["beamRadiation"], expected_beam_radiation, atol=0.01
    )
    np.testing.assert_allclose(
        result["diffusePlusBeamRadiation"],
        expected_diffuse_radiation + expected_beam_radiation,
        atol=0.01,
    )


# TODO
def test_diffuse_and_beam_radiation__wrong_date_type() -> None:
    inputs = {
        "date": "2026-07-10",
        "time": "2026-07-10T23:00",
        "longitude": -89,
        "latitude": 45,
        "skyCover": "N4",
    }
    with pytest.raises(TypeError, match=r"date.*time"):
        compute_diffuse_and_beam_radiations(inputs)


def test_diffuse_and_beam_radiation__wrong_sky_cover_type() -> None:
    inputs = {
        "date": datetime.datetime(1970, 12, 21),
        "time": datetime.datetime(1970, 3, 21, 12),
        "longitude": 45.0,
        "latitude": 0.0,
        "skyCover": 0,
    }
    with pytest.raises(TypeError):
        compute_diffuse_and_beam_radiations(inputs)

    inputs = {
        "date": datetime.datetime(1970, 12, 21),
        "time": datetime.datetime(1970, 3, 21, 12),
        "longitude": 45.0,
        "latitude": 0.0,
        "skyCover": "0",
    }
    with pytest.raises(ValueError):
        compute_diffuse_and_beam_radiations(inputs)


def test_compute_nebulosity() -> None:
    inputs = {
        "date": datetime.datetime(1970, 12, 21),
        "time": datetime.datetime(1970, 3, 21, 12),
        "longitude": 45.0,
        "latitude": 0.0,
        "measuredSolarRadiation": 600,
    }
    result = compute_nebulosity(inputs)
    assert result["skyCover"] == 'N5'


def test_compute_nebulosity_night() -> None:
    inputs = {
        "date": datetime.datetime(1970, 12, 21),
        "time": datetime.datetime(1970, 3, 21, 2),
        "longitude": 45.0,
        "latitude": 0.0,
        "measuredSolarRadiation": 600,
    }
    with pytest.raises(NightTimeError):
        compute_nebulosity(inputs)
