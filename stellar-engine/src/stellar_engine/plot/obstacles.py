# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from copy import deepcopy
import logging

from mechaphlowers import SectionStudy
from mechaphlowers.core.geometry.group_points import GroupPoints
from mechaphlowers.core.geometry.distances import DistanceEngine

import numpy as np
from stellar_engine.entities.errors import ObstacleNotFoundError
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


# ---------------------------Conformity----------------

# data example for conformity computation
# {
#     "obstacle": {
#         "uuid": "05176a6c-4726-4488-8b2a-418551510254",
#         "name": "aaa",
#         "type": "non_accessible_structure",
#         "altitudeType": "absolute",
#         "lateralDistanceType": "SPAN_AXIS",
#         "referenceSupport": "LEFT",
#         "allPositions": [
#             {
#                 "x": 30,
#                 "y": 20,
#                 "z": 30
#             }
#         ],
#         "activePoint": {
#             "x": 30,
#             "y": 20,
#             "z": 30
#         }
#     },
#     "electricTension": "400 KV",
#     "form": {
#         "windZone": "200",
#         "windPressure": 200,
#         "windMinus": false,
#         "redZonePresence": false,
#         "repartitionTemperature": 70,
#         "lateralDistanceTemperature": 68,
#         "selectedConformityRules": [
#             "RULE_1",
#             "RULE_2"
#         ]
#     },
#     "rulesClimaticConditions": [
#         {
#             "ruleType": "RULE_1",
#             "ruleName": "RULE_1",
#             "lateralPoint": {
#                 "temperature": 17,
#                 "pressure": "WindZoneInput",
#                 "red_zone": false
#             },
#             "overhangPoint": {
#                 "temperature": null,
#                 "pressure": 0,
#                 "red_zone": false
#             }
#         },
#         {
#             "ruleType": "RULE_2",
#             "ruleName": "RULE_2",
#             "lateralPoint": {
#                 "temperature": 68,
#                 "pressure": "WindZoneInput",
#                 "red_zone": true
#             },
#             "overhangPoint": {
#                 "temperature": null,
#                 "pressure": 0,
#                 "red_zone": false
#             }
#         }
#     ],
#     "rulesDistances": [
#         {
#             "ruleType": "RULE_1",
#             "lateral": {
#                 "63": 0.6,
#                 "90": 0.7,
#                 "150": 0.8,
#                 "225": 0.9,
#                 "400": 1
#             },
#             "overhang": {
#                 "63": 1.1,
#                 "90": 1.2,
#                 "150": 1.3,
#                 "225": 1.4,
#                 "400": 1.5
#             }
#         },
#         {
#             "ruleType": "RULE_2",
#             "lateral": {
#                 "63": 1.6,
#                 "90": 1.7,
#                 "150": 1.8,
#                 "225": 1.9,
#                 "400": 2
#             },
#             "overhang": {
#                 "63": 2.1,
#                 "90": 2.2,
#                 "150": 2.3,
#                 "225": 2.4,
#                 "400": 2.5
#             }
#         }
#     ]
# }

MAP_ELECTRIC_TENSION = {
    "63 KV": '63',
    "90 KV": '90',
    "150 KV": '150',
    "225 KV": '225',
    "400 KV": '400',
}


def build_scenario(
    rule: dict,
    conformity_point: str,
    temperature_key: str,
    parameters: dict,
    security_distance: float,
) -> dict:
    point = rule[f"{conformity_point}Point"]
    default_temperature = parameters.get(temperature_key)

    return {
        "rule_type": rule["ruleType"],
        "conformity_rule": rule["ruleName"],
        "conformity_point": conformity_point,
        "security_distance": security_distance,
        "target_state": {
            "new_temperature": (
                point["temperature"]
                if point["temperature"] is not None
                else default_temperature
            ),
            "wind_pressure": (
                point["pressure"]
                if point["pressure"] != "WindZoneInput"
                else parameters.get("windPressure")
            ),
        },
    }


def build_scenarios(rules_climatic_conditions: list, parameters: dict, tension_rules: dict) -> list:
    scenarios = []

    for rule in rules_climatic_conditions:
        tension_rules_distance = tension_rules.get(rule["ruleType"])

        if tension_rules_distance is None:
            logger.debug(f"No tension rules found for rule type: {rule['ruleType']}. Skipping this rule.")
            return scenarios  # Return early if no tension rules are found for the current rule type
        
        if tension_rules_distance.get("lateral") is None:
            logger.debug(f"Missing lateral or overhang tension rules for rule type: {rule['ruleType']}. Skipping this rule.")
            continue
        else:
            scenarios.append(
                build_scenario(
                    rule=rule,
                    conformity_point="lateral",
                    temperature_key="lateralDistanceTemperature",
                    parameters=parameters,
                    security_distance=tension_rules_distance.get("lateral")
                )
            )
        if tension_rules_distance.get("overhang") is None:
            logger.debug(f"Missing overhang tension rules for rule type: {rule['ruleType']}. Skipping this rule.")
            continue
        else:
            scenarios.append(
                build_scenario(
                    rule=rule,
                    conformity_point="overhang",
                    temperature_key="repartitionTemperature",
                    parameters=parameters,
                    security_distance=tension_rules_distance.get("overhang")
                )
            )

    return scenarios


def point_coordinates_in_plane(
    point: np.ndarray,
    plane_origin: np.ndarray,
    u_plane: np.ndarray,
    v_plane: np.ndarray,
) -> tuple[float, float]:
    relative_point = point - plane_origin

    return (
        float(np.dot(relative_point, u_plane)),
        float(np.dot(relative_point, v_plane)),
    )

    # point = np.asarray(point)
    # if point.shape != (3,):
    #     raise ValueError("point must be a 1D array of shape (3,)")

    #
    # return self.distance_engine.plane_distance(point, frame="section")


def get_conformity(python_inputs: dict, study: SectionStudy) -> dict:
    logger.debug(f"Getting conformity for inputs: {python_inputs}")
    obstacle_id = python_inputs.get("obstacle", {}).get("uuid")
    obstacle_support_index = python_inputs.get("obstacle", {}).get(
        "supportIndex"
    )
    electric_tension_code = python_inputs.get("electricTension")
    electric_tension = MAP_ELECTRIC_TENSION.get(electric_tension_code)
    rule_distances = python_inputs.get("rulesDistances")
    rules_climatic_conditions = python_inputs.get("rulesClimaticConditions")
    parameters = python_inputs.get("form", {})


    if rule_distances is None or rule_distances == []:
        logger.warning("No rule distances provided. Returning empty conformity result.")
        logger.warning("This should not happen, button should have been disabled.")
        return {}

    tension_rules = {
        i["ruleType"]: {
            'lateral': i["lateral"][electric_tension],
            'overhang': i["overhang"][electric_tension],
        }
        for i in rule_distances
    }

    scenarios = build_scenarios(rules_climatic_conditions, parameters, tension_rules)

    dist_engine = DistanceEngine()

    # play the scenarios to get the conformity result
    study_copy = deepcopy(study)
    ground_supports = study_copy.position_engine.coords_calculator.supports_ground_coords.copy()
    dist_engine.add_span_frame(
        ground_supports[obstacle_support_index],
        ground_supports[obstacle_support_index + 1],
    )

    try:
        obstacle_coords = study_copy.position_engine.coords_calculator.obstacles_points.dict_coords().get(
            obstacle_id
        )
    except KeyError:
        logger.error(f"Obstacle with uuid: {obstacle_id} not found in study.")
        raise ObstacleNotFoundError(
            f"Obstacle with uuid: {obstacle_id} not found in study."
        )

# output structure
# {
#   "obstacle": {
#     "name": "Obstacle",
#     "points": [
#       {
#         "x": 47.5,
#         "y": 9.5,
#         "radius": 0.0
#       }
#     ]
#   },
#   "zone":
#     {
#       "name": "AT",
#       "zonePoints": 
#         {
#           "UpperLeft": {
#             "x": 47.5,
#             "y": 9.5
#           },
#           "UpperRight": {
#             "x": 47.5,
#             "y": 17.0
#           },
#           "LowerRight": {
#             "x": 49.0,
#             "y": 17.0
#           },
#           "LowerLeft": {
#             "x": 49.0,
#             "y": 9.5
#           }
#         },
#         "points": [
#           {
#             "x": 47.5,
#             "y": 9.5,
#             "radius": 1.0
#           },
#           {
#             "x": 47.5,
#             "y": 17.0,
#             "radius": 1.0
#           },
#           {
#             "x": 49.0,
#             "y": 17.0,
#             "radius": 1.0
#           }
#         ],
#       },


    def point_template(point, radius=None):
        if radius is None:
            return {"x": point[0], "y": point[1]}
        return {"x": point[0], "y": point[1], "radius": radius}
    
    def zone_template(name):
        return {
                "zonePlot": {
                "zonePoints": [],
                "zoneBorder": [],
            },
                "points": []
            }
        
    
    if parameters.get("conformityPlot") == "cable_track":
        logger.debug("Conformity type is cable_track.")
        radius_function = lambda x: x

    else:
        logger.debug("Conformity type is not cable_track. Using default radius function.")
        radius_function = lambda x: 1.0 

    conformity_results = {
        "obstacle": {
            "name": obstacle_id,
            "points": []
        },
        "conformity": {i:zone_template(i) for i in tension_rules.keys()}
    }

    for scenario in scenarios:
        logger.debug(f"Processing scenario: {scenario}")
        
        # apply the scenario to the study copy
        study_copy.solve_change_state(
            wind_pressure=scenario["target_state"]["wind_pressure"],
            new_temperature=scenario["target_state"]["new_temperature"],
        )

        dist_engine.add_curves(
            study_copy.position_engine.coords_calculator.get_spans(
                frame="section"
            ).coords[obstacle_support_index]
        )

        dist_result = dist_engine.plane_distance(
            obstacle_coords[0], frame="section"
        )

        target_coords_in_plane = point_coordinates_in_plane(
            point=dist_result.point_target,
            plane_origin=np.array([0.0, 0.0, 0.0]),
            u_plane=dist_engine.u_plane,
            v_plane=dist_engine.v_plane,
        )

        conformity_results["conformity"][scenario["rule_type"]]["points"].append(
            point_template(target_coords_in_plane, radius=radius_function(scenario["security_distance"]))
        )
    
    conformity_results["obstacle"]["points"].append(
        point_template(
            point_coordinates_in_plane(
                point=obstacle_coords[0],
                plane_origin=np.array([0.0, 0.0, 0.0]),
                u_plane=dist_engine.u_plane,
                v_plane=dist_engine.v_plane,
            )
        )
    )

    if parameters.get("conformityPlot") != "cable_track":
        for zone_name , zone_values in conformity_results["conformity"].items():
            zone = zone_values["zonePlot"]
            max_x = max(p["x"] for p in conformity_results["conformity"][zone_name]["points"])
            min_x = min(p["x"] for p in conformity_results["conformity"][zone_name]["points"])
            max_y = max(p["y"] for p in conformity_results["conformity"][zone_name]["points"])
            min_y = min(p["y"] for p in conformity_results["conformity"][zone_name]["points"])

            max_x_zone = max_x + tension_rules[zone_name].get("lateral")
            min_x_zone = min_x - tension_rules[zone_name].get("lateral")
            max_y_zone = max_y + tension_rules[zone_name].get("overhang")
            min_y_zone = min_y - tension_rules[zone_name].get("overhang")

            conformity_results["conformity"][zone_name]["zonePlot"]["zonePoints"] = [
                {"UpperLeft": {"x": min_x_zone, "y": min_y_zone}},
                {"UpperRight": {"x": max_x_zone, "y": min_y_zone}},
                {"LowerRight": {"x": max_x_zone, "y": max_y_zone}},
                {"LowerLeft": {"x": min_x_zone, "y": max_y_zone}},
            ]

            if parameters.get("conformityPlot") == "overhang":
                conformity_results["conformity"][zone_name]["zonePlot"]["zoneBorder"] = [
                    {"x": max_x_zone, "y": max_y_zone}, # UpperRight
                    {"x": min_x_zone, "y": max_y_zone} # LowerRight
                ]
            if parameters.get("conformityPlot") == "vegetation":
                conformity_results["conformity"][zone_name]["zonePlot"]["zoneBorder"] = [
                    {"x": min_x_zone, "y": min_y_zone}, #UpperLeft
                    {"x": min_x_zone, "y": max_y_zone},  # LowerLeft
                    {"x": max_x_zone, "y": max_y_zone},  # LowerRight
                    {"x": max_x_zone, "y": min_y_zone}   # UpperRight 
                ]


    logger.debug(f"Conformity result: {conformity_results}")
    return conformity_results


def get_scenario_conformity(
    rule_distance,
    selected_conformity_rule,
    rules_climatic_conditions,
    study: SectionStudy,
) -> dict:
    # obstacle id to select obstacle in study
    # rule_distance(electric_tension) to get the security distance to add
    # selected_conformity_rule to get the conformity rule to apply
    # rules_climatic_conditions to get the climatic conditions to apply

    logger.debug(f"Getting scenario conformity for inputs: {python_inputs}")

    scenario_conformity_result = compute_conformity(python_inputs)
    logger.debug(f"Scenario conformity result: {scenario_conformity_result}")
    return scenario_conformity_result


def compute_conformity(python_inputs: dict):
    pass
