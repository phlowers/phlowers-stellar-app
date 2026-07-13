"""Conformity output entities for structured conformity computation results."""

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Literal, Optional

import numpy as np
from mechaphlowers.core.geometry.distances import DistanceResult

from stellar_engine.core.conformity.scenarios import TargetState
from stellar_engine.entities.conformity import (
    ConformityWriter,
    ObstacleOutput,
    TableResultWriter,
    TensionRules,
)

if TYPE_CHECKING:
    from stellar_engine.core.conformity.scenarios import TensionRules

logger = logging.getLogger("stellar_engine")


def point_coordinates_in_plane(
    point: np.ndarray,
    plane_origin: np.ndarray,
    u_plane: np.ndarray,
    v_plane: np.ndarray,
) -> tuple[float, float]:
    """Project a 3D point onto a plane defined by two basis vectors (u_plane, v_plane) and an origin."""

    relative_point = point - plane_origin

    return (
        float(np.dot(relative_point, u_plane)),
        float(np.dot(relative_point, v_plane)),
    )


# --------------storage classes ------------------------------
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
        return {
            "x": float(self.x),
            "y": float(self.y),
            "radius": float(self.radius),
        }

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


# --------------------compute result classes --------------------


class ConformityPlotRules:
    """Class to manage conformity plot rules and their distances."""

    default_radius = 1.0

    def __init__(
        self,
        conformity_plot: Literal["vegetation", "cable_track", "overhang"],
        tension_rules: dict[str, TensionRules],
    ):
        self.conformity_plot = conformity_plot
        self.tension_rules: dict[str, TensionRules] = tension_rules

    def get_zone(self, points, rule_type: str) -> ZonePlot:
        """Get the zone plot based on the points and conformity plot type."""
        if not points:
            return None

        lateral_security_distance = self.tension_rules[rule_type].lateral if self.tension_rules[rule_type].lateral is not None else 0
        overhang_security_distance = self.tension_rules[rule_type].overhang if self.tension_rules[rule_type].overhang is not None else 0

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
        if self.conformity_plot == "cable_track":
            return x
        elif self.conformity_plot in ["vegetation", "overhang"]:
            return self.default_radius
        else:
            raise ValueError(
                f"Unsupported conformity plot type: {self.conformity_plot}"
            )


@dataclass
class ConformityTableResult:
    """Detailed numerical results for a single conformity rule (overhang and lateral sides)."""

    output_parser = TableResultWriter

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
        return self.output_parser.write(self)

    @property
    def conformity_compliance_status(self) -> Optional[bool]:
        """Determine if the conformity is compliant based on distances."""
        if (
            self.lateral_cable_line_axis_distance is None
            or self.lateral_distance_to_comply is None
            or self.overhang_cable_line_axis_distance is None
            or self.overhang_distance_to_comply is None
        ):
            return None

        lateral_compliance = self.lateral_compliance_line_axis_distance
        overhang_compliance = self.overhang_compliance_line_axis_distance

        if self.current_conformity_point == "lateral":
            if lateral_compliance is None:
                return None
            return lateral_compliance > 0
        elif self.current_conformity_point == "overhang":
            if overhang_compliance is None:
                return None
            return overhang_compliance > 0
        else:
            logger.warning(
                "Current conformity point is not set. Cannot determine compliance status."
            )
            return None

    @property
    def lateral_compliance_line_axis_distance(self) -> Optional[float]:
        if (
            self.lateral_cable_line_axis_distance is None
            or self.lateral_distance_to_comply is None
        ):
            return None
        return (
            self.lateral_cable_line_axis_distance
            - self.lateral_distance_to_comply
        )

    @property
    def overhang_compliance_line_axis_distance(self) -> Optional[float]:
        if (
            self.overhang_cable_line_axis_distance is None
            or self.lateral_distance_to_comply is None
        ):
            return None
        return (
            self.overhang_cable_line_axis_distance
            - self.lateral_distance_to_comply
        )

    @property
    def overhang_compliance_altitude(self) -> Optional[float]:
        if (
            self.overhang_cable_altitude is None
            or self.overhang_distance_to_comply is None
        ):
            return None
        return self.overhang_cable_altitude - self.overhang_distance_to_comply

    def set_conformity_point(
        self, conformity_point: Literal["overhang", "lateral"]
    ) -> None:
        self.current_conformity_point = conformity_point

    def set_target_state(self, point: 'TargetState', conformity_point) -> None:
        if conformity_point == "lateral":
            self.lateral_temperature = point.new_temperature
            self.lateral_wind_pressure = point.wind_pressure
        elif conformity_point == "overhang":
            self.overhang_temperature = point.new_temperature
            self.overhang_wind_pressure = point.wind_pressure

    def set_projected_point(
        self,
        point: tuple[float, float],
        conformity_point,
    ) -> None:
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
            self.lateral_cable_line_axis_distance = (
                distance.distance_projection_u
            )

            # probably not the intended behavior, but keeping it for now to avoid breaking existing code
            # requirements was unclear about this field
            self.lateral_minimal_distance = distance.distance_projection_u
        elif conformity_point == "overhang":
            self.overhang_cable_line_axis_distance = (
                distance.distance_projection_v
            )

            # probably not the intended behavior, but keeping it for now to avoid breaking existing code
            # requirements was unclear about this field
            self.overhang_minimal_distance = distance.distance_projection_v


@dataclass
class ConformityResult:
    """Main conformity computation result."""

    conformity_writer = ConformityWriter

    obstacle: ObstacleOutput
    conformity: dict[str, ZoneConformity]  # rule_type -> ZoneConformity
    table_results: dict[str, ConformityTableResult] = field(
        default_factory=dict
    )  # rule_type -> table result
    u_plane: np.ndarray = field(default_factory=lambda: np.zeros(3))
    v_plane: np.ndarray = field(default_factory=lambda: np.zeros(3))

    @staticmethod
    def create_with_empty_zones(
        obstacle_id: str, rule_types: list[str]
    ) -> 'ConformityResult':
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

    def set_plane_basis(
        self, u_plane: np.ndarray, v_plane: np.ndarray
    ) -> None:
        """Set the basis vectors for the projection plane."""
        self.u_plane = u_plane
        self.v_plane = v_plane

    def project_onto_plane(
        self, point, plane_origin=np.array([0.0, 0.0, 0.0])
    ) -> tuple[float, float]:
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
            Point2D(
                x=target_coords_in_plane[0],
                y=target_coords_in_plane[1],
                radius=radius,
            )
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
        return self.conformity_writer.write(self)
