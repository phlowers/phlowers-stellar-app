# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import numpy as np
from mechaphlowers import BalanceEngine
from stellar_engine.core.pose_table import build_engine_pose_table, get_pose_table



def test_pose_table(balance_engine_base: BalanceEngine):
    inputs = {"stepTemperature": 10, "baseTemperature": -25, "numberValues": 7}
    result = get_pose_table(inputs, balance_engine_base)
    expected_keys = {
        "temperatures",
        "poseParams",
        "horizontalTensions",
    }
    assert expected_keys == set(result.keys())
    for output_key in result:
        assert len(result[output_key]) == inputs["numberValues"]
    
    expected_temperature_array = np.array([-25, -15, -5, 5, 15, 25, 35])
    np.testing.assert_equal(result["temperatures"], expected_temperature_array)

def test_build_new_balance_engine(balance_engine_base: BalanceEngine):
    new_balance_engine = build_engine_pose_table(balance_engine_base)
    assert new_balance_engine.cable_array == balance_engine_base.cable_array
    assert new_balance_engine.section_array.data["span_length"].iloc[0] == balance_engine_base.get_ruling_span_length()
