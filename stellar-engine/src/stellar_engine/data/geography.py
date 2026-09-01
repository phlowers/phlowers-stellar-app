# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging

import numpy as np
import pandas as pd
from mechaphlowers import (
    GeoLocator,
    SectionArray,
    get_azimuth_from_gps,
    lambert93_to_gps,
)

from stellar_engine.entities.inputs import (
    Lambert93Data,
    SectionGeoData,
)

logger = logging.getLogger("stellar_engine")


def compute_localization(inputs: dict) -> dict:
    geo_inputs = SectionGeoData(**inputs)

    section_array = build_section_array_dist_angles(
        geo_inputs.spanLength, geo_inputs.lineAngle
    )
    section_array.angle_direction = "clockwise"

    section_array.set_starting_gps(
        latitude_0=geo_inputs.startLatitude,
        longitude_0=geo_inputs.startLongitude,
        azimuth_0=geo_inputs.startAzimuth,
        azimuth_direction="clockwise",
    )
    latitude, longitude = section_array.get_gps()
    lambert_x, lambert_y = section_array.get_lambert93()
    azimuth = section_array.get_azimuth(
        unit="deg", output_direction="clockwise"
    )
    return {
        "latitude": latitude.tolist(),
        "longitude": longitude.tolist(),
        "lambert_x": lambert_x.tolist(),
        "lambert_y": lambert_y.tolist(),
        "azimuth": azimuth.tolist(),
    }


def build_section_array_dist_angles(
    span_length: list, line_angle: list
) -> SectionArray:
    # length = supports or span?
    supports_number = len(span_length)  # + 1
    zero_array = np.zeros(supports_number)
    name = []
    suspension = []
    for support_index in range(supports_number):
        name.append(str(support_index))
        if support_index == 0 or support_index == supports_number - 1:
            suspension.append(False)
        else:
            suspension.append(True)
    section_array = SectionArray(
        pd.DataFrame(
            {
                "name": name,
                "suspension": suspension,
                "conductor_attachment_altitude": zero_array.copy(),
                "crossarm_length": zero_array.copy(),
                "line_angle": line_angle,
                "insulator_length": np.ones(supports_number),
                "span_length": span_length,
                "insulator_mass": zero_array.copy(),
            }
        ),
        # put default values to avoid warnings, parameter and temperature unused for localization
        sagging_parameter=2000,
        sagging_temperature=15,
    )
    return section_array


def import_lambert(inputs: dict) -> dict:
    lambert_data = Lambert93Data.from_dict(inputs)
    latitude, longitude = lambert93_to_gps(
        np.array(lambert_data.lambert_x), np.array(lambert_data.lambert_y)
    )
    azimuth = get_azimuth_from_gps(latitude, longitude, unit="deg")
    # convert from [0, 360] to [-180, 180]
    azimuth_pi_minus_pi = np.where(azimuth <= 180, azimuth, azimuth - 360)
    # convert from anticlockwise to clockwise
    azimuth_clockwise = -azimuth_pi_minus_pi
    return {
        "latitude": latitude.tolist(),
        "longitude": longitude.tolist(),
        "lambert_x": lambert_data.lambert_x,
        "lambert_y": lambert_data.lambert_y,
        "azimuth": azimuth_clockwise.tolist(),
    }


def import_lambert_and_validate(inputs: dict):
    result_loc = import_lambert(inputs)
    # Compare results with section data
    section_data = SectionGeoData.from_dict(inputs)
    geolocator = GeoLocator()
    geolocator.set_starting_gps(
        section_data.startLatitude,
        section_data.startLongitude,
        section_data.startAzimuth,
    )
    lat_section_data, lon_section_data = geolocator.get_gps(
        np.array(section_data.lineAngle),
        np.array(section_data.spanLength),
    )

    # Compute the mean difference between the two gps coordinates
    lat_diff = abs(np.array(result_loc["latitude"]) - lat_section_data)
    lon_diff = abs(np.array(result_loc["longitude"]) - lon_section_data)
    dist_diff = np.linalg.norm([lat_diff, lon_diff], axis=0)
    mean_gps_diff = np.mean(dist_diff)

    print(f"azimuth : {result_loc['azimuth']}")

    logger.debug(
        f"Latitude difference between imported Lambert and section data: {lat_diff}"
    )
    logger.debug(
        f"Longitude difference between imported Lambert and section data: {lon_diff}"
    )

    return {"localization": result_loc, "meanGpsDiff": mean_gps_diff}


def import_lambert_pyproj_poc(inputs: dict) -> dict:
    """POC: convert Lambert93 coordinates to GPS decimal degrees and derive
    the azimuth using pyproj instead of mechaphlowers.

    Both the coordinate conversion and the azimuth are geodesic (WGS84
    ellipsoid), so they are valid anywhere on the globe. The reported azimuth
    is the geodesic bearing converted to the flat-plane (Lambert93 grid)
    azimuth by removing the meridian convergence, so it matches the flat
    convention referenced by the application.
    """
    from pyproj import Geod, Proj, Transformer

    lambert_data = Lambert93Data.from_dict(inputs)
    lambert_x = np.array(lambert_data.lambert_x, dtype=np.float64)
    lambert_y = np.array(lambert_data.lambert_y, dtype=np.float64)

    # EPSG:2154 (Lambert93) -> EPSG:4326 (WGS84 lon/lat)
    transformer = Transformer.from_crs(
        "EPSG:2154", "EPSG:4326", always_xy=True
    )
    longitude, latitude = transformer.transform(lambert_x, lambert_y)
    longitude = np.atleast_1d(np.asarray(longitude, dtype=np.float64))
    latitude = np.atleast_1d(np.asarray(latitude, dtype=np.float64))

    # Geodesic bearing between consecutive points (clockwise from true north).
    geod = Geod(ellps="WGS84")
    geodesic_azimuth, _, _ = geod.inv(
        longitude[:-1], latitude[:-1], longitude[1:], latitude[1:]
    )
    geodesic_azimuth = np.atleast_1d(geodesic_azimuth)

    # Convert to the flat-plane (Lambert93 grid) azimuth by removing the
    # meridian convergence at each origin point.
    proj = Proj("EPSG:2154")
    convergence = np.array(
        [
            proj.get_factors(lon, lat).meridian_convergence
            for lon, lat in zip(longitude[:-1], latitude[:-1])
        ]
    )
    flat_azimuth = geodesic_azimuth - convergence

    return {
        "latitude": latitude.tolist(),
        "longitude": longitude.tolist(),
        "lambert_x": lambert_data.lambert_x,
        "lambert_y": lambert_data.lambert_y,
        "azimuth": flat_azimuth.tolist(),
    }


def import_lambert_and_validate_pyproj_poc(inputs: dict) -> dict:
    """POC replacement for :func:`import_lambert_and_validate` using pyproj.

    The flat approximation is performed directly in GPS: each subsequent point
    is reconstructed geodesically from the previous one, using the input span
    length and the geodesic azimuth. This is valid anywhere on the globe. The
    reconstructed points are compared against the directly converted
    Lambert93 -> GPS points.
    """
    from pyproj import Geod

    result_loc = import_lambert_pyproj_poc(inputs)
    section_data = SectionGeoData.from_dict(inputs)

    latitude = np.array(result_loc["latitude"], dtype=np.float64)
    longitude = np.array(result_loc["longitude"], dtype=np.float64)

    # Geodesic bearing between consecutive points, used for reconstruction.
    geod = Geod(ellps="WGS84")
    geodesic_azimuth, _, _ = geod.inv(
        longitude[:-1], latitude[:-1], longitude[1:], latitude[1:]
    )
    geodesic_azimuth = np.atleast_1d(geodesic_azimuth)

    # Span lengths, dropping the trailing NaN (unused last span).
    span_length = np.array(section_data.spanLength, dtype=np.float64)[
        : geodesic_azimuth.size
    ]

    # Flat approximation in GPS: reconstruct each next point geodesically from
    # the previous one using the input span length and the geodesic azimuth.
    reconstructed_lon, reconstructed_lat, _ = geod.fwd(
        longitude[:-1], latitude[:-1], geodesic_azimuth, span_length
    )

    lat_diff = abs(np.atleast_1d(reconstructed_lat) - latitude[1:])
    lon_diff = abs(np.atleast_1d(reconstructed_lon) - longitude[1:])
    dist_diff = np.linalg.norm([lat_diff, lon_diff], axis=0)
    mean_gps_diff = float(np.mean(dist_diff))

    return {
        "localization": result_loc,
        "meanGpsDiff": mean_gps_diff,
        "azimuth": result_loc["azimuth"],
    }
