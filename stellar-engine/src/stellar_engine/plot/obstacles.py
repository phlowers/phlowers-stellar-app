# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging

from mechaphlowers import SectionStudy
from mechaphlowers.core.geometry.group_points import GroupPoints

from stellar_engine.entities.inputs import get_points_from_context

logger = logging.getLogger("stellar_engine")


# TODO: probably more to have GroupPoints as argument instead of plot_engine
def get_current_obstacles(
    group_points: GroupPoints, project: bool, support_index: int
) -> list:
    # duplicated code with get_coordinates
    group_points
    if project:
        projected_group_points = group_points.change_frame(
            frame_index=support_index
        )
        coord_dict = projected_group_points.get_all_objects_dict(
            reversed_y_axis=project
        )
        obs = coord_dict["obstacles"].dict_coords()
    else:
        obs = group_points.obstacles.dict_coords()
    return [
        {"uuid": key, "points": value.tolist()} for key, value in obs.items()
    ]


# ---------------------------Obstacles management----------------


def delete_obstacle(
    uuid: str, study: SectionStudy, project: bool, support_index: int
) -> dict:
    logger.debug(f"Deleting obstacle with uuid: {uuid}")
    try:
        study.position_engine.delete_obstacle(uuid)
        logger.debug("Successfully deleted obstacle.")
    except KeyError:
        logger.warning(f"Obstacle with uuid: {uuid} not found.")
    finally:
        result = get_current_obstacles(
            study.position_engine.get_group_points(),
            project=project,
            support_index=support_index,
        )
        logger.debug(f"Current obstacles after deletion attempt: {result}")
        return {"obstacles": result}


# TODO: refactor the way it is called in typescript
# use PositionEngine.add_obstacle instead of PositionEngine.add_obstacle_array

# {
#     'obstacles': [
#         {
#             'uuid': 'ba7f38bd-daf3-43c6-80db-1720e54adfd5',
#             'supportUuid': '48a5c129-c9bd-4f93-95df-144686f96916',
#             'supportIndex': 0,
#             'name': 'aaa',
#             'type': 'accessible_building',
#             'altitudeType': 'absolute',
#             'lateralDistanceType': 'SPAN_AXIS',
#             'referenceSupport': 'LEFT',
#             'positions': [{'x': 10, 'y': 10, 'z': 10}],
#         },
#         {
#             'uuid': 'ba7f38bd-daf3-43c6-80db-1720e54adfd5',
#             'supportUuid': '48a5c129-c9bd-4f93-95df-144686f96916',
#             'supportIndex': 0,
#             'name': 'aaa',
#             'type': 'accessible_building',
#             'altitudeType': 'absolute',
#             'lateralDistanceType': 'SPAN_AXIS',
#             'referenceSupport': 'LEFT',
#             'positions': [{'x': 10, 'y': 10, 'z': 10}],
#         }
#     ],
#     ],
#     'startSupport': 0,
#     'endSupport': 1,
#     'view': '3d',
# }


def add_single_obstacle(
    inputs: dict,
    study: SectionStudy,
    support_index: int,
):
    # check there is a single obstacle
    my_obstacle, coords = get_points_from_context(
        inputs, study, support_index, key_object="obstacles"
    )

    study.position_engine.add_obstacle(
        name=my_obstacle['uuid'],
        span_index=my_obstacle['supportIndex'],
        coords=coords,
        object_type=my_obstacle['type'],
        support_reference=my_obstacle['engineReferenceSupport'],
        span_length=study.balance_engine.section_array.data.span_length.to_numpy(),
    )
    return True


# {'obstacles': [{'uuid': 'ba7f38bd-daf3-43c6-80db-1720e54adfd5', 'supportUuid': '48a5c129-c9bd-4f93-95df-144686f96916', 'supportIndex': 0, 'name': 'aaa', 'type': 'accessible_building', 'altitudeType': 'absolute', 'lateralDistanceType': 'SPAN_AXIS', 'referenceSupport': 'LEFT', 'positions': [{'x': 10, 'y': 10, 'z': 10}]}, {'uuid': '92b4d347-2577-4a83-b747-f292356c99ed', 'supportUuid': '48a5c129-c9bd-4f93-95df-144686f96916', 'supportIndex': 0, 'name': 'zzz', 'type': 'accessible_building', 'altitudeType': 'relative_cable', 'lateralDistanceType': 'SPAN_AXIS', 'referenceSupport': 'LEFT', 'positions': [{'x': 1, 'y': 1, 'z': 1}, {'x': 2, 'y': 2, 'z': 2}]}], 'startSupport': 0, 'endSupport': 1, 'view': '3d'}


def add_bulk_obstacles(
    inputs: dict,
    study: SectionStudy,
):
    for o in inputs['obstacles']:
        add_single_obstacle(
            inputs={'obstacles': [o]},
            study=study,
            support_index=o['supportIndex'],
        )
    return True


def clear_obstacles(
    study: SectionStudy,
    project: bool,
    support_index: int,
):
    logger.debug("Clearing all obstacles.")

    for o in (
        study.position_engine.get_group_points().obstacles.dict_coords().keys()
    ):
        study.position_engine.delete_obstacle(o)

    logger.debug(
        "All obstacles cleared. Obstacles after clearing: {}".format(
            get_current_obstacles(
                study.position_engine.get_group_points(),
                project=project,
                support_index=support_index,
            )
        )
    )

    return {"success": True}
