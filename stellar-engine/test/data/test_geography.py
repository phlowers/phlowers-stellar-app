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
    print(result)
    assert expected_keys == set(result.keys())
    assert result["latitude"][0] == inputs["startLatitude"]
    assert result["longitude"][0] == inputs["startLongitude"]
    assert result["azimuth"][0] == inputs["startAzimuth"]

    np.testing.assert_allclose(
        result["latitude"],
        [48.8566, 48.856636683993784, 48.855891713451356, 48.855146365504844],
        rtol=1e-6,
    )
    np.testing.assert_allclose(
        result["longitude"],
        [2.3522, 2.3590134705562726, 2.3657329387442005, 2.372452211109954],
        rtol=1e-6,
    )


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

    # here just no regression values with hardcoded expected results
    np.testing.assert_allclose(
        result["longitude"],
        [2.3522000, 2.3522000, 2.3512505, 2.3483616, 2.3425608],
        rtol=1e-6,
    )
    np.testing.assert_allclose(
        result["latitude"],
        [48.8566000, 48.8592980, 48.8628406, 48.8669159, 48.8707312],
        rtol=1e-6,
    )


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
        "meanGpsDiffMeter",
    }
    assert expected_keys == set(result.keys())
    assert result["meanGpsDiffMeter"] < 1.0  # 1 meter


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
        "startAzimuth": -119.53,
        "spanLength": [
            251.85,
            np.nan,
        ],  # last value not taken into account
        "lineAngle": [
            23.89,
            10.0,
        ],  # should not taken into account if only one span
    }
    result = import_lambert_and_validate(inputs)
    expected_keys = {
        "localization",
        "meanGpsDiffMeter",
    }
    assert expected_keys == set(result.keys())
    print(result["meanGpsDiffMeter"])
    # GPS difference on the reconstructed second point.
    assert result["meanGpsDiffMeter"] < 0.1  # 10 cm
    # Flat-plane azimuth of the first span compared to the reference value.
    azimuth_error = abs(result["localization"]["azimuth"][0] - 119.53)
    print(f"Azimuth error: {azimuth_error}")
    assert azimuth_error < 1e-2
