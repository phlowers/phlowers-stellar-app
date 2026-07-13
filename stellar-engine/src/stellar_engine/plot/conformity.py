
# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging
from copy import copy, deepcopy
from dataclasses import dataclass, field
from typing import ClassVar, Literal, Optional

import numpy as np
from mechaphlowers import SectionStudy
from mechaphlowers.core.geometry.distances import DistanceEngine, DistanceResult

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
            return {"x": float(self.x), "y": float(self.y)}
        return {"x": float(self.x), "y": float(self.y), "radius": float(self.radius)}
    

    @staticmethod
    def from_array(arr: np.ndarray) -> 'Point2D':
        """Create a Point2D from a numpy array."""
        if arr.shape != (2,):
            raise ValueError("Array must be of shape (2,)")
        return Point2D(x=float(arr[0]), y=float(arr[1]), radius=None)


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
class ConformityTableResult:
    """Detailed numerical results for a single conformity rule (overhang and lateral sides)."""
    
    overhang_cable_altitude: Optional[float] = None
    lateral_cable_altitude: Optional[float] = None
    overhang_cable_line_axis_distance: Optional[float] = None
    lateral_cable_line_axis_distance: Optional[float] = None
    overhang_distance_to_comply: Optional[float] = None
    lateral_distance_to_comply: Optional[float] = None
    overhang_temperature: Optional[float] = None
    lateral_temperature: Optional[float] = None
    overhang_wind_pressure: Optional[float] = None
    lateral_wind_pressure: Optional[float] = None
    overhang_minimal_distance: Optional[float] = None
    lateral_minimal_distance: Optional[float] = None

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "overhangCableAltitude": float(self.overhang_cable_altitude) if self.overhang_cable_altitude is not None else None,
            "lateralCableAltitude": float(self.lateral_cable_altitude) if self.lateral_cable_altitude is not None else None,
            "overhangTemperature": float(self.overhang_temperature) if self.overhang_temperature is not None else None,
            "lateralTemperature": float(self.lateral_temperature) if self.lateral_temperature is not None else None,
            "overhangWindPressure": float(self.overhang_wind_pressure) if self.overhang_wind_pressure is not None else None,
            "lateralWindPressure": float(self.lateral_wind_pressure) if self.lateral_wind_pressure is not None else None,

            "lateralCableLineAxisDistance": float(self.lateral_cable_line_axis_distance) if self.lateral_cable_line_axis_distance is not None else None,
            "overhangCableLineAxisDistance": float(self.overhang_cable_line_axis_distance) if self.overhang_cable_line_axis_distance is not None else None,
            
            "overhangDistanceToComply": float(self.overhang_distance_to_comply) if self.overhang_distance_to_comply is not None else None,
            "lateralDistanceToComply": float(self.lateral_distance_to_comply) if self.lateral_distance_to_comply is not None else None,
            
            "overhangComplianceAltitude": float(self.overhang_compliance_altitude) if self.overhang_compliance_altitude is not None else None,
            "lateralComplianceLineAxisDistance": float(self.lateral_compliance_line_axis_distance) if self.lateral_compliance_line_axis_distance is not None else None,
            "conformityCompliance": bool(self.conformity_compliance_status) if self.conformity_compliance_status is not None else None,
            
            "overhangMinimalDistance": float(self.overhang_minimal_distance) if self.overhang_minimal_distance is not None else None,
            "lateralMinimalDistance": float(self.lateral_minimal_distance) if self.lateral_minimal_distance is not None else None,
        }

    @property
    def conformity_compliance_status(self) -> Optional[bool]:
        """Determine if the conformity is compliant based on distances."""
        if (
            self.lateral_cable_line_axis_distance is None or
            self.lateral_distance_to_comply is None or
            self.overhang_cable_line_axis_distance is None or
            self.overhang_distance_to_comply is None
        ):
            return None
        return (
            self.lateral_compliance_line_axis_distance > 0 or
            self.overhang_compliance_line_axis_distance > 0
        )

    @property
    def lateral_compliance_line_axis_distance(self) -> Optional[float]:
        if self.lateral_cable_line_axis_distance is None or self.lateral_distance_to_comply is None:
            return None
        return self.lateral_cable_line_axis_distance - self.lateral_distance_to_comply
    
    @property
    def overhang_compliance_line_axis_distance(self) -> Optional[float]:
        if self.overhang_cable_line_axis_distance is None or self.lateral_distance_to_comply is None:
            return None
        return self.overhang_cable_line_axis_distance - self.lateral_distance_to_comply

    @property
    def overhang_compliance_altitude(self) -> Optional[float]:
        if self.overhang_cable_altitude is None or self.overhang_distance_to_comply is None:
            return None
        return self.overhang_cable_altitude - self.overhang_distance_to_comply

    def set_conformity_point(self, conformity_point: Literal["overhang", "lateral"]) -> None:
        self.current_conformity_point = conformity_point

    # def set_temperature(self, temperature: float, conformity_point) -> None:
    #     if conformity_point == "lateral":
    #         self.lateral_temperature = temperature
    #     elif conformity_point == "overhang":
    #         self.overhang_temperature = temperature

    def set_target_state(self, point: 'TargetState', conformity_point) -> None:
        if conformity_point == "lateral":
            self.lateral_temperature = point.new_temperature
            self.lateral_wind_pressure = point.wind_pressure
        elif conformity_point == "overhang":
            self.overhang_temperature = point.new_temperature
            self.overhang_wind_pressure = point.wind_pressure

    def set_projected_point(self, point: tuple[float, float], conformity_point, ) -> None:
        if conformity_point == "lateral":
            self.lateral_cable_altitude = point[0]
        elif conformity_point == "overhang":
            self.overhang_cable_altitude = point[1]

    def set_rule_distances(self, security_distance, conformity_point) -> None:
        if conformity_point == "lateral":
            self.lateral_distance_to_comply = security_distance
        elif conformity_point == "overhang":
            self.overhang_distance_to_comply = security_distance

    def set_distance(self, distance: DistanceResult, conformity_point) -> None:
        if conformity_point == "lateral":
            self.lateral_cable_line_axis_distance = distance.distance_projection_u

            # probably not the intended behavior, but keeping it for now to avoid breaking existing code
            # requirements was unclear about this field
            self.lateral_minimal_distance = distance.distance_projection_u
        elif conformity_point == "overhang":
            self.overhang_cable_line_axis_distance = distance.distance_projection_v

            # probably not the intended behavior, but keeping it for now to avoid breaking existing code
            # requirements was unclear about this field
            self.overhang_minimal_distance = distance.distance_projection_v


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
    table_results: dict[str, ConformityTableResult] = field(default_factory=dict)  # rule_type -> table result
    u_plane: np.ndarray = field(default_factory=lambda: np.zeros(3))
    v_plane: np.ndarray = field(default_factory=lambda: np.zeros(3))

    @staticmethod
    def create_with_empty_zones(obstacle_id: str, rule_types: list[str]) -> 'ConformityResult':
        """Create ConformityResult with empty zones for each rule type.
        
        Args:
            obstacle_id: Obstacle UUID
            rule_types: List of rule type identifiers
            
        Returns:
            ConformityResult with initialized empty zones
        """
        table_results: dict[str, ConformityTableResult] = {}
        conformity_zones: dict[str, ZoneConformity] = {}

        for rule_type in rule_types:
            conformity_zones[rule_type] = ZoneConformity(
                zone_plot=ZonePlot(zone_points=[], zone_border=[]),
                points=[],
            )
            table_results[rule_type] = ConformityTableResult()
        
        return ConformityResult(
            obstacle=ObstacleOutput(name=obstacle_id, points=[]),
            conformity=conformity_zones,
            table_results=table_results,
        )

    def set_plane_basis(self, u_plane: np.ndarray, v_plane: np.ndarray) -> None:
        """Set the basis vectors for the projection plane."""
        self.u_plane = u_plane
        self.v_plane = v_plane

    def project_onto_plane(self, point, plane_origin=np.array([0.0, 0.0, 0.0])) -> tuple[float, float]:
        target_coords_in_plane = point_coordinates_in_plane(
            point=point,
            plane_origin=plane_origin,
            u_plane=self.u_plane,
            v_plane=self.v_plane,
        )
        return target_coords_in_plane
    

    def add_obstacle_3d_point(
        self,
        point: np.ndarray,
        radius: Optional[float] = None,
    ) -> None:
        """Add the obstacle point after plane projection."""
        target_coords_in_plane = self.project_onto_plane(point)
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
        target_coords_in_plane = self.project_onto_plane(point)
        self.add_zone_2d_point(
            rule_type=rule_type,
            point=target_coords_in_plane,
            radius=radius,
        )

    def add_zone_2d_point(
        self,
        rule_type: str,
        point: tuple[float, float],
        radius: Optional[float] = None,
    ) -> None:
        """Add a 2D point to the zone points list."""
        self.conformity[rule_type].points.append(
            Point2D(x=point[0], y=point[1], radius=radius)
        )

    def compute_table_result(self, points_list: list) -> None:
        """Build and add table result from distance engine result.
        
        Args:
            rule_type: Rule type identifier
            dist_result: Distance result object from DistanceEngine.plane_distance()
        """
        pass

    def to_dict(self) -> dict:
        """Convert to dictionary format expected by the API."""
        return {
            "obstacle": self.obstacle.to_dict(),
            "conformity": {
                rule_type: zone.to_dict()
                for rule_type, zone in self.conformity.items()
            },
            "results": {
                rule_type: table_result.to_dict()
                for rule_type, table_result in self.table_results.items()
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
    conformity_point: str  # "lateral" or "overhang" or "cable_tracks"
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
    lateral: Optional[float]
    overhang: Optional[float]

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "lateral": self.lateral,
            "overhang": self.overhang,
        }
    
    @staticmethod
    def build_tension_rules(electric_tension, rule_distances: list['RuleDistance']) -> dict[str, 'TensionRules']:
        """Build a mapping of rule types to TensionRules based on electric tension and rule distances."""
        tension_rules: dict[str, TensionRules] = {
            rd.rule_type: TensionRules(
                lateral=rd.lateral[electric_tension],
                overhang=rd.overhang[electric_tension],
            )
            for rd in rule_distances
        }
        
        return tension_rules


@dataclass
class ClimaticPoint:
    """Represents climatic conditions for a conformity point."""
    # Class attribute for default wind pressure when wind_input is "WindZoneInput"
    default_wind_pressure: ClassVar[float] = 0.0
    
    temperature: Optional[float]
    wind_input: float | str  # Can be numeric or "WindZoneInput"
    red_zone: bool
    wind_pressure: float = field(init=False)

    def __post_init__(self):
        """Set wind_pressure based on wind_input."""
        if self.wind_input == "WindZoneInput":
            self.wind_pressure = ClimaticPoint.default_wind_pressure
        else:
            self.wind_pressure = float(self.wind_input)

    @classmethod
    def from_dict(cls, data: dict) -> 'ClimaticPoint':
        """Create ClimaticPoint from dictionary with validation.
        
        Args:
            data: Dictionary containing temperature, wind_pressure, and red_zone
            
        Returns:
            ClimaticPoint instance
            
        Raises:
            ValueError: If required fields are missing or invalid
        """
        if not isinstance(data, dict):
            raise ValueError("ClimaticPoint data must be a dictionary")
        
        if "pressure" not in data:
            raise ValueError("ClimaticPoint missing required field: wind_pressure")
        if "red_zone" not in data:
            raise ValueError("ClimaticPoint missing required field: red_zone")
        
        return cls(
            temperature=data.get("temperature"),
            wind_input=data["pressure"],
            red_zone=data["red_zone"],
        )

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "temperature": self.temperature,
            "wind_pressure": self.wind_pressure,
            "red_zone": self.red_zone,
        }
    
    def __copy__(self):
        """Create a deep copy of the ClimaticPoint."""
        c = ClimaticPoint(
            temperature=self.temperature,
            wind_input=self.wind_pressure,
            red_zone=self.red_zone,
        )
        c.wind_pressure = self.wind_pressure
        
        return c


@dataclass
class RuleClimaticCondition:
    """Represents climatic conditions for a conformity rule."""
    rule_type: str
    rule_name: str
    lateral_point: ClimaticPoint
    overhang_point: ClimaticPoint
    inverse_lateral_point: Optional[ClimaticPoint] = None

    def add_inverse_lateral_pressure(self):
        """Return a copy of the rule with the lateral pressure inverted."""
        self.inverse_lateral_point = copy(self.lateral_point)
        if isinstance(self.lateral_point.wind_pressure, (int, float)):
            self.inverse_lateral_point.wind_pressure = -self.lateral_point.wind_pressure

    def set_repartition_temperature(self, temperature: float):
        """Set the repartition temperature for both lateral and overhang points."""
        if self.overhang_point is not None:
            self.overhang_point.temperature = temperature

    def set_lateral_temperature(self, temperature: float):
        if self.lateral_point is not None:
            self.lateral_point.temperature = temperature
        if self.inverse_lateral_point is not None:
            self.inverse_lateral_point.temperature = temperature

    def set_wind_pressure(self, wind_pressure: float):
        if self.lateral_point is not None:
            self.lateral_point.wind_pressure = wind_pressure
        if self.inverse_lateral_point is not None:
            self.inverse_lateral_point.wind_pressure = -wind_pressure
        if self.overhang_point is not None:
            self.overhang_point.wind_pressure = wind_pressure

    def interpolate_between_points(self, intermediate_points: list[float]) -> list['ClimaticPoint']:
        """Interpolate between lateral and overhang points for given intermediate points."""
        
        if self.overhang_point is None:
            logger.warning("Overhang point is None, cannot interpolate.")
            return []
        if self.lateral_point is None:
            logger.warning("Lateral point is None, cannot interpolate.")
            return []

        interpolated_points = []
        lateral_pressure = float(self.lateral_point.wind_pressure)
        overhang_pressure = float(self.overhang_point.wind_pressure)
        inverse_lateral_pressure = -lateral_pressure

        for point in intermediate_points:
            # Interpolate from inverse lateral to overhang
            inverse_to_overhang = copy(self.lateral_point)
            inverse_to_overhang.wind_pressure = (
                inverse_lateral_pressure * (1 - point) + overhang_pressure * point
            )
            interpolated_points.append(inverse_to_overhang)

            # Interpolate from overhang to lateral
            overhang_to_lateral = copy(self.lateral_point)
            overhang_to_lateral.wind_pressure = (
                overhang_pressure * (1 - point) + lateral_pressure * point
            )
            interpolated_points.append(overhang_to_lateral)

        return interpolated_points



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
        for fields in required_fields:
            if fields not in data:
                raise ValueError(f"RuleClimaticCondition missing required field: {fields}")
        
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
    
    @staticmethod
    def build_rules_climatic_conditions(rules_climatic_conditions_data: list[dict]) -> list['RuleClimaticCondition']:
        """Build list of RuleClimaticCondition from list of dictionaries."""

        rules = []
        for rcc in rules_climatic_conditions_data:
            rule = RuleClimaticCondition.from_dict(rcc)
            rules.append(rule)

        return rules


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
        for fields in required_fields:
            if fields not in data:
                raise ValueError(f"RuleDistance missing required field: {fields}")
        
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
    conformity_plot: Literal["vegetation", "cable_tracks", "overhang"]
    intermediate_points: list[float] = field(default_factory=list)
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
        for fields in required_fields:
            if fields not in data:
                raise ValueError(f"ConformityParameters missing required field: {fields}")

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

        intermediate_points = data.get("intermediatePoints", [])
        if not isinstance(intermediate_points, list) or not all(
            isinstance(point, (int, float)) for point in intermediate_points
        ):
            raise ValueError("intermediatePoints must be a list of numbers")

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
            intermediate_points=intermediate_points,
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
        if self.intermediate_points:
            result["intermediatePoints"] = self.intermediate_points
        if self.conformity_plot is not None:
            result["conformityPlot"] = self.conformity_plot
        return result


# ---------------------------Conformity----------------

class ConformityPlotRules:
    """Class to manage conformity plot rules and their distances."""

    default_radius = 1.0
    
    def __init__(
        self,
        conformity_plot: Literal["vegetation", "cable_tracks", "overhang"],
        tension_rules: dict[str, TensionRules],
    ):
        self.conformity_plot = conformity_plot
        self.tension_rules: dict[str, TensionRules] = tension_rules

    

    def get_zone(self, points, rule_type: str) -> ZonePlot:
        """Get the zone plot based on the points and conformity plot type."""
        if not points:
            return None

        lateral_security_distance = self.tension_rules[rule_type].lateral
        overhang_security_distance = self.tension_rules[rule_type].overhang
        
        max_x = max(p.x for p in points) + lateral_security_distance
        min_x = min(p.x for p in points) - lateral_security_distance
        max_y = max(p.y for p in points) + overhang_security_distance
        min_y = min(p.y for p in points) - overhang_security_distance

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
        
    # def add_scenarios(self, scenarios_dict: dict[str, Scenario]) -> None:
    #     """Add scenarios to the rules distances mapping."""
    #     for rule_type, scenario in scenarios_dict.items():
    #         if scenario.rule_type == "cable_tracks":
    #             self.rules_distances[rule_type] = TensionRules(
    #                 lateral=scenario.security_distance,
    #                 overhang=scenario.security_distance,
    #             )
            


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
    # conformity_point: str,
    # temperature_key: Literal["lateral_distance_temperature", "repartition_temperature"],
    parameters: ConformityParameters,
    security_distance: TensionRules,

) -> list[Scenario]:
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
    
    # Map temperature_key to ConformityParameters attribute name
    # default_temperature = getattr(parameters, temperature_key)
    scenarios = []

    if security_distance.lateral is not None and rule.lateral_point is not None:
        rule.set_lateral_temperature(parameters.lateral_distance_temperature)
        target_state = TargetState(
            new_temperature=rule.lateral_point.temperature,
            wind_pressure=rule.lateral_point.wind_pressure,
        )
        scenarios.append(
            Scenario(
                rule_type=rule.rule_type,
                conformity_rule=parameters.conformity_plot,
                conformity_point="lateral",
                security_distance=security_distance.lateral,
                target_state=target_state,
            )
        )
        rule.add_inverse_lateral_pressure()
        target_state_inverse = TargetState(
            new_temperature=rule.inverse_lateral_point.temperature,
            wind_pressure=rule.inverse_lateral_point.wind_pressure,
        )
        scenarios.append(
            Scenario(
                rule_type=rule.rule_type,
                conformity_rule=parameters.conformity_plot,
                conformity_point="lateral_inverse",
                security_distance=security_distance.lateral,
                target_state=target_state_inverse,
            )
        )


    if security_distance.overhang is not None and rule.overhang_point is not None:
        rule.add_inverse_lateral_pressure()
        rule.set_repartition_temperature(parameters.repartition_temperature)
        target_state = TargetState(
            new_temperature=rule.overhang_point.temperature,
            wind_pressure=rule.overhang_point.wind_pressure,
        )
        scenarios.append(
            Scenario(
                rule_type=rule.rule_type,
                conformity_rule=parameters.conformity_plot,
                conformity_point="overhang",
                security_distance=security_distance.overhang,
                target_state=target_state,
            )
        )

    if parameters.conformity_plot == "cable_tracks":
        additional_points = rule.interpolate_between_points(parameters.intermediate_points)
        if additional_points:
            for point in additional_points:
                target_state = TargetState(
                    new_temperature=point.temperature,
                    wind_pressure=point.wind_pressure,
                )
                scenarios.append(
                    Scenario(
                        rule_type=rule.rule_type,
                        conformity_rule=parameters.conformity_plot,
                        conformity_point="intermediate",
                        security_distance=security_distance.lateral,  # Assuming overhang distance for cable_tracks
                        target_state=target_state,
                    )
                )

    return scenarios


def build_scenarios(
    rules_climatic_conditions: list[RuleClimaticCondition],
    parameters: ConformityParameters,
    tension_rules: dict[str, TensionRules],
) -> dict[str, list[Scenario]]:
    """Build scenarios from climatic conditions and tension rules, organized by rule type.
    
    Args:
        rules_climatic_conditions: List of RuleClimaticCondition objects
        parameters: ConformityParameters with form configuration
        tension_rules: Dictionary mapping rule type to TensionRules
        
    Returns:
        Dictionary mapping rule type to list of Scenario objects for that rule
    """
    scenarios_by_rule: dict[str, list[Scenario]] = {rule.rule_type: [] for rule in rules_climatic_conditions}

    for rule in rules_climatic_conditions:
        tension_rules_distance = tension_rules.get(rule.rule_type, None)

        build_scenario_list = build_scenario(
            rule=rule,
            parameters=parameters,
            security_distance=tension_rules_distance,
        )
        scenarios_by_rule[rule.rule_type] = build_scenario_list

    return scenarios_by_rule


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


def get_conformity(python_inputs: dict, study: SectionStudy) -> dict:
    """Compute conformity for an obstacle against regulatory rules.
    
    Args:
        python_inputs: Input dictionary containing obstacle, rules, and parameters
        study: SectionStudy instance with the current study state
        
    Returns:
        Dictionary representation of ConformityResult
    """

    # get data from inputs --------------

    logger.debug(f"Getting conformity for inputs: {python_inputs}")
    obstacle_id = python_inputs.get("obstacle", {}).get("uuid")
    obstacle_support_index = python_inputs.get("obstacle", {}).get(
        "supportIndex"
    )
    electric_tension_code = python_inputs.get("electricTension")
    try:
        if not isinstance(electric_tension_code, str):
            raise ValueError("Invalid electric tension code: missing or non-string value")
        electric_tension = ElectricTensionMapper.get_code(electric_tension_code)
        if electric_tension is None:
            raise ValueError(f"Invalid electric tension code: {electric_tension_code}")
    except ValueError as e:
        logger.error(str(e))
        raise

    rule_distances_data = python_inputs.get("rulesDistances")
    rules_climatic_conditions_data = python_inputs.get("rulesClimaticConditions")
    parameters_data = python_inputs.get("form", {})

    # Validation ------------------------------
    # - Validate and create RuleDistance objects
    if rule_distances_data is None or rule_distances_data == []:
        logger.warning("No rule distances provided. Returning empty conformity result.")
        logger.warning("This should not happen, button should have been disabled.")
        return {}

    try:
        rule_distances = [RuleDistance.from_dict(rd) for rd in rule_distances_data]
    except ValueError as e:
        logger.error(f"Invalid rule distances data: {e}")
        raise

    # - Validate and create ConformityParameters object
    try:
        parameters = ConformityParameters.from_dict(parameters_data)
    except ValueError as e:
        logger.error(f"Invalid form parameters: {e}")
        raise


    # - Validate and create RuleClimaticCondition objects
    # --- set wind pressure for "WindZoneInput" cases before
    ClimaticPoint.default_wind_pressure = parameters.wind_pressure
    # --- build RuleClimaticCondition objects
    if not rules_climatic_conditions_data:
        logger.warning("No climatic conditions provided. Returning empty conformity result.")
        return {}

    try:
        rules_climatic_conditions = RuleClimaticCondition.build_rules_climatic_conditions(rules_climatic_conditions_data)
    except ValueError as e:
        logger.error(f"Invalid climatic conditions data: {e}")
        raise


    # Build objects ------------------------------
    # Build TensionRules objects for each rule type
    tension_rules = TensionRules.build_tension_rules(electric_tension, rule_distances)

    # - Create ConformityPlotRules object
    conformity_plot_rules = ConformityPlotRules(
        parameters.conformity_plot,
        tension_rules=tension_rules,
        # parameters.intermediate_points,
    )

    # Build scenarios
    scenarios_by_rule = build_scenarios(rules_climatic_conditions, parameters, tension_rules)

    logger.debug(f"Built scenarios by rule: {scenarios_by_rule}")

    # Init objects for simulation
    dist_engine = DistanceEngine()
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
        if obstacle_coords is None:
            raise KeyError(obstacle_id)
    except KeyError:
        logger.error(f"Obstacle with uuid: {obstacle_id} not found in study.")
        raise ObstacleNotFoundError(
            f"Obstacle with uuid: {obstacle_id} not found in study."
        )

    # Initialize conformity result structure with empty zones for each rule type
    conformity_result = ConformityResult.create_with_empty_zones(
        obstacle_id=obstacle_id,
        rule_types=list(tension_rules.keys()),
    )
    u_plane, v_plane = dist_engine.define_distance_plane(obstacle_coords[0])
    conformity_result.set_plane_basis(u_plane=u_plane, v_plane=v_plane)

    # Simulation ------------------------------

    for rule_type, rule_scenarios in scenarios_by_rule.items():
        points_list = {}
        for scenario in rule_scenarios:
            logger.debug(f"Processing scenario: {scenario.to_dict()}")
            
            # apply the scenario to the study copy
            study.solve_change_state(
                wind_pressure=scenario.target_state.wind_pressure,
                new_temperature=scenario.target_state.new_temperature,
            )
            # add the cable curve to distance engine
            dist_engine.add_curves(
                study.position_engine.coords_calculator.get_spans(
                    frame="section"
                ).coords[obstacle_support_index]
            )
            # get the distance from the obstacle to the cable curve in the section plane
            dist_result = dist_engine.plane_distance(
                obstacle_coords[0], frame="section"
            )

            projected_point = conformity_result.project_onto_plane(
                dist_result.point_target, 
            )

            logger.debug(f"Distance result for rule {rule_type}: {dist_result}")
            logger.debug(f"Projected point for rule {rule_type}: {projected_point}")
            logger.debug(f"cable point for rule {rule_type}: {dist_result.point_target}")
            
            # project into the obstacle plane and save
            conformity_result.add_zone_2d_point(
                rule_type=scenario.rule_type,
                point=projected_point,
                radius=conformity_plot_rules.get_radius(scenario.security_distance),
            )

            conformity_result.table_results[rule_type].set_conformity_point(scenario.conformity_point)
            conformity_result.table_results[rule_type].set_target_state(scenario.target_state, scenario.conformity_point)
            conformity_result.table_results[rule_type].set_projected_point(projected_point, scenario.conformity_point)
            conformity_result.table_results[rule_type].set_distance(dist_result, scenario.conformity_point)
            conformity_result.table_results[rule_type].set_rule_distances(scenario.security_distance, scenario.conformity_point)

    
    # Add obstacle point
    conformity_result.add_obstacle_3d_point(point=obstacle_coords[0])

    # Build zone plots (only for non-cable_track conformity plots)
    for zone_name, zone_conformity in conformity_result.conformity.items():
        if not zone_conformity.points:
            logger.debug(f"No points for zone {zone_name}, skipping zone plot generation.")
            continue
        zone_plot = conformity_plot_rules.get_zone(zone_conformity.points, rule_type=zone_name)
        if zone_plot is None:
            continue
        conformity_result.conformity[zone_name].zone_plot = zone_plot

    

    result_dict = conformity_result.to_dict()
    logger.debug(f"Conformity result: {result_dict}")

    return result_dict



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
