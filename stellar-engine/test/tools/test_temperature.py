# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import numpy as np

from stellar_engine.tools.temperature import get_wind_attack_angle


def test_wind_incidence():
    inputs = {"azimuth": 90, "windDirection": "North-East"}
    result = get_wind_attack_angle(inputs)
    assert "windIncidence" in result
    np.testing.assert_almost_equal(result["windIncidence"], 45)
