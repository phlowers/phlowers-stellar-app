# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from typing import Literal

from mechaphlowers import BalanceEngine, PlotEngine
from mechaphlowers.entities.arrays import ObstacleArray
import numpy as np
import pandas as pd


def change_obstacles_coordinates(df: pd.DataFrame, balance_engine: BalanceEngine):
    if df.empty:
        return df

    span_index = df['span_index'].iloc[0]
    span_length = balance_engine.section_array.data.span_length

    x = df['x'].to_numpy(copy=True, dtype=np.float64)
    z = df['z'].to_numpy(copy=True, dtype=np.float64)
    lat = df['lateral_distance_type'].to_numpy()
    alt = df['altitude_type'].to_numpy()

    mask_x = lat == "span_axis"
    x[mask_x] = span_length[span_index] - x[mask_x]

    mask_z = alt == "support_foot_relative"
    z[mask_z] += balance_engine.section_array.data.conductor_attachment_altitude[span_index]


    df['x'] = x
    df['z'] = z
    return df

def add_obstacles(inputs: list, balance_engine: BalanceEngine, plot_engine: PlotEngine):
    rows = []
    for obstacle in inputs:
        for i, pos in enumerate(obstacle['positions']):
            
            rows.append({
                "name": obstacle['uuid'],
                "point_index": i,
                "span_index": obstacle['supportIndex'],
                "altitude_type": obstacle['altitudeType'],
                "lateral_distance_type": obstacle['lateralDistanceType'],
                "x": pos['x'],
                "y": pos['y'],
                "z": pos['z'],
                "object_type": obstacle['type'],
            })

    df = pd.DataFrame(rows)
    df = change_obstacles_coordinates(df, balance_engine)
    plot_engine.add_obstacles(ObstacleArray(df))

    obs = plot_engine.obstacles_dict()
    result = [{"uuid": key, "points": value.tolist()} for key, value in obs.items()]
    print(f"Obstacles after addition: {result}")
    return {"obstacles": result}

def compute_distances(inputs: dict):
    result = [
        {
            "obstacleUuid": "obstacle_mock",
            "points": [
                {
                    "pointIndex": 0,
                    "linePoint": [87.13, -8.2, 12.76],
                    "virtualPointHorizontal": [87.13, -8.2, 0],
                    "virtualPointVertical": [80, 20, 12.76],
                    "distanceDiagonal": 234,
                    "distanceHorizontal": 555,
                    "distanceVertical": 666,
                }
            ],
        }
    ]
    return result