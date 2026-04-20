# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import numpy as np

from stellar_engine.tools.papoto import calculate_papoto


def test_wind_incidence():
    inputs = {
        "spanLength": 498.565922913587,
        "HL": 0.0,
        "VL": 97.4327311161033,
        "HR": 162.614599621714,
        "VR": 88.6907631859419,
        "H1": 5.1134354937127,
        "V1": 98.4518011880176,
        "H2": 19.6314054626454,
        "V2": 97.6289296721015,
        "H3": 97.1475339907774,
        "V3": 87.9335010245142,
    }
    result = calculate_papoto(inputs)
    expected_keys = {
        "parameter",
        "parameter_1_2",
        "parameter_2_3",
        "parameter_1_3",
        "checkValidity",
        "uncertainty",
    }
    assert expected_keys == set(result.keys())

    np.testing.assert_allclose(result["parameter"], 2000, atol=1.0)
    assert result["checkValidity"]
    assert isinstance(result["uncertainty"], float)
