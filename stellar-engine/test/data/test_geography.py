# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import numpy as np
import pandas as pd
from mechaphlowers import SectionArray

from stellar_engine.data.geography import (
    compute_localization,
    import_lambert,
    import_lambert_and_validate,
)


def test_compute_localization():
    section_array = SectionArray(
        pd.DataFrame(
            {
                "name": ["1", "2", "3", "4"],
                "suspension": [False, True, True, False],
                "conductor_attachment_altitude": [50, 100, 50, 50],
                "crossarm_length": [10, 10, 10, 10],
                "line_angle": [0, 10, 0, 0],
                "insulator_length": [3, 3, 3, 3],
                "span_length": [500, 500, 500, np.nan],
                "insulator_mass": [100.0, 50.0, 50.0, 100.0],
                "load_mass": [0, 0, 0, 0],
                "load_position": [0, 0, 0, 0],
            }
        ),
        sagging_parameter=2000,
        sagging_temperature=15,
    )
    section_array.add_units({"line_angle": "deg"})
    inputs = {
        "startLatitude": 48.8566,
        "startLongitude": 2.3522,
        "startAzimuth": 90,
    }
    result = compute_localization(inputs, section_array)
    expected_keys = {
        "latitude",
        "longitude",
        "lambert_x",
        "lambert_y",
        "azimuth",
    }
    assert expected_keys == set(result.keys())
    assert result["latitude"][0] == inputs["startLatitude"]
    assert result["longitude"][0] == inputs["startLongitude"]
    assert result["azimuth"][0] == inputs["startAzimuth"]


def test_import_lambert():
    inputs = {
        "x": [
            652469.02270914,
            652471.48385573,
            652405.05557107,
            652196.85828404,
            651774.86710069,
        ],
        "y": [
            6862035.25942008,
            6862335.24992367,
            6862729.73314491,
            6863184.61650681,
            6863612.38205321,
        ],
    }
    import_lambert(inputs)


def test_import_lambert_and_validate():
    inputs = {
        "x": [],
        "y": [],
        "startLatitude": 48.8566,
        "startLongitude": 2.3522,
        "startAzimuth": 90,
        "spanLengths": [],
        "lineAngles": [],
    }
    import_lambert_and_validate(inputs)
