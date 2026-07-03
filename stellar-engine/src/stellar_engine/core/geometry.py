# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging

import numpy as np
from mechaphlowers import SectionStudy

from stellar_engine.entities.inputs import get_points_from_context

logger = logging.getLogger("stellar_engine")


# {
#     'points': [
#         {
#             'uuid': 'ba7f38bd-daf3-43c6-80db-1720e54adfd5',
#             'supportUuid': '48a5c129-c9bd-4f93-95df-144686f96916',
#             'supportIndex': 0,
#             'name': 'aaa',
#             'type': 'distance_measurement_points',
#             'altitudeType': 'absolute',
#             'lateralDistanceType': 'SPAN_AXIS',
#             'referenceSupport': 'LEFT',
#             'positions': [
# {'x': 10, 'y': 10, 'z': 10},
# {'x': 20, 'y': 20, 'z': 20},
# {'x': 30, 'y': 30, 'z': 30},
#             ],
#         },
#     ],
#     ],
#     'startSupport': 0,
#     'endSupport': 1,
#     'view': '3d',
# }


def measure_distance_angle(
    inputs: dict,
    study: SectionStudy,
    support_index: int,
) -> dict:
    """Measure distance between two points"""

    _, coords = get_points_from_context(
        inputs, study, support_index, key_object="points"
    )

    if coords.shape[0] < 2 or coords.shape[0] > 3:
        raise ValueError(
            f"Expected 2 or 3 points for distance measurement, but got {coords.shape[0]}."
        )

    vector_2_1 = coords[0] - coords[1]
    vector_2_3 = coords[2] - coords[1] if coords.shape[0] == 3 else None

    distance_1_2 = np.linalg.norm(vector_2_1)
    distance_2_3 = (
        np.linalg.norm(vector_2_3) if vector_2_3 is not None else None
    )

    angle_1_2_3 = (
        np.arccos(
            np.clip(
                np.dot(vector_2_3, vector_2_1)
                / (np.linalg.norm(vector_2_1) * np.linalg.norm(vector_2_3)),
                -1.0,
                1.0,
            )
        )
        * (180 / np.pi)
        if vector_2_3 is not None
        else None
    )

    return {
        "distance_1_2": distance_1_2,
        "distance_2_3": distance_2_3,
        "angle_1_2_3": angle_1_2_3,
    }


def add_measure_distance_angle_points(
    inputs: dict,
    study: SectionStudy,
    support_index: int,
) -> dict:
    """Add distance/angle measurement points to the study's position engine."""

    my_object, coords = get_points_from_context(inputs, study, support_index)

    study.position_engine.add_additional_point(
        name="angle_distance_measurement",
        span_index=my_object['supportIndex'],
        coords=coords,
        # object_type=my_object['type'],
        support_reference=my_object['engineReferenceSupport'],
        span_length=study.balance_engine.section_array.data.span_length.to_numpy(),
    )
    return {"success": True}


def clear_measure_distance_angle_points(
    study: SectionStudy,
) -> dict:
    """Clear all distance/angle measurement points from the study's position engine."""
    logger.debug("Clearing measurement points.")

    for o in (
        study.position_engine.get_group_points()
        .additional_points.dict_coords()
        .keys()
    ):
        study.position_engine.delete_additional_point(o)

    return {"success": True}
