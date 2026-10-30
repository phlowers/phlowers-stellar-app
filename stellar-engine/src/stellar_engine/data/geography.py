# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging

import numpy as np
from mechaphlowers import units
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
    """Import Lambert93 points as GPS and validate them against the flat geometry.

    The Lambert93 points are converted to GPS with :func:`import_lambert`, whose
    ``azimuth`` is kept as the localization azimuth. The GPS points are then
    checked by :func:`validate_gps_positions`, which derives the start azimuth
    from the first span and the first line angle, and reports the position
    error of each support.

    Expected ``inputs`` dict (extra keys ignored)::

        {
            "lambert_x": list[float],  # easting, one per point (N)
            "lambert_y": list[float],  # northing, one per point (N)
            "spanLength": list[float],  # span length (m), size N (last unused)
            "lineAngle": list[float],  # flat deflection angle (grad), size N
        }

    A ``startAzimuth`` key may still be passed by callers: it is ignored, the
    start azimuth being derived from the imported points.

    Returns a dict::

        {
            "localization": dict,  # same structure as import_lambert() output
            "startAzimuth": float,  # flat azimuth (deg) before the deflection at the first support, in ]-180, 180]
            "positionErrorMeter": list[
                float
            ],  # distance (m) between each given and rebuilt support, size N, first is 0.0
        }

    ``startAzimuth`` is the value to feed back to :func:`compute_localization`,
    which adds ``lineAngle[0]`` to it: ``azimuth[0] == startAzimuth + lineAngle[0]``
    (modulo 360).
    """

    result_loc = import_lambert(inputs)
    validation = validate_gps_positions(
        {
            "latitude": result_loc["latitude"],
            "longitude": result_loc["longitude"],
            "spanLength": inputs["spanLength"],
            "lineAngle": inputs["lineAngle"],
        }
    )

    return {
        "localization": result_loc,
        "startAzimuth": validation["startAzimuth"],
        "positionErrorMeter": validation["positionErrorMeter"],
    }


def validate_gps_positions(inputs: dict) -> dict:
    """Check GPS support positions against the flat section geometry using pyproj.

    The grid azimuth of each span is derived from the GPS points, with the same
    convention as :func:`import_lambert`. The start azimuth is then deduced from
    the first span azimuth and the first line angle, and the section is rebuilt
    with :func:`compute_localization` from the first GPS point. The geodesic
    distance between each given support and its rebuilt counterpart is reported:
    a small error means that the GPS points, span lengths and line angles are
    consistent with each other.

    Expected ``inputs`` dict::

        {
            "latitude": list[float],  # decimal degrees, size N
            "longitude": list[float],  # decimal degrees, size N
            "spanLength": list[
                float
            ],  # span length (m), size N (last unused, may be NaN or None)
            "lineAngle": list[
                float
            ],  # flat deflection angle (grad), size N, None is treated as 0
        }

    Returns a dict::

        {
            "azimuth": list[
                float
            ],  # flat-plane (grid) azimuth (deg) of each span, size N-1
            "startAzimuth": float,  # flat azimuth (deg) before the deflection at the first support, in ]-180, 180]
            "positionErrorMeter": list[
                float
            ],  # distance (m) between each given and rebuilt support, size N, first is 0.0
        }

    With fewer than two points there is no span: ``azimuth`` is empty,
    ``startAzimuth`` is None and ``positionErrorMeter`` is ``[0.0] * N``.
    """
    latitude = np.asarray(inputs["latitude"], dtype=np.float64)
    longitude = np.asarray(inputs["longitude"], dtype=np.float64)
    supports_number = latitude.size
    if supports_number < 2:
        return {
            "azimuth": [],
            "startAzimuth": None,
            "positionErrorMeter": [0.0] * supports_number,
        }

    span_length = np.array(
        [np.nan if value is None else value for value in inputs["spanLength"]],
        dtype=np.float64,
    )
    line_angle = np.array(
        [0.0 if value is None else value for value in inputs["lineAngle"]],
        dtype=np.float64,
    )
    if (
        span_length.size != supports_number
        or line_angle.size != supports_number
    ):
        raise ValueError(
            "spanLength and lineAngle must have the same length as latitude"
        )

    # Same grid azimuth convention as import_lambert.
    geodesic_azimuth = geodesic_azimuth_from_gps(longitude, latitude)
    grid_azimuth = grid_azimuth_from_gps_azimuth(
        longitude, latitude, geodesic_azimuth
    )

    first_line_angle_deg = (
        units(float(line_angle[0]), "grad").to("deg").magnitude
    )
    start_azimuth = _normalize_azimuth(
        float(grid_azimuth[0]) - first_line_angle_deg
    )

    rebuilt = compute_localization(
        {
            "startLatitude": float(latitude[0]),
            "startLongitude": float(longitude[0]),
            "startAzimuth": start_azimuth,
            "spanLength": span_length.tolist(),
            "lineAngle": line_angle.tolist(),
        }
    )

    geod = Geod(ellps="WGS84")
    _, _, position_error_meter = geod.inv(
        longitude,
        latitude,
        np.array(rebuilt["longitude"], dtype=np.float64),
        np.array(rebuilt["latitude"], dtype=np.float64),
    )
    logger.debug(f"GPS position error (meter): {position_error_meter}")

    return {
        "azimuth": grid_azimuth.tolist(),
        "startAzimuth": start_azimuth,
        "positionErrorMeter": np.atleast_1d(position_error_meter).tolist(),
    }


def compute_localization(inputs: dict) -> dict:
    """Compute section localization from flat geometry using pyproj.

    The section geometry is described by flat span lengths and flat line
    (deflection) angles. Starting from the given GPS point and azimuth, each
    subsequent support is reconstructed geodesically (WGS84 ellipsoid), so the
    computation is valid anywhere on the globe.

    Azimuths follow the flat-plane (Lambert93 grid) convention: the accumulated
    grid azimuth is converted to a geodesic azimuth by adding the meridian
    convergence before each geodesic step, mirroring
    :func:`import_lambert` which removes it.

    Expects a dict which can be converted to :class:`SectionGeoData`::

        SectionGeoData(
            startLatitude=float,  # decimal degrees
            startLongitude=float,  # decimal degrees
            startAzimuth=float,  # flat-plane azimuth (deg), at start point
            spanLength=list[float],  # span length (m), size N (last unused)
            lineAngle=list[float],  # flat deflection angle (grad), size N
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

    geo_inputs = SectionGeoData.from_dict(inputs)

    span_length = np.array(geo_inputs.spanLength, dtype=np.float64)
    line_angle = (
        units(np.array(geo_inputs.lineAngle, dtype=np.float64), "grad")
        .to("deg")
        .magnitude
    )
    supports_number = span_length.size

    latitude = np.empty(supports_number, dtype=np.float64)
    longitude = np.empty(supports_number, dtype=np.float64)
    latitude[0] = geo_inputs.startLatitude
    longitude[0] = geo_inputs.startLongitude

    # Grid (flat-plane) azimuth of each span, clockwise from grid north.
    grid_azimuth = np.empty(supports_number - 1, dtype=np.float64)
    current_azimuth = float(geo_inputs.startAzimuth)
    for span_index in range(supports_number - 1):
        # do not add the line angle of the first support
        if span_index != 0:
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


def compute_start_from_next_support(inputs: dict) -> dict:
    """Compute the new first support when a support is inserted before a section.

    Used when a new support is inserted before support 0 of a section: the old
    support 0 becomes support 1 and keeps its GPS position. This function finds
    the GPS position of the new support 0 and the new section start azimuth, so
    that the old supports do not move when the section is rebuilt with
    :func:`compute_localization`.

    The grid azimuth of the new first span is deduced from the azimuth of the
    next span and the deflection angle at support 1. The new support 0 is first
    estimated by a geodesic step back from support 1, then refined by a
    fixed-point iteration (at most 10 iterations, stopping when the miss is
    below 1e-4 m) so that a forward reconstruction from support 0 lands on
    support 1.

    Expected ``inputs`` dict::

        {
            "latitude": float,  # decimal degrees, GPS latitude of support 1 (known point)
            "longitude": float,  # decimal degrees, GPS longitude of support 1 (known point)
            "nextSpanAzimuth": float,  # flat-plane (grid) azimuth (deg) of span 1, from support 1 to support 2
            "spanLength": float,  # length (m) of the new span 0, from the new support 0 to support 1
            "lineAngle": list[
                float
            ],  # two flat deflection angles (grad): [at new support 0, at support 1]
        }

    Returns a dict::

        {
            "latitude": float,  # decimal degrees, GPS latitude of the new support 0
            "longitude": float,  # decimal degrees, GPS longitude of the new support 0
            "startAzimuth": float,  # flat azimuth (deg) before the deflection at the new support 0, in ]-180, 180]
        }

    Raises:
        ValueError: if ``spanLength`` is missing, not finite or not strictly
            positive, or if ``lineAngle`` does not contain two values.
    """
    raw_span_length = inputs.get("spanLength")
    try:
        span_length = float(raw_span_length)
    except (TypeError, ValueError):
        span_length = float("nan")
    if not np.isfinite(span_length) or span_length <= 0.0:
        raise ValueError(
            "spanLength must be a finite and strictly positive length in "
            f"meters, got {raw_span_length!r}"
        )

    line_angle = [float(value) for value in inputs["lineAngle"]]
    if len(line_angle) != 2:
        raise ValueError("lineAngle must contain exactly two values")

    latitude = float(inputs["latitude"])
    longitude = float(inputs["longitude"])
    next_span_azimuth = float(inputs["nextSpanAzimuth"])

    # Span 1 azimuth = span 0 azimuth + deflection at support 1.
    new_span_azimuth = (
        next_span_azimuth - units(line_angle[1], "grad").to("deg").magnitude
    )

    geod = Geod(ellps="WGS84")
    # First estimate: step back from support 1 over the new span length.
    back_geodesic_azimuth = gps_azimuth_from_grid_azimuth(
        longitude, latitude, new_span_azimuth + 180.0
    )
    new_lon, new_lat, _ = geod.fwd(
        longitude, latitude, float(back_geodesic_azimuth), span_length
    )

    # Fixed-point refinement: rebuild support 1 from the estimate exactly as
    # compute_localization does, then move the estimate by the miss vector.
    max_iterations = 10
    miss_tolerance_meter = 1e-4
    for _ in range(max_iterations):
        geodesic_azimuth = gps_azimuth_from_grid_azimuth(
            new_lon, new_lat, new_span_azimuth
        )
        rebuilt_lon, rebuilt_lat, _ = geod.fwd(
            new_lon, new_lat, float(geodesic_azimuth), span_length
        )
        miss_azimuth, _, miss_distance = geod.inv(
            rebuilt_lon, rebuilt_lat, longitude, latitude
        )
        if miss_distance < miss_tolerance_meter:
            break
        new_lon, new_lat, _ = geod.fwd(
            new_lon, new_lat, float(miss_azimuth), float(miss_distance)
        )

    # Seems weird: I don't think the first line_angle should be factored in
    start_azimuth = _normalize_azimuth(
        new_span_azimuth - units(line_angle[0], "grad").to("deg").magnitude
    )

    return {
        "latitude": float(new_lat),
        "longitude": float(new_lon),
        "startAzimuth": start_azimuth,
    }


# ---------------- helper Functions ----------------


def _normalize_azimuth(angle_deg):
    """Map an angle (deg) or an array of angles to the interval ]-180, 180]."""
    wrapped = np.mod(np.asarray(angle_deg, dtype=np.float64), 360.0)
    wrapped = np.where(wrapped > 180.0, wrapped - 360.0, wrapped)
    if wrapped.ndim == 0:
        return float(wrapped)
    return wrapped


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


def convert_coordinates(inputs: dict) -> dict:
    """Convert coordinates between any two coordinate reference systems.

    Axis order is always (x, y) = (longitude/easting, latitude/northing).
    NaN inputs stay NaN. Empty lists are allowed.

    Expected ``inputs`` dict::

        {
            "sourceCrs": str,  # e.g. "EPSG:4326"
            "targetCrs": str,  # e.g. "EPSG:2154"
            "x": list[float],
            "y": list[float],
        }

    Returns a dict ``{"x": list[float], "y": list[float]}``.
    """
    x = np.asarray(inputs["x"], dtype=np.float64)
    y = np.asarray(inputs["y"], dtype=np.float64)
    if x.shape != y.shape:
        raise ValueError("x and y must have the same length")
    if x.size == 0:
        return {"x": [], "y": []}

    transformer = Transformer.from_crs(
        inputs["sourceCrs"], inputs["targetCrs"], always_xy=True
    )
    out_x, out_y = transformer.transform(x, y)
    out_x = np.atleast_1d(np.asarray(out_x, dtype=np.float64))
    out_y = np.atleast_1d(np.asarray(out_y, dtype=np.float64))
    # pyproj may return inf for invalid points: normalise to NaN
    out_x[~np.isfinite(out_x)] = np.nan
    out_y[~np.isfinite(out_y)] = np.nan
    return {"x": out_x.tolist(), "y": out_y.tolist()}


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
