# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import numpy as np
import pytest
from mechaphlowers import TangentialSightingParameterMeasure
from mechaphlowers.config import options as cfg
from mechaphlowers.entities.errors import MechaphlowersValueError

from stellar_engine.tools.tangent_aiming import calculate_tangent_aiming

# Synthetic flat span of 400 m, catenary parameter 2000 m, angles in grad.
SUPPORT_INPUTS = {
    "spanLength": 400.0,
    "angleToCableTangent": 100.003,
    "angleToLeftSupport": 0.0,
    "angleToRightSupport": 98.409,
    "inputHeight": 10.0,
    "distance": 0.0,
}

EXTERIOR_INPUTS = {
    "spanLength": 400.0,
    "angleToCableTangent": 101.398,
    "angleToLeftSupport": 93.655,
    "angleToRightSupport": 99.293,
    "inputHeight": 0.0,
    "distance": -50.0,
}


def _expected_parameter(inputs):
    measure = TangentialSightingParameterMeasure()
    measure.measure_method(
        angle_to_cable_tangent=inputs["angleToCableTangent"],
        angle_to_left_support=inputs["angleToLeftSupport"],
        angle_to_right_support=inputs["angleToRightSupport"],
        span_length=inputs["spanLength"],
        input_height=inputs["inputHeight"],
        distance=inputs["distance"],
    )
    return measure.parameter


def test_tangent_aiming_support():
    result = calculate_tangent_aiming(SUPPORT_INPUTS)

    np.testing.assert_allclose(
        result["parameter"], _expected_parameter(SUPPORT_INPUTS), atol=0.1
    )
    np.testing.assert_allclose(result["parameter"], 2000, atol=5.0)
    assert result["checkValidity"]


def test_tangent_aiming_exterior():
    result = calculate_tangent_aiming(EXTERIOR_INPUTS)

    np.testing.assert_allclose(
        result["parameter"], _expected_parameter(EXTERIOR_INPUTS), atol=0.1
    )
    np.testing.assert_allclose(result["parameter"], 2000, atol=5.0)
    assert result["checkValidity"]


def test_tangent_aiming_output_shape():
    result = calculate_tangent_aiming(SUPPORT_INPUTS)

    assert set(result.keys()) == {
        "parameter",
        "uncertainty",
        "criterion",
        "checkValidity",
    }
    assert isinstance(result["parameter"], float)
    assert isinstance(result["uncertainty"], float)
    assert isinstance(result["criterion"], float)
    assert isinstance(result["checkValidity"], bool)
    assert result["uncertainty"] > 0
    assert result["criterion"] == pytest.approx(
        cfg.measure_uncertainty.max_accepted_uncertainty * 100
    )


def test_tangent_aiming_without_distance_nor_height_raises():
    inputs = {**SUPPORT_INPUTS, "inputHeight": 0.0, "distance": 0.0}

    with pytest.raises(MechaphlowersValueError):
        calculate_tangent_aiming(inputs)
