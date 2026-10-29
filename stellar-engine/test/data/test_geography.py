# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import numpy as np
import pytest
from pyproj import Geod

from stellar_engine.data.geography import (
    _normalize_azimuth,
    compute_errors,
    compute_localization,
    compute_start_from_next_support,
    convert_coordinates,
    gps_to_lambert93,
    import_lambert,
    import_lambert_and_validate,
    validate_gps_positions,
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

    np.testing.assert_allclose(
        result["latitude"],
        [48.8566, 48.856636683993784, 48.855969209897765, 48.855301356314676],
        rtol=1e-6,
    )
    np.testing.assert_allclose(
        result["longitude"],
        [2.3522, 2.3590134705562726, 2.365751623583987, 2.3724896006661265],
        rtol=1e-6,
    )


def test_compute_localization_converts_line_angle_from_grad_to_deg():
    inputs = {
        "startLatitude": 48.8566,
        "startLongitude": 2.3522,
        "startAzimuth": 45,
        "spanLength": [500, 500, np.nan],
        "lineAngle": [50, 100, 0],
    }
    result = compute_localization(inputs)

    # 50 gr = 45 deg, 100 gr = 90 deg
    np.testing.assert_allclose(result["azimuth"], [90, 180])


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
            300.0325,
            400.0788,
            500.3156,
            600.9418,
            np.nan,
        ],  # geodesic span lengths of the points; last value not taken into account
        "lineAngle": [
            0.0,
            -11.142866,
            -16.705228,
            -22.241497,
            0.0,
        ],  # deflections matching the imported azimuths (grad)
    }
    result = import_lambert_and_validate(inputs)
    expected_keys = {
        "localization",
        "startAzimuth",
        "positionErrorMeter",
    }
    assert expected_keys == set(result.keys())
    assert len(result["positionErrorMeter"]) == 5
    assert result["positionErrorMeter"][0] == 0.0
    assert max(result["positionErrorMeter"]) < 0.05  # 5 cm


def test_import_lambert_and_validate_start_azimuth_removes_first_line_angle():
    inputs = {
        "lambert_x": [652469.02270914, 652471.48385573],
        "lambert_y": [6862035.25942008, 6862335.24992367],
        "startAzimuth": 0,
        "spanLength": [300.0, np.nan],
        "lineAngle": [50.0, 0.0],  # 50 grad = 45 deg
    }
    result = import_lambert_and_validate(inputs)

    np.testing.assert_allclose(
        result["startAzimuth"],
        result["localization"]["azimuth"][0] - 45.0,
    )


@pytest.mark.parametrize("first_line_angle_grad", [0.0, 50.0, -30.0])
def test_import_then_compute_localization_round_trip(first_line_angle_grad):
    """Recomputing from the imported start azimuth must not rotate the section."""
    inputs = {
        "lambert_x": [
            652469.02270914,
            652471.48385573,
            652405.05557107,
        ],
        "lambert_y": [
            6862035.25942008,
            6862335.24992367,
            6862729.73314491,
        ],
        "startAzimuth": 0,
        "spanLength": [300.0, 400.0, np.nan],
        "lineAngle": [first_line_angle_grad, 10.0, 0.0],
    }
    imported = import_lambert_and_validate(inputs)
    localization = imported["localization"]

    recomputed = compute_localization(
        {
            "startLatitude": localization["latitude"][0],
            "startLongitude": localization["longitude"][0],
            "startAzimuth": imported["startAzimuth"],
            "spanLength": inputs["spanLength"],
            "lineAngle": inputs["lineAngle"],
        }
    )

    np.testing.assert_allclose(
        recomputed["azimuth"][0], localization["azimuth"][0], atol=1e-9
    )


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
        "startAzimuth",
        "positionErrorMeter",
    }
    assert expected_keys == set(result.keys())
    print(result["positionErrorMeter"])
    # GPS difference on the reconstructed second point.
    assert max(result["positionErrorMeter"]) < 0.1  # 10 cm
    # Flat-plane azimuth of the first span compared to the reference value.
    azimuth_error = abs(result["localization"]["azimuth"][0] - 119.53)
    print(f"Azimuth error: {azimuth_error}")
    assert azimuth_error < 1e-2


def test_compute_errors_zero_distance():
    """Identical original and reconstructed points should yield 0 m distance."""
    latitude = np.array([48.8566, 48.856636683993784])
    longitude = np.array([2.3522, 2.3522446])

    lat_diff, lon_diff, dist_diff_meter, mean_gps_diff = compute_errors(
        latitude,
        longitude,
        longitude[1:],  # reconstructed_lon
        latitude[1:],  # reconstructed_lat
    )

    assert lat_diff.shape == (1,)
    assert lon_diff.shape == (1,)
    assert dist_diff_meter.shape == (1,)
    np.testing.assert_allclose(dist_diff_meter, [0.0], atol=1e-6)
    np.testing.assert_allclose(mean_gps_diff, 0.0, atol=1e-6)


def test_compute_errors_single_offset():
    """A known geodesic offset is reported in meters."""
    latitude = np.array([48.8566, 48.8566])
    longitude = np.array([2.3522, 2.3532])
    # Reconstructed point is ~1° east in longitude, i.e. ~73 km at this latitude.
    reconstructed_lat = np.array([48.8566])
    reconstructed_lon = np.array([3.3522])

    lat_diff, lon_diff, dist_diff_meter, mean_gps_diff = compute_errors(
        latitude,
        longitude,
        reconstructed_lon,
        reconstructed_lat,
    )

    assert lat_diff.shape == (1,)
    assert lon_diff.shape == (1,)
    assert dist_diff_meter.shape == (1,)
    np.testing.assert_allclose(
        dist_diff_meter,
        [73_307.716579],
        rtol=1e-6,
    )
    np.testing.assert_allclose(mean_gps_diff, 73_307.716579, rtol=1e-6)
    assert lat_diff[0] == abs(reconstructed_lat[0] - latitude[1])
    assert lon_diff[0] == abs(reconstructed_lon[0] - longitude[1])


def test_compute_errors_multi_points():
    """Distance is computed for each reconstructed support and averaged."""
    latitude = np.array([0.0, 0.0, 0.0])
    longitude = np.array([0.0, 0.001, 0.002])
    reconstructed_lat = np.array([0.0, 0.0])
    reconstructed_lon = np.array([-0.001, 0.001])

    lat_diff, lon_diff, dist_diff_meter, mean_gps_diff = compute_errors(
        latitude,
        longitude,
        reconstructed_lon,
        reconstructed_lat,
    )

    assert lat_diff.shape == (2,)
    assert lon_diff.shape == (2,)
    assert dist_diff_meter.shape == (2,)
    np.testing.assert_allclose(
        dist_diff_meter,
        [222.638982, 111.319491],
        rtol=1e-6,
    )
    np.testing.assert_allclose(mean_gps_diff, 166.979236, rtol=1e-6)


def test_convert_coordinates_round_trip():
    lon = [2.3522, 5.3698]
    lat = [48.8566, 43.2965]
    projected = convert_coordinates(
        {
            "sourceCrs": "EPSG:4326",
            "targetCrs": "EPSG:2154",
            "x": lon,
            "y": lat,
        }
    )
    assert 600_000 < projected["x"][0] < 700_000
    back = convert_coordinates(
        {
            "sourceCrs": "EPSG:2154",
            "targetCrs": "EPSG:4326",
            "x": projected["x"],
            "y": projected["y"],
        }
    )
    np.testing.assert_allclose(back["x"], lon, atol=1e-8)
    np.testing.assert_allclose(back["y"], lat, atol=1e-8)


def test_convert_coordinates_nan_passthrough():
    result = convert_coordinates(
        {
            "sourceCrs": "EPSG:4326",
            "targetCrs": "EPSG:2154",
            "x": [2.3522, float("nan")],
            "y": [48.8566, float("nan")],
        }
    )
    assert np.isfinite(result["x"][0])
    assert np.isnan(result["x"][1])
    assert np.isnan(result["y"][1])


def test_convert_coordinates_empty():
    result = convert_coordinates(
        {"sourceCrs": "EPSG:4326", "targetCrs": "EPSG:2154", "x": [], "y": []}
    )
    assert result == {"x": [], "y": []}


def _consistent_section(start_azimuth, line_angle, span_length):
    """Build GPS and Lambert93 points from a flat section definition."""
    localization = compute_localization(
        {
            "startLatitude": 45.0,
            "startLongitude": 5.0,
            "startAzimuth": start_azimuth,
            "spanLength": span_length,
            "lineAngle": line_angle,
        }
    )
    lambert_x, lambert_y = gps_to_lambert93(
        np.array(localization["latitude"]),
        np.array(localization["longitude"]),
    )
    return localization, lambert_x.tolist(), lambert_y.tolist()


@pytest.mark.parametrize(
    ("angle", "expected"),
    [
        (0.0, 0.0),
        (180.0, 180.0),
        (-180.0, 180.0),
        (190.0, -170.0),
        (-190.0, 170.0),
        (540.0, 180.0),
        (-540.0, 180.0),
        (359.0, -1.0),
        (-45.0, -45.0),
    ],
)
def test_normalize_azimuth_boundaries(angle, expected):
    result = _normalize_azimuth(angle)
    assert isinstance(result, float)
    assert result == pytest.approx(expected, abs=1e-12)


def test_normalize_azimuth_array():
    result = _normalize_azimuth(np.array([180.0, -180.0, 190.0, -190.0]))
    np.testing.assert_allclose(
        result, [180.0, 180.0, -170.0, 170.0], atol=1e-12
    )


def test_import_lambert_and_validate_normalizes_start_azimuth():
    # Flat azimuth of the first span is 170 deg; 170 - (-45) = 215 deg must
    # be wrapped into ]-180, 180].
    _, lambert_x, lambert_y = _consistent_section(
        170.0, [0.0, 10.0, 0.0, 0.0], [300.0, 400.0, 500.0, np.nan]
    )
    result = import_lambert_and_validate(
        {
            "lambert_x": lambert_x,
            "lambert_y": lambert_y,
            "startAzimuth": 0,  # ignored
            "spanLength": [300.0, 400.0, 500.0, np.nan],
            "lineAngle": [-50.0, 10.0, 0.0, 0.0],  # -50 grad = -45 deg
        }
    )
    assert pytest.approx(-145.0, abs=1e-3) == result["startAzimuth"]
    assert -180.0 < result["startAzimuth"] <= 180.0
    assert max(result["positionErrorMeter"]) < 0.05


def test_import_lambert_and_validate_consistent_geometry_has_no_error():
    span_length = [300.0, 450.0, 400.0, np.nan]
    line_angle = [7.0, 12.0, -8.0, 0.0]
    _, lambert_x, lambert_y = _consistent_section(
        170.0, line_angle, span_length
    )
    result = import_lambert_and_validate(
        {
            "lambert_x": lambert_x,
            "lambert_y": lambert_y,
            "spanLength": span_length,
            "lineAngle": line_angle,
        }
    )
    assert len(result["positionErrorMeter"]) == 4
    assert result["positionErrorMeter"][0] == 0.0
    assert max(result["positionErrorMeter"]) < 0.05
    assert result["startAzimuth"] == pytest.approx(170.0, abs=1e-4)
    np.testing.assert_allclose(
        result["localization"]["azimuth"][0] - result["startAzimuth"],
        7.0 * 0.9,
        atol=1e-6,
    )


@pytest.mark.parametrize("start_azimuth", [170.0, 179.0, -179.5])
def test_validate_gps_positions_consistent_geometry(start_azimuth):
    span_length = [300.0, 450.0, 400.0, np.nan]
    line_angle = [7.0, 12.0, -8.0, 0.0]
    localization, _, _ = _consistent_section(
        start_azimuth, line_angle, span_length
    )
    result = validate_gps_positions(
        {
            "latitude": localization["latitude"],
            "longitude": localization["longitude"],
            "spanLength": span_length,
            "lineAngle": line_angle,
        }
    )
    assert set(result.keys()) == {
        "azimuth",
        "startAzimuth",
        "positionErrorMeter",
    }
    assert max(result["positionErrorMeter"]) < 0.05
    assert result["startAzimuth"] == pytest.approx(
        _normalize_azimuth(start_azimuth), abs=1e-4
    )
    azimuth_diff = _normalize_azimuth(
        np.array(result["azimuth"]) - np.array(localization["azimuth"])
    )
    np.testing.assert_allclose(azimuth_diff, 0.0, atol=1e-4)


def test_validate_gps_positions_none_values_are_treated_as_zero():
    span_length = [300.0, 450.0, 400.0, None]
    line_angle = [7.0, 12.0, -8.0, None]
    localization, _, _ = _consistent_section(
        170.0, [7.0, 12.0, -8.0, 0.0], [300.0, 450.0, 400.0, np.nan]
    )
    result = validate_gps_positions(
        {
            "latitude": localization["latitude"],
            "longitude": localization["longitude"],
            "spanLength": span_length,
            "lineAngle": line_angle,
        }
    )
    assert max(result["positionErrorMeter"]) < 0.05


@pytest.mark.parametrize(
    ("key", "wrong_value"),
    [
        ("lineAngle", [7.0, 13.0, -8.0, 0.0]),  # 1 grad at support 1
        ("spanLength", [300.0, 452.0, 400.0, np.nan]),  # 2 m on span 1
    ],
)
def test_validate_gps_positions_detects_inconsistent_geometry(
    key, wrong_value
):
    span_length = [300.0, 450.0, 400.0, np.nan]
    line_angle = [7.0, 12.0, -8.0, 0.0]
    localization, _, _ = _consistent_section(170.0, line_angle, span_length)
    inputs = {
        "latitude": localization["latitude"],
        "longitude": localization["longitude"],
        "spanLength": span_length,
        "lineAngle": line_angle,
    }
    inputs[key] = wrong_value
    result = validate_gps_positions(inputs)
    assert max(result["positionErrorMeter"]) > 1.0


def test_validate_gps_positions_single_point():
    result = validate_gps_positions(
        {
            "latitude": [45.0],
            "longitude": [5.0],
            "spanLength": [np.nan],
            "lineAngle": [0.0],
        }
    )
    assert result == {
        "azimuth": [],
        "startAzimuth": None,
        "positionErrorMeter": [0.0],
    }


def test_validate_gps_positions_rejects_length_mismatch():
    with pytest.raises(ValueError, match="same length"):
        validate_gps_positions(
            {
                "latitude": [45.0, 45.001],
                "longitude": [5.0, 5.001],
                "spanLength": [300.0],
                "lineAngle": [0.0, 0.0],
            }
        )


@pytest.mark.parametrize("original_start_azimuth", [170.0, 179.0])
def test_compute_start_from_next_support_keeps_old_supports(
    original_start_azimuth,
):
    original_span = [300.0, 450.0, 400.0, np.nan]
    original_angles = [0.0, 12.0, -8.0, 0.0]
    original = compute_localization(
        {
            "startLatitude": 45.0,
            "startLongitude": 5.0,
            "startAzimuth": original_start_azimuth,
            "spanLength": original_span,
            "lineAngle": original_angles,
        }
    )
    new_span_length = 350.0
    new_angles = [3.0, -5.0]

    new_start = compute_start_from_next_support(
        {
            "latitude": original["latitude"][0],
            "longitude": original["longitude"][0],
            "nextSpanAzimuth": original["azimuth"][0],
            "spanLength": new_span_length,
            "lineAngle": new_angles,
        }
    )
    assert set(new_start.keys()) == {"latitude", "longitude", "startAzimuth"}
    assert -180.0 < new_start["startAzimuth"] <= 180.0

    # Old support 0 becomes support 1 of the new section.
    rebuilt = compute_localization(
        {
            "startLatitude": new_start["latitude"],
            "startLongitude": new_start["longitude"],
            "startAzimuth": new_start["startAzimuth"],
            "spanLength": [new_span_length, *original_span],
            "lineAngle": [*new_angles, *original_angles[1:]],
        }
    )

    geod = Geod(ellps="WGS84")
    _, _, distances = geod.inv(
        original["longitude"],
        original["latitude"],
        rebuilt["longitude"][1:],
        rebuilt["latitude"][1:],
    )
    np.testing.assert_array_less(distances, 0.01)
    azimuth_diff = _normalize_azimuth(
        np.array(rebuilt["azimuth"][1:]) - np.array(original["azimuth"])
    )
    np.testing.assert_allclose(azimuth_diff, 0.0, atol=1e-6)


@pytest.mark.parametrize("span_length", [0.0, -10.0, float("nan"), None])
def test_compute_start_from_next_support_rejects_invalid_span_length(
    span_length,
):
    with pytest.raises(ValueError, match="spanLength"):
        compute_start_from_next_support(
            {
                "latitude": 45.0,
                "longitude": 5.0,
                "nextSpanAzimuth": 170.0,
                "spanLength": span_length,
                "lineAngle": [3.0, -5.0],
            }
        )
