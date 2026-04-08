# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from mechaphlowers import BalanceEngine, PlotEngine
from mechaphlowers.entities.arrays import ObstacleArray
import pandas as pd

def add_obstacles(inputs: list, balance_engine: BalanceEngine, plot_engine: PlotEngine):
    rows = []
    for obstacle in inputs:
        for i, pos in enumerate(obstacle['positions']):
            rows.append({
                "name": obstacle['uuid'],
                "point_index": i,
                "span_index": obstacle['supportIndex'],
                "x": pos['x'],
                "y": pos['y'],
                "z": pos['z'],
                "object_type": obstacle['type'],
            })

    plot_engine.add_obstacles(ObstacleArray(pd.DataFrame(rows)))

    obs = plot_engine.obstacles_dict()
    return {"obstacles": [{"uuid": key, "points": value.tolist()} for key, value in obs.items()]}

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