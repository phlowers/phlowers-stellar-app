# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging

import numpy as np
from pyproj import Geod, Proj, Transformer

from stellar_engine.entities.inputs import (
    Lambert93Data,
    SectionGeoData,
)

logger = logging.getLogger("stellar_engine")


# define here the source coordinate system (e.g., WGS84 for GPS) and the target coordinate system (e.g., Lambert93)
# Note: internal system is in WGS84 (EPSG:4326) for GPS coordinates
SOURCE_CRS = "EPSG:2154"  # lambert93
TARGET_CRS = "EPSG:2154"  # Lambert93
INTERNAL_CRS = "EPSG:4326"  # WGS84 for GPS coordinates


def import_lambert(inputs: dict) -> dict:
    """Convert Lambert93 coordinates to GPS decimal degrees and derive
    the azimuth using pyproj instead of mechaphlowers.

    Both the coordinate conversion and the azimuth are geodesic (WGS84
    ellipsoid), so they are valid anywhere on the globe. The reported azimuth
    is the geodesic azimuth converted to the flat-plane (Lambert93 grid)
    azimuth by removing the meridian convergence, so it matches the flat
    convention referenced by the application.

    Expected ``inputs`` dict (parsed as :class:`Lambert93Data`, extra keys
    ignored)::

        {
            "lambert_x": list[float],  # easting, one per point
            "lambert_y": list[float],  # northing, one per point
        }

    Returns a dict::

        {
            "latitude": list[float],  # decimal degrees, size N
            "longitude": list[float],  # decimal degrees, size N
            "lambert_x": list[float],  # echoed input, size N
            "lambert_y": list[float],  # echoed input, size N
            "azimuth": list[float],  # flat-plane azimuth (deg), size N-1
        }
    """

    lambert_data = Lambert93Data.from_dict(inputs)
    lambert_x = np.array(lambert_data.lambert_x, dtype=np.float64)
    lambert_y = np.array(lambert_data.lambert_y, dtype=np.float64)

    longitude, latitude = lambert93_to_gps(lambert_x, lambert_y)

    # Geodesic azimuth between consecutive points (clockwise from true north).
    geodesic_azimuth = geodesic_azimuth_from_gps(longitude, latitude)

    # Convert to the flat-plane (Lambert93 grid) azimuth by removing the
    # meridian convergence at each origin point.
    flat_azimuth = grid_azimuth_from_gps_azimuth(
        longitude, latitude, geodesic_azimuth
    )

    return {
        "latitude": latitude.tolist(),
        "longitude": longitude.tolist(),
        "lambert_x": lambert_data.lambert_x,
        "lambert_y": lambert_data.lambert_y,
        "azimuth": flat_azimuth.tolist(),
    }


def import_lambert_and_validate(inputs: dict) -> dict:
    """Validate the Lambert93 import using pyproj.

    The flat approximation is performed directly in GPS: each subsequent point
    is reconstructed geodesically from the previous one, using the input span
    length and the geodesic azimuth. This is valid anywhere on the globe. The
    reconstructed points are compared against the directly converted
    Lambert93 -> GPS points.

    Expected ``inputs`` dict, combining :class:`Lambert93Data` and
    :class:`SectionGeoData` fields (extra keys ignored). ``startLatitude`` and
    ``startLongitude`` are not expected from the caller: they are derived
    internally from the direct Lambert93 -> GPS conversion. Among the remaining
    :class:`SectionGeoData` fields, only ``spanLength`` is used here::

        {
            "lambert_x": list[float],  # easting, one per point (N)
            "lambert_y": list[float],  # northing, one per point (N)
            "startAzimuth": float,  # flat-plane azimuth (deg), required but unused
            "spanLength": list[float],  # span length (m), size N (last unused)
            "lineAngle": list[
                float
            ],  # flat deflection angle (deg), required but unused
        }

    Returns a dict::

        {
            "localization": dict,  # same structure as import_lambert() output
            "meanGpsDiffMeter": float,  # mean reconstruction error, in meters
        }
    """

    result_loc = import_lambert(inputs)
    # Derive the start point internally so callers don't have to supply
    # startLatitude/startLongitude, which are required by SectionGeoData.
    inputs["startLatitude"] = result_loc["latitude"][0]
    inputs["startLongitude"] = result_loc["longitude"][0]

    section_data = SectionGeoData.from_dict(inputs)

    latitude = np.array(result_loc["latitude"], dtype=np.float64)
    longitude = np.array(result_loc["longitude"], dtype=np.float64)

    # Geodesic azimuth between consecutive points, used for reconstruction.
    geodesic_azimuth = geodesic_azimuth_from_gps(longitude, latitude)

    # Span lengths, dropping the trailing NaN (unused last span).
    span_length = np.array(section_data.spanLength, dtype=np.float64)[
        : geodesic_azimuth.size
    ]

    # Geodesic computation in GPS: reconstruct each next point geodesically from
    # the previous one using the input span length and the geodesic azimuth.
    reconstructed_lon, reconstructed_lat = forward_gps_reconstruction(
        latitude[:-1], longitude[:-1], geodesic_azimuth, span_length
    )

    lat_diff, lon_diff, dist_diff_meter, mean_gps_diff_meter = compute_errors(
        latitude, longitude, reconstructed_lon, reconstructed_lat
    )
    logger.debug(f"Mean GPS difference (meter): {mean_gps_diff_meter}")
    logger.debug(f"azimuth geodesic: {geodesic_azimuth}")
    logger.debug(f"Latitude difference: {lat_diff}")
    logger.debug(f"Longitude difference: {lon_diff}")
    logger.debug(
        f"error norm in meter (0.01 decdeg = 1.11 km): {dist_diff_meter}"
    )

    return {
        "localization": result_loc,
        "meanGpsDiffMeter": mean_gps_diff_meter,
    }


def compute_localization(inputs: SectionGeoData) -> dict:
    """Compute section localization from flat geometry using pyproj.

    The section geometry is described by flat span lengths and flat line
    (deflection) angles. Starting from the given GPS point and azimuth, each
    subsequent support is reconstructed geodesically (WGS84 ellipsoid), so the
    computation is valid anywhere on the globe.

    Azimuths follow the flat-plane (Lambert93 grid) convention: the accumulated
    grid azimuth is converted to a geodesic azimuth by adding the meridian
    convergence before each geodesic step, mirroring
    :func:`import_lambert` which removes it.

    Expects an already-built :class:`SectionGeoData`::

        SectionGeoData(
            startLatitude=float,  # decimal degrees
            startLongitude=float,  # decimal degrees
            startAzimuth=float,  # flat-plane azimuth (deg), at start point
            spanLength=list[float],  # span length (m), size N (last unused)
            lineAngle=list[float],  # flat deflection angle (deg), size N (last unused)
        )

    Returns a dict::

        {
            "latitude": list[float],  # decimal degrees, size N
            "longitude": list[float],  # decimal degrees, size N
            "lambert_x": list[float],  # easting, size N
            "lambert_y": list[float],  # northing, size N
            "azimuth": list[float],  # flat-plane azimuth (deg), size N-1
        }
    """

    geo_inputs = (
        SectionGeoData.from_dict(inputs)
        if isinstance(inputs, dict)
        else inputs
    )

    span_length = np.array(geo_inputs.spanLength, dtype=np.float64)
    line_angle = np.array(geo_inputs.lineAngle, dtype=np.float64)
    supports_number = span_length.size

    latitude = np.empty(supports_number, dtype=np.float64)
    longitude = np.empty(supports_number, dtype=np.float64)
    latitude[0] = geo_inputs.startLatitude
    longitude[0] = geo_inputs.startLongitude

    # Grid (flat-plane) azimuth of each span, clockwise from grid north.
    grid_azimuth = np.empty(supports_number - 1, dtype=np.float64)
    current_azimuth = float(geo_inputs.startAzimuth)
    for span_index in range(supports_number - 1):
        # Flat deflection applied at the current support (clockwise positive).
        current_azimuth += line_angle[span_index]
        grid_azimuth[span_index] = current_azimuth

        geodesic_azimuth = gps_azimuth_from_grid_azimuth(
            longitude[span_index],
            latitude[span_index],
            current_azimuth,
        )

        longitude[span_index + 1], latitude[span_index + 1] = (
            forward_gps_reconstruction(
                latitude[span_index],
                longitude[span_index],
                geodesic_azimuth,
                span_length[span_index],
            )
        )

    lambert_x, lambert_y = gps_to_lambert93(latitude, longitude)

    return {
        "latitude": latitude.tolist(),
        "longitude": longitude.tolist(),
        "lambert_x": np.atleast_1d(lambert_x).tolist(),
        "lambert_y": np.atleast_1d(lambert_y).tolist(),
        "azimuth": grid_azimuth.tolist(),
    }


# ---------------- helper Functions ----------------


def compute_errors(latitude, longitude, reconstructed_lon, reconstructed_lat):
    geod = Geod(ellps="WGS84")
    lat_orig = np.atleast_1d(latitude[1:])
    lon_orig = np.atleast_1d(longitude[1:])
    lat_recon = np.atleast_1d(reconstructed_lat)
    lon_recon = np.atleast_1d(reconstructed_lon)

    _, _, dist_diff_meter = geod.inv(lon_orig, lat_orig, lon_recon, lat_recon)
    dist_diff_meter = np.atleast_1d(dist_diff_meter)

    lat_diff = abs(lat_recon - lat_orig)
    lon_diff = abs(lon_recon - lon_orig)
    mean_gps_diff = float(np.mean(dist_diff_meter))
    return lat_diff, lon_diff, dist_diff_meter, mean_gps_diff


def meridian_convergence(longitude, latitude):
    proj = Proj(TARGET_CRS)
    longitude, latitude = np.broadcast_arrays(longitude, latitude)
    return np.array(
        [
            proj.get_factors(lon, lat).meridian_convergence
            for lon, lat in zip(longitude.flat, latitude.flat)
        ]
    ).reshape(longitude.shape)


def gps_azimuth_from_grid_azimuth(longitude, latitude, grid_azimuth):
    convergence = meridian_convergence(longitude, latitude)
    return grid_azimuth + convergence


def grid_azimuth_from_gps_azimuth(longitude, latitude, geodesic_azimuth):
    convergence = meridian_convergence(longitude[:-1], latitude[:-1])
    return geodesic_azimuth - convergence


def gps_to_lambert93(latitude, longitude):
    # GPS (EPSG:4326 lon/lat) -> Lambert93 (EPSG:2154).
    transformer = Transformer.from_crs(
        INTERNAL_CRS, TARGET_CRS, always_xy=True
    )
    lambert_x, lambert_y = transformer.transform(longitude, latitude)
    return lambert_x, lambert_y


def lambert93_to_gps(lambert_x, lambert_y):
    # EPSG:2154 (Lambert93) -> EPSG:4326 (WGS84 lon/lat)
    transformer = Transformer.from_crs(
        TARGET_CRS, INTERNAL_CRS, always_xy=True
    )
    longitude, latitude = transformer.transform(lambert_x, lambert_y)
    longitude = np.atleast_1d(np.asarray(longitude, dtype=np.float64))
    latitude = np.atleast_1d(np.asarray(latitude, dtype=np.float64))
    return longitude, latitude


def forward_gps_reconstruction(
    latitude, longitude, geodesic_azimuth, span_length
):
    geod = Geod(ellps="WGS84")
    reconstructed_lon, reconstructed_lat, _ = geod.fwd(
        longitude, latitude, geodesic_azimuth, span_length
    )
    return reconstructed_lon, reconstructed_lat


def geodesic_azimuth_from_gps(longitude, latitude):
    geod = Geod(ellps="WGS84")
    geodesic_azimuth, _, _ = geod.inv(
        longitude[:-1], latitude[:-1], longitude[1:], latitude[1:]
    )
    geodesic_azimuth = np.atleast_1d(geodesic_azimuth)
    return geodesic_azimuth


# -------------------- old ------------------------
# def compute_localization(inputs: dict) -> dict:
#     geo_inputs = SectionGeoData(**inputs)

#     section_array = build_section_array_dist_angles(
#         geo_inputs.spanLength, geo_inputs.lineAngle
#     )
#     section_array.angle_direction = "clockwise"

#     section_array.set_starting_gps(
#         latitude_0=geo_inputs.startLatitude,
#         longitude_0=geo_inputs.startLongitude,
#         azimuth_0=geo_inputs.startAzimuth,
#         azimuth_direction="clockwise",
#     )
#     latitude, longitude = section_array.get_gps()
#     lambert_x, lambert_y = section_array.get_lambert93()
#     azimuth = section_array.get_azimuth(
#         unit="deg", output_direction="clockwise"
#     )
#     return {
#         "latitude": latitude.tolist(),
#         "longitude": longitude.tolist(),
#         "lambert_x": lambert_x.tolist(),
#         "lambert_y": lambert_y.tolist(),
#         "azimuth": azimuth.tolist(),
#     }


# def build_section_array_dist_angles(
#     span_length: list, line_angle: list
# ) -> SectionArray:
#     # length = supports or span?
#     supports_number = len(span_length)  # + 1
#     zero_array = np.zeros(supports_number)
#     name = []
#     suspension = []
#     for support_index in range(supports_number):
#         name.append(str(support_index))
#         if support_index == 0 or support_index == supports_number - 1:
#             suspension.append(False)
#         else:
#             suspension.append(True)
#     section_array = SectionArray(
#         pd.DataFrame(
#             {
#                 "name": name,
#                 "suspension": suspension,
#                 "conductor_attachment_altitude": zero_array.copy(),
#                 "crossarm_length": zero_array.copy(),
#                 "line_angle": line_angle,
#                 "insulator_length": np.ones(supports_number),
#                 "span_length": span_length,
#                 "insulator_mass": zero_array.copy(),
#             }
#         ),
#         # put default values to avoid warnings, parameter and temperature unused for localization
#         sagging_parameter=2000,
#         sagging_temperature=15,
#     )
#     return section_array


# def import_lambert(inputs: dict) -> dict:
#     lambert_data = Lambert93Data.from_dict(inputs)
#     latitude, longitude = lambert93_to_gps(
#         np.array(lambert_data.lambert_x), np.array(lambert_data.lambert_y)
#     )
#     azimuth = get_azimuth_from_gps(latitude, longitude, unit="deg")
#     # convert from [0, 360] to [-180, 180]
#     azimuth_pi_minus_pi = np.where(azimuth <= 180, azimuth, azimuth - 360)
#     # convert from anticlockwise to clockwise
#     azimuth_clockwise = -azimuth_pi_minus_pi
#     return {
#         "latitude": latitude.tolist(),
#         "longitude": longitude.tolist(),
#         "lambert_x": lambert_data.lambert_x,
#         "lambert_y": lambert_data.lambert_y,
#         "azimuth": azimuth_clockwise.tolist(),
#     }


# def import_lambert_and_validate(inputs: dict):
#     result_loc = import_lambert(inputs)
#     # Compare results with section data
#     section_data = SectionGeoData.from_dict(inputs)
#     geolocator = GeoLocator()
#     geolocator.set_starting_gps(
#         section_data.startLatitude,
#         section_data.startLongitude,
#         section_data.startAzimuth,
#     )
#     lat_section_data, lon_section_data = geolocator.get_gps(
#         np.array(section_data.lineAngle),
#         np.array(section_data.spanLength),
#     )

#     # Compute the mean difference between the two gps coordinates
#     lat_diff = abs(np.array(result_loc["latitude"]) - lat_section_data)
#     lon_diff = abs(np.array(result_loc["longitude"]) - lon_section_data)
#     dist_diff = np.linalg.norm([lat_diff, lon_diff], axis=0)
#     mean_gps_diff = np.mean(dist_diff)

#     print(f"azimuth : {result_loc['azimuth']}")

#     logger.debug(
#         f"Latitude difference between imported Lambert and section data: {lat_diff}"
#     )
#     logger.debug(
#         f"Longitude difference between imported Lambert and section data: {lon_diff}"
#     )

#     return {"localization": result_loc, "meanGpsDiff": mean_gps_diff}
