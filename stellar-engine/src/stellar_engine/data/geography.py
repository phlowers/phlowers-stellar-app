# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

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

    return {
        "latitude": latitude.tolist(),
        "longitude": longitude.tolist(),
        "lambert_x": lambert_data.lambert_x,
        "lambert_y": lambert_data.lambert_y,
        "azimuth": azimuth.tolist(),
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

    return {"localization": result_loc, "meanGpsDiff": mean_gps_diff}
