# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from mechaphlowers import BalanceEngine, PlotEngine
from stellar_engine.entities.output import get_coordinates

def add_obstacles(inputs: dict, balance_engine: BalanceEngine, plot_engine: PlotEngine):
    get_coordinates_result = get_coordinates(
        balance_engine, plot_engine, False, 0, len(balance_engine.section_array.data) - 1
    )
    print(inputs)
    print("eeeeeeeeeeeeeee")
    # {'uuid': 'a029fc13-6682-4587-8db6-45a442a5b019',
    # 'supportUuid': '40d3d38e-683e-412a-a1c5-aafaa7773d59',
    # 'name': 'obstacle_mock',
    # 'type': 'House',
    # 'altitudeType': 'absolute',
    # 'lateralDistanceType': 'SPAN_AXIS',
    # 'referenceSupport': 'LEFT',
    # 'positions': [{'x': 0, 'y': 0, 'z': 0}]
    # }
    plot_engine.position_engine.add_obstacles()
    # if hasattr(plot_engine.position_engine, "obstacle_array"):
    #     plot_engine.position_engine.obstacles_array.add_obstacle(
    #         name=inputs['name'],
    #         coords=
    #         span_index=,
    #         object_type=inputs["type"],
    #         support_reference=inputs["referenceSupport"].toLowerCase(),
    #         span_length=,
    #     )
    get_coordinates_result["obstacles"] = [
        {"name": "obstacle_mock", "points": [[80, 20, 0]]}
    ]
    result = {
        "current": get_coordinates_result,
    }
    obstacles_dict = plot_engine.obstacles_dict()
    return None

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