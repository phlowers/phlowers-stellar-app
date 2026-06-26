# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import logging

import numpy as np
from mechaphlowers import SectionStudy, units
from mechaphlowers.core.geometry.distances import DistanceResult
from mechaphlowers.utils import ArrayTools

from stellar_engine.entities.errors import GeneratedPointsNoneError
from stellar_engine.utils import get_section_middle_span

logger = logging.getLogger("stellar_engine")


def to_serializable(obj):
    """Recursively convert numpy types and custom objects to JSON-serializable Python types."""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, DistanceResult):
        return {
            "point_base": obj.point_base.tolist(),
            "point_target": obj.point_target.tolist(),
            "distance_3d": float(obj.distance_3d),
            "distance_projection_u": float(obj.signed_distance_projection_u),
            "distance_projection_v": float(obj.signed_distance_projection_v),
            "u_plane": obj.u_plane.tolist(),
            "v_plane": obj.v_plane.tolist(),
        }
    elif isinstance(obj, dict):
        return {
            int(k) if hasattr(k, 'item') else k: to_serializable(v)
            for k, v in obj.items()
        }
    elif isinstance(obj, list):
        return [to_serializable(item) for item in obj]
    elif hasattr(obj, 'item'):
        return obj.item()
    return obj


# TODO: ideally, we want to separate [generating GroupPoints] and [change frame/fetch data]
def get_coordinates(
    study: SectionStudy,
    project: bool = False,
    start_support: int = 0,
    end_support: int = 0,
):
    base_group_points = study.position_engine.get_group_points()
    # maybe split this in other functions
    # -------function 1: project and invert axis-----------
    middle_span = get_section_middle_span(start_support, end_support)

    if project:
        projected_group_points = base_group_points.change_frame(
            frame_index=middle_span
        )

        span, supports, insulators = (
            projected_group_points.spans,
            projected_group_points.supports,
            projected_group_points.insulators,
        )
        obstacles = projected_group_points.obstacles
        distances = projected_group_points.distances

    else:
        span, supports, insulators = (
            base_group_points.spans,
            base_group_points.supports,
            base_group_points.insulators,
        )
        obstacles = base_group_points.obstacles
        distances = base_group_points.distances
    # -------function 2: get data-----------
    vtl_under_chain = list(
        study.balance_engine.balance_model.vhl_under_chain().vhl
    )
    vtl_under_console = list(
        study.balance_engine.balance_model.vhl_under_console().vhl
    )

    loads_coords: dict = study.position_engine.get_loads_coords(
        project=project, frame_index=middle_span
    )
    # # TODO: temporary solution to inverse y waiting fix in mechaphlowers
    # loads_coords = {k: [v[0], -v[1], v[2]] for k, v in loads_coords.items()}

    line_angle_rad = (
        study.balance_engine.section_array.data.line_angle.to_numpy()
    )
    tension_max, _ = study.balance_engine.span_model.tensions_sup_inf()
    utilization_rate = study.balance_engine.cable_array.utilization_rate(
        tension_max
    )
    logger.debug("utilization rate: %s", utilization_rate)

    result = get_exchange_studio(
        study,
        span,
        supports,
        insulators,
        obstacles,
        distances,
        vtl_under_chain,
        vtl_under_console,
        loads_coords,
        line_angle_rad,
        utilization_rate,
    )

    # Build structured obstacles and distances for the frontend renderer
    result["obstacles_formatted"] = format_obstacles_for_plot(obstacles)
    result["distances_formatted"] = format_distances_for_plot(distances)

    return result


def format_obstacles_for_plot(obstacles):
    """Convert SparsePoints dict_coords to frontend array format: [{ uuid, points }]."""
    if obstacles is None:
        return []
    return [
        {"uuid": key, "points": value.tolist()}
        for key, value in obstacles.dict_coords().items()
    ]


def format_distances_for_plot(distances):
    """Convert dict[str, dict[int, DistanceResult]] to frontend Distance[] format with virtual points.

    GroupPoints.distances has the structure: {obstacle_name: {point_index: DistanceResult}}.
    This function transforms it to the frontend format:
    [{ obstacleUuid, points: [{ pointIndex, linePoint, virtualPointHorizontal, ... }] }]
    """
    if not distances:
        return []
    result = []
    for obstacle_name, point_distances in distances.items():
        points = []
        for point_index, dist_result in point_distances.items():
            try:
                u_proj, v_proj = dist_result.projection_points(
                    dist_result.point_base
                )
                points.append(
                    {
                        "pointIndex": int(point_index),
                        "linePoint": dist_result.point_target.tolist(),
                        "virtualPointHorizontal": u_proj.tolist(),
                        "virtualPointVertical": v_proj.tolist(),
                        "distanceDiagonal": dist_result.distance_3d,
                        "distanceHorizontal": dist_result.distance_projection_u,
                        "distanceVertical": dist_result.distance_projection_v,
                    }
                )
            except (ValueError, AttributeError) as e:
                logger.error(
                    "Error formatting distance for obstacle %s point %s: %s",
                    obstacle_name,
                    point_index,
                    e,
                )
        if points:
            result.append(
                {
                    "obstacleUuid": obstacle_name,
                    "points": points,
                }
            )
    return result


def get_exchange_studio(
    study,
    span,
    supports,
    insulators,
    obstacles,
    distances,
    vtl_under_chain,
    vtl_under_console,
    loads_coords,
    line_angle_rad,
    utilization_rate,
):
    if span is None:
        raise GeneratedPointsNoneError(
            "Span data is None. Cannot proceed with coordinate extraction."
        )
    if supports is None:
        raise GeneratedPointsNoneError(
            "Supports data is None. Cannot proceed with coordinate extraction."
        )
    if insulators is None:
        raise GeneratedPointsNoneError(
            "Insulators data is None. Cannot proceed with coordinate extraction."
        )
    if obstacles is None:
        logger.debug(
            "Obstacles data is None. Proceeding without obstacle coordinates."
        )
    if distances is None:
        logger.debug(
            "Distances data is None. Proceeding without distance coordinates."
        )

    result = {
        "coords": {
            "spans": to_serializable(span.coords),
            "supports": to_serializable(supports.coords),
            "insulators": to_serializable(insulators.coords),
            "obstacles": to_serializable(obstacles.dict_coords())
            if obstacles is not None
            else None,
            "distances": to_serializable(distances)
            if distances is not None
            else None,
            "loads": to_serializable(loads_coords),
        },
        "output_parameters": {
            "line_angle": units(line_angle_rad, "rad").to("grad").m.tolist(),
            "vtl_under_chain": [v.value().tolist() for v in vtl_under_chain],
            "vtl_under_console": [
                v.value().tolist() for v in vtl_under_console
            ],
            "r_under_chain": study.balance_engine.balance_model.vhl_under_chain()
            .R.value()
            .tolist(),
            "r_under_console": study.balance_engine.balance_model.vhl_under_console()
            .R.value()
            .tolist(),
            "ground_altitude": study.balance_engine.section_array.data.ground_altitude.tolist(),
            "displacement": study.balance_engine.get_displacement().T.tolist(),
            "load_angle": study.balance_engine.cable_loads.load_angle.tolist(),
            "span_length": study.balance_engine.section_array.data.span_length.tolist(),
            "loads_coords": to_serializable(loads_coords),
            "utilization_rate": ArrayTools.decr(utilization_rate.tolist()),
        },
    }
    result_spans = study.balance_engine.get_data_spans()
    result["output_parameters"].update(result_spans)
    return result
