# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import numpy as np
from mechaphlowers import BalanceEngine

from stellar_engine.core.pose_table import (
    build_engine_pose_table,
    get_pose_table,
)


def test_pose_table(balance_engine_no_anchor: BalanceEngine):
    inputs = {"stepTemperature": 5, "baseTemperature": -15, "numberValues": 7}
    result = get_pose_table(inputs, balance_engine_no_anchor)
    expected_keys = {
        "temperatures",
        "poseParams",
        "horizontalTensions",
    }
    assert expected_keys == set(result.keys())
    for output_key in result:
        assert len(result[output_key]) == inputs["numberValues"]

    expected_temperature_array = np.array([-15, -10, -5, 0, 5, 10, 15])
    np.testing.assert_equal(result["temperatures"], expected_temperature_array)
    np.testing.assert_allclose(result["poseParams"][-1], 2000.0)


def test_build_new_balance_engine(balance_engine_no_anchor: BalanceEngine):
    new_balance_engine = build_engine_pose_table(balance_engine_no_anchor)
    assert (
        new_balance_engine.cable_array == balance_engine_no_anchor.cable_array
    )
    assert (
        new_balance_engine.section_array.data["span_length"].iloc[0]
        == balance_engine_no_anchor.get_ruling_span_length()
    )
