"""Conformity input entities for structured conformity computation parameters."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Literal, Optional

if TYPE_CHECKING:
    from stellar_engine.core.conformity.compute import (
        ConformityResult,
        ConformityTableResult,
        Point2D,
    )

import logging

logger = logging.getLogger("stellar_engine")

# --------data classes for conformity input entities----------------


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
    def build_tension_rules(
        electric_tension: str, rule_distances: list['RuleDistanceInput']
    ) -> dict[str, 'TensionRules']:
        """Build a mapping of rule types to TensionRules based on electric tension and rule distances."""
        tension_rules: dict[str, TensionRules] = {
            rd.rule_type: TensionRules(
                lateral=rd.lateral[electric_tension] if rd.lateral else None,
                overhang=rd.overhang[electric_tension]
                if rd.overhang
                else None,
            )
            for rd in rule_distances
        }

        return tension_rules


# --------------------output classes --------------------
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


class ConformityWriter:
    """Writes conformity results to a structured format."""

    @staticmethod
    def write(result: 'ConformityResult') -> dict:
        """Convert ConformityResult to dictionary format."""
        return {
            "obstacle": result.obstacle.to_dict(),
            "conformity": {
                rule_type: zone.to_dict()
                for rule_type, zone in result.conformity.items()
            },
            "results": {
                rule_type: table_result.to_dict()
                for rule_type, table_result in result.table_results.items()
            },
        }


class TableResultWriter:
    """Writes conformity table results to a structured format."""

    def __init__(self, result: 'ConformityTableResult'):
        self.result = result

    @staticmethod
    def write(result: 'ConformityTableResult') -> dict:
        """Convert ConformityTableResult to dictionary format."""
        return {
            "overhangCableAltitude": float(result.overhang_cable_altitude)
            if result.overhang_cable_altitude is not None
            else None,
            "lateralCableAltitude": float(result.lateral_cable_altitude)
            if result.lateral_cable_altitude is not None
            else None,
            "overhangTemperature": float(result.overhang_temperature)
            if result.overhang_temperature is not None
            else None,
            "lateralTemperature": float(result.lateral_temperature)
            if result.lateral_temperature is not None
            else None,
            "overhangWindPressure": float(result.overhang_wind_pressure)
            if result.overhang_wind_pressure is not None
            else None,
            "lateralWindPressure": float(result.lateral_wind_pressure)
            if result.lateral_wind_pressure is not None
            else None,
            "lateralCableLineAxisDistance": float(
                result.lateral_cable_line_axis_distance
            )
            if result.lateral_cable_line_axis_distance is not None
            else None,
            "overhangCableLineAxisDistance": float(
                result.overhang_cable_line_axis_distance
            )
            if result.overhang_cable_line_axis_distance is not None
            else None,
            "overhangDistanceToComply": float(
                result.overhang_distance_to_comply
            )
            if result.overhang_distance_to_comply is not None
            else None,
            "lateralDistanceToComply": float(result.lateral_distance_to_comply)
            if result.lateral_distance_to_comply is not None
            else None,
            "overhangComplianceAltitude": float(
                result.overhang_compliance_altitude
            )
            if result.overhang_compliance_altitude is not None
            else None,
            "lateralComplianceLineAxisDistance": float(
                result.lateral_compliance_line_axis_distance
            )
            if result.lateral_compliance_line_axis_distance is not None
            else None,
            "conformityCompliance": bool(result.conformity_compliance_status)
            if result.conformity_compliance_status is not None
            else None,
            "overhangMinimalDistance": float(result.overhang_minimal_distance)
            if result.overhang_minimal_distance is not None
            else None,
            "lateralMinimalDistance": float(result.lateral_minimal_distance)
            if result.lateral_minimal_distance is not None
            else None,
        }


# --------------------input classes --------------------
@dataclass
class RuleDistanceInput:
    """Represents security distances for a conformity rule."""

    rule_type: str
    lateral: dict[str, float]  # tension code -> distance
    overhang: dict[str, float]  # tension code -> distance

    @classmethod
    def from_dict(cls, data: dict) -> 'RuleDistanceInput':
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
                raise ValueError(
                    f"RuleDistance missing required field: {fields}"
                )

        if not isinstance(data["lateral"], dict):
            logger.warning(
                "RuleDistance lateral is missing, it could be normal if this is the configuration"
            )
            data["lateral"] = {}
        if not isinstance(data["overhang"], dict):
            logger.warning(
                "RuleDistance overhang is missing, it could be normal if this is the configuration"
            )
            data["overhang"] = {}

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


@dataclass
class ConformityParametersInput:
    """Represents form parameters for conformity computation."""

    wind_zone: str
    wind_pressure: float
    wind_minus: bool
    red_zone_presence: bool
    repartition_temperature: float
    lateral_distance_temperature: float
    selected_conformity_rules: list[str]
    conformity_plot: Literal["vegetation", "cable_track", "overhang"]
    intermediate_points: list[float] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict) -> 'ConformityParametersInput':
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
            "windZone",
            "windPressure",
            "windMinus",
            "redZonePresence",
            "repartitionTemperature",
            "lateralDistanceTemperature",
            "selectedConformityRules",
            "conformityPlot",
        ]
        for fields in required_fields:
            if fields not in data:
                raise ValueError(
                    f"ConformityParameters missing required field: {fields}"
                )

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
            raise ValueError(
                "selectedConformityRules must be a list of strings"
            )

        intermediate_points = data.get("intermediatePoints", [])
        if not isinstance(intermediate_points, list) or not all(
            isinstance(point, (int, float)) for point in intermediate_points
        ):
            raise ValueError("intermediatePoints must be a list of numbers")

        conformity_plot = data.get("conformityPlot")
        if conformity_plot is not None and conformity_plot not in (
            "vegetation",
            "cable_track",
            "overhang",
        ):
            raise ValueError(
                "conformityPlot must be one of 'vegetation', 'cable_track', 'overhang'"
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
            conformity_plot=conformity_plot,
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
