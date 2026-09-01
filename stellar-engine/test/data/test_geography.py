# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import numpy as np

from stellar_engine.data.geography import (
    compute_localization,
    import_lambert,
    import_lambert_and_validate,
    import_lambert_and_validate_pyproj_poc,
)


def test_compute_localization():
    inputs = {
        "startLatitude": 48.8566,
        "startLongitude": 2.3522,
        "startAzimuth": 90,
        "spanLength": [500, 500, 500, np.nan],
        "lineAngle": [0, 10, 0, 0],
    }
    result = compute_localization(inputs)
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
        "lambert_x": [
            652469.02270914,
            652471.48385573,
            652405.05557107,
            652196.85828404,
            651774.86710069,
        ],
        "lambert_y": [
            6862035.25942008,
            6862335.24992367,
            6862729.73314491,
            6863184.61650681,
            6863612.38205321,
        ],
    }
    result = import_lambert(inputs)
    expected_keys = {
        "latitude",
        "longitude",
        "lambert_x",
        "lambert_y",
        "azimuth",
    }
    assert expected_keys == set(result.keys())


def test_import_lambert_and_validate():
    inputs = {
        "lambert_x": [
            652469.02270914,
            652471.48385573,
            652405.05557107,
            652196.85828404,
            651774.86710069,
        ],
        "lambert_y": [
            6862035.25942008,
            6862335.24992367,
            6862729.73314491,
            6863184.61650681,
            6863612.38205321,
        ],
        "startLatitude": 48.8566,
        "startLongitude": 2.3522,
        "startAzimuth": 0,
        "spanLength": [
            300.0,
            400.0,
            500.0,
            600.0,
            np.nan,
        ],  # last value not taken into account
        "lineAngle": [0.0, 10.0, 15.0, 20.0, 0.0],
    }
    result = import_lambert_and_validate(inputs)
    expected_keys = {
        "localization",
        "meanGpsDiff",
    }
    assert expected_keys == set(result.keys())
    assert result["meanGpsDiff"] < 1e-5


def test_import_lambert_and_validate_true_value():
    inputs = {
        "lambert_x": [
            335314.673,
            335533.8218,
        ],
        "lambert_y": [
            6847542.8023,
            6847418.6947,
        ],
        "startLatitude": 48.6251325661418,
        "startLongitude": -1.9515076083443268,
        "startAzimuth": -115.9970179559439,
        "spanLength": [
            251.85,
            np.nan,
        ],  # last value not taken into account
        "lineAngle": [23.89, 10.0], # should not taken into account ifonly one span 
    }
    result = import_lambert_and_validate(inputs)
    expected_keys = {
        "localization",
        "meanGpsDiff",
    }
    # azimuth_error = abs(result["azimuth"] - 119.53)
    # print(f"Azimuth error: {azimuth_error}")
    # assert azimuth_error < 1e-2
    assert expected_keys == set(result.keys())
    print(result["meanGpsDiff"])
    assert result["meanGpsDiff"] < 1e-5


def test_import_lambert_and_validate_true_value_pyproj_poc():
    inputs = {
        "lambert_x": [
            335314.673,
            335533.8218,
        ],
        "lambert_y": [
            6847542.8023,
            6847418.6947,
        ],
        "startLatitude": 48.6251325661418,
        "startLongitude": -1.9515076083443268,
        "startAzimuth": -115.9970179559439,
        "spanLength": [
            251.85,
            np.nan,
        ],  # last value not taken into account
        "lineAngle": [23.89, 10.0],  # should not taken into account if only one span
    }
    result = import_lambert_and_validate_pyproj_poc(inputs)
    expected_keys = {
        "localization",
        "meanGpsDiff",
        "azimuth",
    }
    assert expected_keys == set(result.keys())
    print(result["meanGpsDiff"])
    # GPS difference on the reconstructed second point.
    assert result["meanGpsDiff"] < 1e-6
    # Flat-plane azimuth of the first span compared to the reference value.
    azimuth_error = abs(result["azimuth"][0] - 119.53)
    print(f"Azimuth error: {azimuth_error}")
    assert azimuth_error < 1e-2
    
