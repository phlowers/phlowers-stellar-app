# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Ground-profile interpolation for forest-trenches conformity."""

import math

import numpy as np
from mechaphlowers import SectionStudy

from stellar_engine.entities.errors import (
    ConformityInputError,
    SupportOutOfRangeError,
)


def slice_ground(python_inputs: dict, study: SectionStudy) -> dict:
    """Interpolate a span's ground profile at evenly spaced distances."""
    span_index = python_inputs.get("spanIndex")
    if not isinstance(span_index, int) or isinstance(span_index, bool):
        raise ConformityInputError("spanIndex must be an integer")

    n_points = python_inputs.get("nPoints")
    if (
        not isinstance(n_points, int)
        or isinstance(n_points, bool)
        or n_points < 2
    ):
        raise ConformityInputError("nPoints must be an integer greater than 1")

    reference_support = python_inputs.get("referenceSupport")
    if reference_support not in ("LEFT", "RIGHT"):
        raise ConformityInputError(
            "referenceSupport must be 'LEFT' or 'RIGHT'"
        )

    floor_points = python_inputs.get("floorPoints")
    if not isinstance(floor_points, list):
        raise ConformityInputError("floorPoints must be an array")

    group_points = study.position_engine.get_group_points()
    supports = group_points.supports.coords[:, 0, :]
    if not 0 <= span_index < len(supports) - 1:
        raise SupportOutOfRangeError(
            f"Support index {span_index} out of range for the section"
        )

    left_support = supports[span_index]
    right_support = supports[span_index + 1]
    length = float(np.linalg.norm(right_support[:2] - left_support[:2]))
    distances = np.linspace(0, length, n_points)

    ground_profile: list[tuple[float, float]] = []
    for point in floor_points:
        if point is None:
            continue
        if not isinstance(point, dict):
            raise ConformityInputError("floorPoints entries must be objects")
        distance = point.get("distance")
        altitude = point.get("altitude")
        if distance is None or altitude is None:
            continue
        if (
            not isinstance(distance, (int, float))
            or isinstance(distance, bool)
            or not math.isfinite(distance)
            or not isinstance(altitude, (int, float))
            or isinstance(altitude, bool)
            or not math.isfinite(altitude)
        ):
            raise ConformityInputError(
                "floorPoints distance and altitude must be finite numbers"
            )
        distance_from_left = (
            float(distance)
            if reference_support == "LEFT"
            else length - float(distance)
        )
        ground_profile.append((distance_from_left, float(altitude)))

    if ground_profile:
        ground_profile.sort(key=lambda point: point[0])
        profile_distances, altitudes = zip(*ground_profile)
    else:
        profile_distances = (0.0, length)
        altitudes = (float(left_support[2]), float(right_support[2]))

    interpolated_altitudes = np.interp(distances, profile_distances, altitudes)
    return {
        "distances": distances.tolist(),
        "altitudes": interpolated_altitudes.tolist(),
        "length": length,
    }
