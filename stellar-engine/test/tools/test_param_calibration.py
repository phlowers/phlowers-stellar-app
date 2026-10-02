# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import pytest
from mechaphlowers import BalanceEngine, param_calibration

from stellar_engine.tools.param_calibration import parameter_15_without_wind


def _calibrate(
    engine: BalanceEngine, parameter: float, temperature: float
) -> float:
    return param_calibration(
        measured_parameter=parameter,
        measured_temperature=temperature,
        section_array=engine.section_array,
        cable_array=engine.cable_array,
        span_index=1,
    )


def test_parameter_15_without_wind_uncertainties(
    balance_engine_base: BalanceEngine,
):
    inputs = {
        "parameterPapoto": 2000.0,
        "parameterUncertaintyPapoto": 20.0,
        "cableTemperatureCalibration": 40.0,
        "cableTemperatureCalibrationUncertainty": 4.0,
        "span_index": 1,
    }

    result = parameter_15_without_wind(inputs, balance_engine_base)

    # P ± 0.5 * 1.65 * IncP = 2000 ± 16.5 ; T ± 0.9 * 1.65 * IncT = 40 ± 5.94
    expected_min = _calibrate(balance_engine_base, 1983.5, 34.06)
    expected_nominal = _calibrate(balance_engine_base, 2000.0, 40.0)
    expected_max = _calibrate(balance_engine_base, 2016.5, 45.94)

    assert result["parameter15CMinusUncertainty"] == pytest.approx(
        expected_min
    )
    assert result["parameter15C"] == pytest.approx(expected_nominal)
    assert result["parameter15CPlusUncertainty"] == pytest.approx(expected_max)
    assert (
        result["parameter15CMinusUncertainty"]
        < result["parameter15C"]
        < result["parameter15CPlusUncertainty"]
    )


def test_parameter_15_without_wind_zero_uncertainty(
    balance_engine_base: BalanceEngine,
):
    inputs = {
        "parameterPapoto": 2000.0,
        "parameterUncertaintyPapoto": 0.0,
        "cableTemperatureCalibration": 40.0,
        "cableTemperatureCalibrationUncertainty": 0.0,
        "span_index": 1,
    }

    result = parameter_15_without_wind(inputs, balance_engine_base)

    assert result["parameter15CMinusUncertainty"] == pytest.approx(
        result["parameter15C"]
    )
    assert result["parameter15CPlusUncertainty"] == pytest.approx(
        result["parameter15C"]
    )
