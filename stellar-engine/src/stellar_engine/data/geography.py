# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import numpy as np
from mechaphlowers import (
    GeoLocator,
    SectionArray,
    get_azimuth_from_gps,
    lambert93_to_gps,
)

from stellar_engine.entities.inputs import (
    Lambert93Data,
    SectionGeoData,
    StartingGps,
)


def compute_localization(inputs: dict, section_array: SectionArray) -> dict:
    starting_gps_inputs = StartingGps(**inputs)
    section_array.set_starting_gps(
        latitude_0=starting_gps_inputs.startLatitude,
        longitude_0=starting_gps_inputs.startLongitude,
        azimuth_0=starting_gps_inputs.startAzimuth,
    )
    latitude, longitude = section_array.get_gps()
    lambert_x, lambert_y = section_array.get_lambert93()
    azimuth = section_array.get_azimuth(unit="deg")
    return {
        "latitude": latitude.tolist(),
        "longitude": longitude.tolist(),
        "lambert_x": lambert_x.tolist(),
        "lambert_y": lambert_y.tolist(),
        "azimuth": azimuth.tolist(),
    }


def import_lambert(inputs: dict) -> dict:
    lambert_data = Lambert93Data.from_dict(inputs)
    latitude, longitude = lambert93_to_gps(
        np.array(lambert_data.x), np.array(lambert_data.y)
    )
    azimuth = get_azimuth_from_gps(latitude, longitude, unit="deg")

    return {
        "latitude": latitude.tolist(),
        "longitude": longitude.tolist(),
        "lambert_x": lambert_data.x,
        "lambert_y": lambert_data.y,
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
        np.array(section_data.lineAngles),
        np.array(section_data.spanLengths),
    )

    # Compute the mean difference between the two gps coordinates
    lat_diff = abs(np.array(result_loc["latitude"]) - lat_section_data)
    lon_diff = abs(np.array(result_loc["longitude"]) - lon_section_data)
    dist_diff = np.linalg.norm([lat_diff, lon_diff], axis=0)
    mean_gps_diff = np.mean(dist_diff)

    return {"localization": result_loc, "mean_gps_diff": mean_gps_diff}
