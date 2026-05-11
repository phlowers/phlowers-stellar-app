# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import datetime

import numpy as np
from mechaphlowers import BalanceEngine

from stellar_engine.tools.temperature import (
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
