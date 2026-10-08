# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from stellar_engine.tools import calculate_cable_adjustment

INPUTS = {
    "spanIndex": 0,
    "spanLength": 500.0,
    "leftHorizontalAngle": 0.0,
    "rightHorizontalAngle": 100.0,
    "leftVerticalAngle": 95.0,
    "rightVerticalAngle": 94.0,
    "support": "LEFT",
    "tacheometerHorizontalDistance": 95.0,
    "adjustmentParameter": 1800,
}


def test_cable_adjustment_output_keys():
    result = calculate_cable_adjustment(INPUTS)
    assert set(result.keys()) == {"horizontalSightAngle", "verticalSightAngle"}


def test_cable_adjustment_output_range():
    result = calculate_cable_adjustment(INPUTS)
    for value in result.values():
        assert isinstance(value, float)
        assert 0 <= value <= 4000
