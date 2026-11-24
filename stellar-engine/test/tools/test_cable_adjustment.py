# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import numpy as np

from stellar_engine.tools import calculate_cable_adjustment

INPUTS = {
    "spanIndex": 0,
    "spanLength": 500.0,
    "leftHorizontalAngle": 0.0,
    "rightHorizontalAngle": 90.0,
    "leftVerticalAngle": 30.0,
    "rightVerticalAngle": 50.0,
    "support": "LEFT",
    "tacheometerHorizontalDistance": 300.0,
    "adjustmentParameter": 2000,
}


def test_cable_adjustment_output_keys():
    result = calculate_cable_adjustment(INPUTS)
    assert set(result.keys()) == {"horizontalSightAngle", "verticalSightAngle"}


def test_cable_adjustment_output_range():
    result = calculate_cable_adjustment(INPUTS)
    result_h, result_v = (
        result["horizontalSightAngle"],
        result["verticalSightAngle"],
    )
    # results comes from mechaphlowers test
    np.testing.assert_allclose(result_h, 55.752, atol=1e-3)
    np.testing.assert_allclose(result_v, 33.214, atol=1e-3)
