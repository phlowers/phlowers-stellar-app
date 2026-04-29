# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging
import time
from typing import Literal

import numpy as np
import pandas as pd
from mechaphlowers import BalanceEngine, PlotEngine
from mechaphlowers.core.geometry.distances import DistanceResult
from mechaphlowers.entities.arrays import ObstacleArray

logger = logging.getLogger(__name__)


def change_obstacles_coordinates(
    df: pd.DataFrame, balance_engine: BalanceEngine
):
    if df.empty:
        logger.warning("No obstacles to process. Returning empty DataFrame.")
        return df

    span_index = df['span_index'].to_numpy(copy=True, dtype=np.int64)
    # span_length = balance_engine.section_array.data.span_length

    x = df['x'].to_numpy(copy=True, dtype=np.float64)
    z = df['z'].to_numpy(copy=True, dtype=np.float64)
    # lat = df['lateral_distance_type'].to_numpy()
    alt = df['altitude_type'].to_numpy()
    ref_support = df['ref_support'].to_numpy()

    mask_x = ref_support == "RIGHT"
    span_index[mask_x] = span_index[mask_x] + 1

    span_length = balance_engine.section_array.data.span_length.to_numpy()[
        span_index
    ]
    x[mask_x] = span_length[mask_x] - x[mask_x]

    # not used for the moment but could be useful in the future
    mask_z = alt == "attachment_relative"
    altitudes = balance_engine.section_array.data.conductor_attachment_altitude.to_numpy()[
        span_index
    ]
    z[mask_z] += altitudes[mask_z]

    mask_z = alt == "relative"
    altitudes = balance_engine.section_array.data.ground_altitude.to_numpy()[
        span_index
    ]
    z[mask_z] += altitudes[mask_z]

    df['x'] = x
    df['z'] = z
    return df


def get_current_obstacles(
    plot_engine: PlotEngine, project: bool, support_index: int
) -> list:
    obs = plot_engine.obstacles_dict(
        project=project, frame_index=support_index
    )
    return [
        {"uuid": key, "points": value.tolist()} for key, value in obs.items()
    ]


def delete_obstacle(
    uuid: str, plot_engine: PlotEngine, project: bool, support_index: int
) -> Literal["success"]:
    logger.debug(f"Deleting obstacle with uuid: {uuid}")
    try:
        del plot_engine.position_engine.obstacles_array._data[uuid]
        logger.debug("Successfully deleted obstacle.")
    except KeyError:
        logger.warning(f"Obstacle with uuid: {uuid} not found.")
    finally:
        result = get_current_obstacles(
            plot_engine, project=project, support_index=support_index
        )
        logger.debug(f"Current obstacles after deletion attempt: {result}")
        return {"obstacles": result}


def add_obstacles(
    inputs: list,
    balance_engine: BalanceEngine,
    plot_engine: PlotEngine,
    project: bool,
    support_index: int,
):
    logger.debug(f"Received obstacles: {inputs}")

    rows = []
    for obstacle in inputs:
        for i, pos in enumerate(obstacle['positions']):
            rows.append(
                {
                    "name": obstacle['uuid'],
                    "point_index": i,
                    "span_index": obstacle['supportIndex'],
                    "altitude_type": obstacle['altitudeType'],
                    "lateral_distance_type": obstacle['lateralDistanceType'],
                    "x": pos['x'],
                    "y": pos['y'],
                    "z": pos['z'],
                    "object_type": obstacle['type'],
                    "ref_support": obstacle['referenceSupport'],
                }
            )

    if not rows:
        # logger.debug(
        #     "No obstacle positions to register — clearing all obstacles."
        # )
        # Bug: clear() is not a method of pd.DataFrame
        # Don't know what was the expected behaviour here
        # plot_engine.position_engine.obstacles_array._data.clear()
        return {"obstacles": []}

    df = pd.DataFrame(rows)
    df = change_obstacles_coordinates(df, balance_engine)
    plot_engine.add_obstacles(ObstacleArray(df))

    result = get_current_obstacles(
        plot_engine, project=project, support_index=support_index
    )
    logger.debug(f"Obstacles after addition: {result}")
    return {"obstacles": result}


def compute_distances(
    inputs: dict, plot_engine: PlotEngine, project: bool, support_index: int
):
    logger.debug(f"Received inputs for distance computation: {inputs}")
    points_for_plot = plot_engine.position_engine.get_points_for_plot()
    result = []

    for obstacle in plot_engine.position_engine.obstacles_array.data.to_dict(
        orient="records"
    ):
        span_index = obstacle["span_index"]
        plot_engine.position_engine.distance_engine.add_curves(
            curve_points=points_for_plot[0].coords[span_index]
        )
        points_for_plot[1].coords[obstacle["span_index"]]
        sea_level_groud_coords_start = (
            plot_engine.position_engine.section_pts.supports_ground_coords[
                span_index
            ].copy()
        )
        sea_level_groud_coords_end = (
            plot_engine.position_engine.section_pts.supports_ground_coords[
                span_index + 1
            ].copy()
        )
        sea_level_groud_coords_start[2] = 0.0
        sea_level_groud_coords_end[2] = 0.0

        plot_engine.position_engine.distance_engine.add_span_frame(
            x_axis_start=sea_level_groud_coords_start,
            x_axis_end=sea_level_groud_coords_end,
        )
        # Compute the distance from a point to the curve
        try:
            distance_result: DistanceResult = (
                plot_engine.position_engine.distance_engine.plane_distance(
                    np.array([obstacle['x'], obstacle['y'], obstacle['z']])
                )
            )
            u_proj, v_proj = distance_result.projection_points(
                distance_result.point_base
            )
            result.append(
                {
                    "obstacleUuid": obstacle["name"],
                    "points": [
                        {
                            "pointIndex": obstacle["point_index"],
                            "linePoint": distance_result.point_target.tolist(),
                            "virtualPointHorizontal": u_proj.tolist(),
                            "virtualPointVertical": v_proj.tolist(),
                            "distanceDiagonal": distance_result.distance_3d,
                            "distanceHorizontal": distance_result.distance_projection_u,
                            "distanceVertical": distance_result.distance_projection_v,
                        }
                    ],
                }
            )

        except ValueError as e:
            logger.error(
                f"Error computing distance for obstacle {obstacle['name']}: {e}"
            )
            result.append(
                {
                    "obstacleUuid": obstacle["name"],
                    "points": [
                        {
                            "pointIndex": obstacle["point_index"],
                            "linePoint": [],
                            "virtualPointHorizontal": [],
                            "virtualPointVertical": [],
                            "distanceDiagonal": [],
                            "distanceHorizontal": [],
                            "distanceVertical": [],
                        }
                    ],
                }
            )
            continue
    return result
