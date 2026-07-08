
# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from copy import deepcopy
from dataclasses import dataclass, field
import logging
from typing import Literal, Optional

import numpy as np
from mechaphlowers import SectionStudy
from mechaphlowers.core.geometry.distances import DistanceEngine

from stellar_engine.entities.errors import ObstacleNotFoundError

logger = logging.getLogger("stellar_engine")


# ---------------------------Conformity Classes----------------



@dataclass
class Point2D:
    """Represents a 2D point with optional radius."""
    x: float
    y: float
    radius: Optional[float] = None

    def to_dict(self) -> dict:
        """Convert to dictionary format expected by the API."""
        if self.radius is None:
            return {"x": self.x, "y": self.y}
        return {"x": self.x, "y": self.y, "radius": self.radius}
    

    @staticmethod
    def from_array(arr: np.ndarray) -> 'Point2D':
        """Create a Point2D from a numpy array."""
        if arr.shape != (2,):
            raise ValueError("Array must be of shape (2,)")
        return Point2D(x=float(arr[0]), y=float(arr[1]))


@dataclass
class ZoneCorner:
    """Represents a corner of a zone (e.g., LowerLeft, UpperRight)."""
    name: str  # e.g., "LowerLeft", "UpperRight"
    x: float
    y: float

    def to_dict(self) -> dict:
        """Convert to dictionary format: {name: {x: ..., y: ...}}."""
        return {self.name: {"x": self.x, "y": self.y}}


@dataclass
class ZonePlot:
    """Represents the zone plot with zone points and border."""
    zone_points: list[ZoneCorner]
    zone_border: list[dict]  # List of {x, y} dicts

    def to_dict(self) -> dict:
        """Convert to dictionary format expected by the API."""
        return {
            "zonePoints": [corner.to_dict() for corner in self.zone_points],
            "zoneBorder": self.zone_border,
        }


@dataclass
class ZoneConformity:
    """Represents conformity data for a single zone/rule."""
    zone_plot: ZonePlot
    points: list[Point2D]

    def to_dict(self) -> dict:
        """Convert to dictionary format expected by the API."""
        return {
            "zonePlot": self.zone_plot.to_dict(),
            "points": [p.to_dict() for p in self.points],
        }


@dataclass
class ObstacleOutput:
    """Represents the obstacle information in the output."""
    name: str
    points: list[Point2D]

    def to_dict(self) -> dict:
        """Convert to dictionary format expected by the API."""
        return {
            "name": self.name,
            "points": [p.to_dict() for p in self.points],
        }


@dataclass
class ConformityResult:
    """Main conformity computation result."""
    obstacle: ObstacleOutput
    conformity: dict[str, ZoneConformity]  # rule_type -> ZoneConformity
    u_plane: np.ndarray = field(default_factory=lambda: np.zeros(3))
    v_plane: np.ndarray = field(default_factory=lambda: np.zeros(3))

    def set_plane_basis(self, u_plane: np.ndarray, v_plane: np.ndarray) -> None:
        """Set the basis vectors for the projection plane."""
        self.u_plane = u_plane
        self.v_plane = v_plane

    def add_obstacle_3d_point(
        self,
        point: np.ndarray,
        radius: Optional[float] = None,
    ) -> None:
        """Add the obstacle point after plane projection."""
        target_coords_in_plane = point_coordinates_in_plane(
            point=point,
            plane_origin=np.array([0.0, 0.0, 0.0]),
            u_plane=self.u_plane,
            v_plane=self.v_plane,
        )
        self.obstacle.points.append(
            Point2D(x=target_coords_in_plane[0], y=target_coords_in_plane[1], radius=radius)
        )

    def add_zone_3d_point(
        self,
        rule_type: str,
        point: np.ndarray,
        radius: float,
    ) -> None:
        """Add a target point to the zone points list after plane projection."""
        target_coords_in_plane = point_coordinates_in_plane(
            point=point,
            plane_origin=np.array([0.0, 0.0, 0.0]),
            u_plane=self.u_plane,
            v_plane=self.v_plane,
        )
        self.conformity[rule_type].points.append(
            Point2D(x=target_coords_in_plane[0], y=target_coords_in_plane[1], radius=radius)
        )

    def to_dict(self) -> dict:
        """Convert to dictionary format expected by the API."""
        return {
            "obstacle": self.obstacle.to_dict(),
            "conformity": {
                rule_type: zone.to_dict()
                for rule_type, zone in self.conformity.items()
            },
        }


@dataclass
class TargetState:
    """Represents the target climatic state for a scenario."""
    new_temperature: float
    wind_pressure: float

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "new_temperature": self.new_temperature,
            "wind_pressure": self.wind_pressure,
        }


@dataclass
class Scenario:
    """Represents a conformity computation scenario."""
    rule_type: str
    conformity_rule: str
    conformity_point: str  # "lateral" or "overhang"
    security_distance: float
    target_state: TargetState

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "rule_type": self.rule_type,
            "conformity_rule": self.conformity_rule,
            "conformity_point": self.conformity_point,
            "security_distance": self.security_distance,
            "target_state": self.target_state.to_dict(),
        }


@dataclass
class TensionRules:
    """Represents lateral and overhang tension rules for a rule type."""
    lateral: float
    overhang: float

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "lateral": self.lateral,
            "overhang": self.overhang,
        }


@dataclass
class ClimaticPoint:
    """Represents climatic conditions for a conformity point."""
    temperature: Optional[float]
    pressure: float | str  # Can be numeric or "WindZoneInput"
    red_zone: bool

    @classmethod
    def from_dict(cls, data: dict) -> 'ClimaticPoint':
        """Create ClimaticPoint from dictionary with validation.
        
        Args:
            data: Dictionary containing temperature, pressure, and red_zone
            
        Returns:
            ClimaticPoint instance
            
        Raises:
            ValueError: If required fields are missing or invalid
        """
        if not isinstance(data, dict):
            raise ValueError("ClimaticPoint data must be a dictionary")
        
        if "pressure" not in data:
            raise ValueError("ClimaticPoint missing required field: pressure")
        if "red_zone" not in data:
            raise ValueError("ClimaticPoint missing required field: red_zone")
        
        return cls(
            temperature=data.get("temperature"),
            pressure=data["pressure"],
            red_zone=data["red_zone"],
        )

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "temperature": self.temperature,
            "pressure": self.pressure,
            "red_zone": self.red_zone,
        }


@dataclass
class RuleClimaticCondition:
    """Represents climatic conditions for a conformity rule."""
    rule_type: str
    rule_name: str
    lateral_point: ClimaticPoint
    overhang_point: ClimaticPoint

    @classmethod
    def from_dict(cls, data: dict) -> 'RuleClimaticCondition':
        """Create RuleClimaticCondition from dictionary with validation.
        
        Args:
            data: Dictionary containing rule configuration
            
        Returns:
            RuleClimaticCondition instance
            
        Raises:
            ValueError: If required fields are missing or invalid
        """
        if not isinstance(data, dict):
            raise ValueError("RuleClimaticCondition data must be a dictionary")
        
        required_fields = ["ruleType", "ruleName", "lateralPoint", "overhangPoint"]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"RuleClimaticCondition missing required field: {field}")
        
        return cls(
            rule_type=data["ruleType"],
            rule_name=data["ruleName"],
            lateral_point=ClimaticPoint.from_dict(data["lateralPoint"]),
            overhang_point=ClimaticPoint.from_dict(data["overhangPoint"]),
        )

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "ruleType": self.rule_type,
            "ruleName": self.rule_name,
            "lateralPoint": self.lateral_point.to_dict(),
            "overhangPoint": self.overhang_point.to_dict(),
        }


@dataclass
class RuleDistance:
    """Represents security distances for a conformity rule."""
    rule_type: str
    lateral: dict[str, float]  # tension code -> distance
    overhang: dict[str, float]  # tension code -> distance

    @classmethod
    def from_dict(cls, data: dict) -> 'RuleDistance':
        """Create RuleDistance from dictionary with validation.
        
        Args:
            data: Dictionary containing rule distances
            
        Returns:
            RuleDistance instance
            
        Raises:
            ValueError: If required fields are missing or invalid
        """
        if not isinstance(data, dict):
            raise ValueError("RuleDistance data must be a dictionary")
        
        required_fields = ["ruleType", "lateral", "overhang"]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"RuleDistance missing required field: {field}")
        
        if not isinstance(data["lateral"], dict):
            raise ValueError("RuleDistance lateral must be a dictionary")
        if not isinstance(data["overhang"], dict):
            raise ValueError("RuleDistance overhang must be a dictionary")
        
        return cls(
            rule_type=data["ruleType"],
            lateral=data["lateral"],
            overhang=data["overhang"],
        )

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "ruleType": self.rule_type,
            "lateral": self.lateral,
            "overhang": self.overhang,
        }


@dataclass
class ConformityParameters:
    """Represents form parameters for conformity computation."""
    wind_zone: str
    wind_pressure: float
    wind_minus: bool
    red_zone_presence: bool
    repartition_temperature: float
    lateral_distance_temperature: float
    selected_conformity_rules: list[str]
    conformity_plot: Literal["vegetation", "cable_tracks", "overhang"] | None = None

    @classmethod
    def from_dict(cls, data: dict) -> 'ConformityParameters':
        """Create ConformityParameters from dictionary with validation.
        
        Args:
            data: Dictionary containing form parameters
            
        Returns:
            ConformityParameters instance
            
        Raises:
            ValueError: If required fields are missing or invalid
        """
        if not isinstance(data, dict):
            raise ValueError("ConformityParameters data must be a dictionary")
        
        required_fields = [
            "windZone", "windPressure", "windMinus", "redZonePresence",
            "repartitionTemperature", "lateralDistanceTemperature",
            "selectedConformityRules"
        ]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"ConformityParameters missing required field: {field}")

        if not isinstance(data["windZone"], str):
            raise ValueError("windZone must be a string")
        if not isinstance(data["windPressure"], (int, float)):
            raise ValueError("windPressure must be a float")
        if not isinstance(data["windMinus"], bool):
            raise ValueError("windMinus must be a boolean")
        if not isinstance(data["redZonePresence"], bool):
            raise ValueError("redZonePresence must be a boolean")
        if not isinstance(data["repartitionTemperature"], (int, float)):
            raise ValueError("repartitionTemperature must be a float")
        if not isinstance(data["lateralDistanceTemperature"], (int, float)):
            raise ValueError("lateralDistanceTemperature must be a float")
        if not isinstance(data["selectedConformityRules"], list) or not all(
            isinstance(r, str) for r in data["selectedConformityRules"]
        ):
            raise ValueError("selectedConformityRules must be a list of strings")

        conformity_plot = data.get("conformityPlot")
        if conformity_plot is not None and conformity_plot not in (
            "vegetation",
            "cable_tracks",
            "overhang",
        ):
            raise ValueError(
                "conformityPlot must be one of 'vegetation', 'cable_tracks', 'overhang'"
            )

        return cls(
            wind_zone=data["windZone"],
            wind_pressure=data["windPressure"],
            wind_minus=data["windMinus"],
            red_zone_presence=data["redZonePresence"],
            repartition_temperature=data["repartitionTemperature"],
            lateral_distance_temperature=data["lateralDistanceTemperature"],
            selected_conformity_rules=data["selectedConformityRules"],
            conformity_plot=data.get("conformityPlot"),
        )

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        result = {
            "windZone": self.wind_zone,
            "windPressure": self.wind_pressure,
            "windMinus": self.wind_minus,
            "redZonePresence": self.red_zone_presence,
            "repartitionTemperature": self.repartition_temperature,
            "lateralDistanceTemperature": self.lateral_distance_temperature,
            "selectedConformityRules": self.selected_conformity_rules,
        }
        if self.conformity_plot is not None:
            result["conformityPlot"] = self.conformity_plot
        return result


# ---------------------------Conformity----------------

class ConformityPlotRules:
    """Class to manage conformity plot rules and their distances."""

    default_radius = 1.0
    
    def __init__(self, conformity_plot: Literal["vegetation", "cable_tracks", "overhang"]):
        self.conformity_plot = conformity_plot
        self.rules_distances: dict[str, TensionRules] = {}

    def get_zone(self, points) -> ZonePlot:
        """Get the zone plot based on the points and conformity plot type."""
        if not points:
            return None

        max_x = max(p.x for p in points)
        min_x = min(p.x for p in points)
        max_y = max(p.y for p in points)
        min_y = min(p.y for p in points)

        lower_left = Point2D(x=min_x, y=min_y)
        upper_right = Point2D(x=max_x, y=max_y)
        lower_right = Point2D(x=max_x, y=min_y)
        upper_left = Point2D(x=min_x, y=max_y)

        zone_corners = [
            ZoneCorner("LowerLeft", **lower_left.to_dict()),
            ZoneCorner("LowerRight", **lower_right.to_dict()),
            ZoneCorner("UpperRight", **upper_right.to_dict()),
            ZoneCorner("UpperLeft", **upper_left.to_dict()),
        ]

        if self.conformity_plot == "overhang":
            zone_border = [
                upper_right.to_dict(),
                upper_left.to_dict(),
            ]
        elif self.conformity_plot == "vegetation":
            zone_border = [
                upper_left.to_dict(),
                lower_left.to_dict(),
                lower_right.to_dict(),
                upper_right.to_dict(),
            ]
        else:
            zone_border = []

        return ZonePlot(zone_points=zone_corners, zone_border=zone_border)
    
    def get_radius(self, x):
        """Get the radius function based on the conformity plot type."""
        if self.conformity_plot != "cable_tracks":
            return x
        elif self.conformity_plot in ["vegetation", "overhang"]:
            return self.default_radius
        else:
            raise ValueError(f"Unsupported conformity plot type: {self.conformity_plot}")


class ElectricTensionMapper:
    """Manages electric tension code mapping and lookups."""
    
    _TENSION_MAP = {
        "63 KV": '63',
        "90 KV": '90',
        "150 KV": '150',
        "225 KV": '225',
        "400 KV": '400',
    }
    
    @classmethod
    def get_code(cls, tension_label: str) -> str | None:
        """Get the tension code from a tension label.
        
        Args:
            tension_label: Tension label (e.g., "400 KV")
            
        Returns:
            Tension code (e.g., "400") or None if not found
        """
        return cls._TENSION_MAP.get(tension_label)
    
    @classmethod
    def is_valid(cls, tension_label: str) -> bool:
        """Check if a tension label is valid.
        
        Args:
            tension_label: Tension label to validate
            
        Returns:
            True if the tension label exists in the mapping
        """
        return tension_label in cls._TENSION_MAP
    
    @classmethod
    def available_tensions(cls) -> list[str]:
        """Get list of all available tension labels.
        
        Returns:
            List of tension labels (e.g., ["63 KV", "90 KV", ...])
        """
        return list(cls._TENSION_MAP.keys())
    
    @classmethod
    def to_dict(cls) -> dict[str, str]:
        """Get the complete tension mapping as a dictionary.
        
        Returns:
            Dictionary mapping tension labels to codes
        """
        return cls._TENSION_MAP.copy()


def build_scenario(
    rule: RuleClimaticCondition,
    conformity_point: str,
    temperature_key: str,
    parameters: ConformityParameters,
    security_distance: float,
) -> Scenario:
    """Build a scenario object from rule and parameters.
    
    Args:
        rule: RuleClimaticCondition containing climatic conditions
        conformity_point: Either "lateral" or "overhang"
        temperature_key: Key to retrieve default temperature from parameters
        parameters: ConformityParameters with form configuration
        security_distance: Security distance for this scenario
        
    Returns:
        Scenario object with all scenario configuration
    """
    point = rule.lateral_point if conformity_point == "lateral" else rule.overhang_point
    
    # Map temperature_key to ConformityParameters attribute name
    temperature_attr_map = {
        "lateralDistanceTemperature": "lateral_distance_temperature",
        "repartitionTemperature": "repartition_temperature",
    }
    default_temperature = getattr(parameters, temperature_attr_map[temperature_key])

    temperature = (
        point.temperature
        if point.temperature is not None
        else default_temperature
    )
    
    wind_pressure = (
        point.pressure
        if point.pressure != "WindZoneInput"
        else parameters.wind_pressure
    )

    target_state = TargetState(
        new_temperature=temperature,
        wind_pressure=wind_pressure,
    )

    return Scenario(
        rule_type=rule.rule_type,
        conformity_rule=rule.rule_name,
        conformity_point=conformity_point,
        security_distance=security_distance,
        target_state=target_state,
    )


def build_scenarios(
    rules_climatic_conditions: list[RuleClimaticCondition],
    parameters: ConformityParameters,
    tension_rules: dict[str, TensionRules],
) -> list[Scenario]:
    """Build list of scenarios from climatic conditions and tension rules.
    
    Args:
        rules_climatic_conditions: List of RuleClimaticCondition objects
        parameters: ConformityParameters with form configuration
        tension_rules: Dictionary mapping rule type to TensionRules
        
    Returns:
        List of Scenario objects
    """
    scenarios = []

    for rule in rules_climatic_conditions:
        tension_rules_distance = tension_rules.get(rule.rule_type)

        if tension_rules_distance is None:
            logger.debug(f"No tension rules found for rule type: {rule.rule_type}. Skipping this rule.")
            return scenarios  # Return early if no tension rules are found for the current rule type
        
        if tension_rules_distance.lateral is None:
            logger.debug(f"Missing lateral tension rules for rule type: {rule.rule_type}. Skipping this rule.")
            continue
        else:
            scenarios.append(
                build_scenario(
                    rule=rule,
                    conformity_point="lateral",
                    temperature_key="lateralDistanceTemperature",
                    parameters=parameters,
                    security_distance=tension_rules_distance.lateral,
                )
            )
        if tension_rules_distance.overhang is None:
            logger.debug(f"Missing overhang tension rules for rule type: {rule.rule_type}. Skipping this rule.")
            continue
        else:
            scenarios.append(
                build_scenario(
                    rule=rule,
                    conformity_point="overhang",
                    temperature_key="repartitionTemperature",
                    parameters=parameters,
                    security_distance=tension_rules_distance.overhang,
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
    """Compute conformity for an obstacle against regulatory rules.
    
    Args:
        python_inputs: Input dictionary containing obstacle, rules, and parameters
        study: SectionStudy instance with the current study state
        
    Returns:
        Dictionary representation of ConformityResult
    """

    logger.debug(f"Getting conformity for inputs: {python_inputs}")
    obstacle_id = python_inputs.get("obstacle", {}).get("uuid")
    obstacle_support_index = python_inputs.get("obstacle", {}).get(
        "supportIndex"
    )
    electric_tension_code = python_inputs.get("electricTension")
    try:
        electric_tension = ElectricTensionMapper.get_code(electric_tension_code)
        if electric_tension is None:
            raise ValueError(f"Invalid electric tension code: {electric_tension_code}")
    except ValueError as e:
        logger.error(str(e))
        raise

    # Parse and validate input data
    rule_distances_data = python_inputs.get("rulesDistances")
    rules_climatic_conditions_data = python_inputs.get("rulesClimaticConditions")
    parameters_data = python_inputs.get("form", {})

    # Validate and create RuleDistance objects
    if rule_distances_data is None or rule_distances_data == []:
        logger.warning("No rule distances provided. Returning empty conformity result.")
        logger.warning("This should not happen, button should have been disabled.")
        return {}

    try:
        rule_distances = [RuleDistance.from_dict(rd) for rd in rule_distances_data]
    except ValueError as e:
        logger.error(f"Invalid rule distances data: {e}")
        raise

    # Validate and create RuleClimaticCondition objects
    if not rules_climatic_conditions_data:
        logger.warning("No climatic conditions provided. Returning empty conformity result.")
        return {}

    try:
        rules_climatic_conditions = [
            RuleClimaticCondition.from_dict(rcc) for rcc in rules_climatic_conditions_data
        ]
    except ValueError as e:
        logger.error(f"Invalid climatic conditions data: {e}")
        raise

    # Validate and create ConformityParameters object
    try:
        parameters = ConformityParameters.from_dict(parameters_data)
    except ValueError as e:
        logger.error(f"Invalid form parameters: {e}")
        raise

    # Build TensionRules objects for each rule type
    tension_rules = build_tension_rules(electric_tension, rule_distances)

    scenarios = build_scenarios(rules_climatic_conditions, parameters, tension_rules)

    conformity_plot_rules = ConformityPlotRules(parameters.conformity_plot)

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



    # Initialize conformity result structure with empty zones for each rule type
    conformity_zones: dict[str, ZoneConformity] = {}
    for rule_type in tension_rules.keys():
        conformity_zones[rule_type] = ZoneConformity(
            zone_plot=ZonePlot(zone_points=[], zone_border=[]),
            points=[],
        )

    conformity_result = ConformityResult(
        obstacle=ObstacleOutput(name=obstacle_id, points=[]),
        conformity=conformity_zones,
    )

    u_plane, v_plane = dist_engine.define_distance_plane(obstacle_coords[0])
    conformity_result.set_plane_basis(u_plane=u_plane, v_plane=v_plane)

    # Process each scenario and add target points
    for scenario in scenarios:
        logger.debug(f"Processing scenario: {scenario.to_dict()}")
        
        # apply the scenario to the study copy
        study_copy.solve_change_state(
            wind_pressure=scenario.target_state.wind_pressure,
            new_temperature=scenario.target_state.new_temperature,
        )
        # add the cable curve to distance engine
        dist_engine.add_curves(
            study_copy.position_engine.coords_calculator.get_spans(
                frame="section"
            ).coords[obstacle_support_index]
        )
        # get the distance from the obstacle to the cable curve in the section plane
        dist_result = dist_engine.plane_distance(
            obstacle_coords[0], frame="section"
        )

        
        # project into the obstacle plane and save
        conformity_result.add_zone_3d_point(
            rule_type=scenario.rule_type,
            point=dist_result.point_target,
            radius=conformity_plot_rules.get_radius(scenario.security_distance),
        )
    
    # Add obstacle point
    conformity_result.add_obstacle_3d_point(point=obstacle_coords[0])

    # Build zone plots (only for non-cable_track conformity plots)
    for zone_name, zone_conformity in conformity_result.conformity.items():
        if not zone_conformity.points:
            logger.debug(f"No points for zone {zone_name}, skipping zone plot generation.")
            continue
        conformity_result.conformity[zone_name].zone_plot = conformity_plot_rules.get_zone(zone_conformity.points)

    result_dict = conformity_result.to_dict()
    logger.debug(f"Conformity result: {result_dict}")
    return result_dict


def build_tension_rules(electric_tension, rule_distances):
    tension_rules: dict[str, TensionRules] = {
        rd.rule_type: TensionRules(
            lateral=rd.lateral[electric_tension],
            overhang=rd.overhang[electric_tension],
        )
        for rd in rule_distances
    }
    
    return tension_rules

# example output
# {
#     'obstacle': {
#         'name': '05176a6c-4726-4488-8b2a-418551510254',
#         'points': [{'x': 20.0, 'y': 30.0}],
#     },
#     'conformity': {
#         'RULE_1': {
#             'zonePlot': {
#                 'zonePoints': [
#                     {'LowerLeft': {'x': 9.0, 'y': 47.25352991994568}},
#                     {
#                         'LowerRight': {
#                             'x': 12.251346876446044,
#                             'y': 47.25352991994568,
#                         }
#                     },
#                     {
#                         'UpperRight': {
#                             'x': 12.251346876446044,
#                             'y': 51.09436686666673,
#                         }
#                     },
#                     {'UpperLeft': {'x': 9.0, 'y': 51.09436686666673}},
#                 ],
#                 'zoneBorder': [
#                     {'x': 9.0, 'y': 51.09436686666673},
#                     {'x': 9.0, 'y': 47.25352991994568},
#                     {'x': 12.251346876446044, 'y': 47.25352991994568},
#                     {'x': 12.251346876446044, 'y': 51.09436686666673},
#                 ],
#             },
#             'points': [
#                 {
#                     'x': 11.251346876446044,
#                     'y': 49.59436686666673,
#                     'radius': 1.0,
#                 },
#                 {'x': 10.0, 'y': 48.75352991994568, 'radius': 1.0},
#             ],
#         },
#         'RULE_2': {
#             'zonePlot': {
#                 'zonePoints': [
#                     {'LowerLeft': {'x': 8.0, 'y': 46.25352991994568}},
#                     {
#                         'LowerRight': {
#                             'x': 13.46449046107179,
#                             'y': 46.25352991994568,
#                         }
#                     },
#                     {
#                         'UpperRight': {
#                             'x': 13.46449046107179,
#                             'y': 51.50378892208745,
#                         }
#                     },
#                     {'UpperLeft': {'x': 8.0, 'y': 51.50378892208745}},
#                 ],
#                 'zoneBorder': [
#                     {'x': 8.0, 'y': 51.50378892208745},
#                     {'x': 8.0, 'y': 46.25352991994568},
#                     {'x': 13.46449046107179, 'y': 46.25352991994568},
#                     {'x': 13.46449046107179, 'y': 51.50378892208745},
#                 ],
#             },
#             'points': [
#                 {
#                     'x': 11.46449046107179,
#                     'y': 49.00378892208745,
#                     'radius': 1.0,
#                 },
#                 {'x': 10.0, 'y': 48.75352991994568, 'radius': 1.0},
#             ],
#         },
#     },
# }
