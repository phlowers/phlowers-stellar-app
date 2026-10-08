# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Conformity input entities for structured conformity computation parameters."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Optional

from stellar_engine.entities.errors import ConformityInputError

logger = logging.getLogger("stellar_engine")


def _is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


class ConformityPlot(StrEnum):
    """Obstacle plot types of the conformity form."""

    CABLE_TRACK = "cable_track"
    VEGETATION = "vegetation"
    OVERHANG = "overhang"


class ScenarioPoint(StrEnum):
    """Climatic points a conformity scenario is solved for."""

    LATERAL = "lateral"
    LATERAL_INVERSE = "lateral_inverse"
    OVERHANG = "overhang"
    INTERMEDIATE = "intermediate"


# Scenarios reported in the lateral column of the conformity table.
LATERAL_SIDE_POINTS = frozenset(
    {
        ScenarioPoint.LATERAL,
        ScenarioPoint.LATERAL_INVERSE,
        ScenarioPoint.INTERMEDIATE,
    }
)

# --------data classes for conformity input entities----------------


@dataclass
class TensionRules:
    """Represents lateral and overhang tension rules for a rule type."""

    lateral: Optional[float]
    overhang: Optional[float]

    @staticmethod
    def build_tension_rules(
        electric_tension: str, rule_distances: list['RuleDistanceInput']
    ) -> dict[str, 'TensionRules']:
        """Build a mapping of rule types to TensionRules based on electric tension and rule distances."""
        tension_rules: dict[str, TensionRules] = {}
        for rd in rule_distances:
            sides: dict[str, Optional[float]] = {}
            for side, distances in (
                ("lateral", rd.lateral),
                ("overhang", rd.overhang),
            ):
                if distances and electric_tension not in distances:
                    raise ConformityInputError(
                        f"Rule {rd.rule_type} has no {side} distance for tension {electric_tension}"
                    )
                sides[side] = (
                    distances[electric_tension] if distances else None
                )
            tension_rules[rd.rule_type] = TensionRules(
                lateral=sides["lateral"], overhang=sides["overhang"]
            )

        return tension_rules


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
            ConformityInputError: If required fields are missing or invalid
        """
        if not isinstance(data, dict):
            raise ConformityInputError(
                "RuleDistance data must be a dictionary"
            )

        required_fields = ["ruleType", "lateral", "overhang"]
        for fields in required_fields:
            if fields not in data:
                raise ConformityInputError(
                    f"RuleDistance missing required field: {fields}"
                )

        lateral = data["lateral"]
        if not isinstance(lateral, dict):
            logger.warning(
                "RuleDistance lateral is missing, it could be normal if this is the configuration"
            )
            lateral = {}
        overhang = data["overhang"]
        if not isinstance(overhang, dict):
            logger.warning(
                "RuleDistance overhang is missing, it could be normal if this is the configuration"
            )
            overhang = {}

        for side, distances in (("lateral", lateral), ("overhang", overhang)):
            if not all(_is_number(value) for value in distances.values()):
                raise ConformityInputError(
                    f"RuleDistance {side} distances must be numbers"
                )

        return cls(
            rule_type=data["ruleType"],
            lateral=lateral,
            overhang=overhang,
        )


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
    """Represents form parameters for conformity computation.

    The red zone is handled by the caller: `wind_pressure` already holds the red zone
    pressure of the wind zone when `red_zone_presence` is True. `red_zone_presence`
    is validated here but does not change the computation.
    """

    wind_zone: str
    wind_pressure: float
    wind_minus: bool
    red_zone_presence: bool
    repartition_temperature: float
    lateral_distance_temperature: float
    selected_conformity_rules: list[str]
    conformity_plot: ConformityPlot
    intermediate_points: list[float] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict) -> 'ConformityParametersInput':
        """Create ConformityParameters from dictionary with validation.

        Args:
            data: Dictionary containing form parameters

        Returns:
            ConformityParameters instance

        Raises:
            ConformityInputError: If required fields are missing or invalid
        """
        if not isinstance(data, dict):
            raise ConformityInputError(
                "ConformityParameters data must be a dictionary"
            )

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
                raise ConformityInputError(
                    f"ConformityParameters missing required field: {fields}"
                )

        if not isinstance(data["windZone"], str):
            raise ConformityInputError("windZone must be a string")
        if not _is_number(data["windPressure"]):
            raise ConformityInputError("windPressure must be a float")
        if not isinstance(data["windMinus"], bool):
            raise ConformityInputError("windMinus must be a boolean")
        if not isinstance(data["redZonePresence"], bool):
            raise ConformityInputError("redZonePresence must be a boolean")
        if not _is_number(data["repartitionTemperature"]):
            raise ConformityInputError(
                "repartitionTemperature must be a float"
            )
        if not _is_number(data["lateralDistanceTemperature"]):
            raise ConformityInputError(
                "lateralDistanceTemperature must be a float"
            )
        if not isinstance(data["selectedConformityRules"], list) or not all(
            isinstance(r, str) for r in data["selectedConformityRules"]
        ):
            raise ConformityInputError(
                "selectedConformityRules must be a list of strings"
            )

        intermediate_points = data.get("intermediatePoints", [])
        if not isinstance(intermediate_points, list) or not all(
            _is_number(point) and 0 <= point <= 1
            for point in intermediate_points
        ):
            raise ConformityInputError(
                "intermediatePoints must be a list of numbers between 0 and 1"
            )

        try:
            conformity_plot = ConformityPlot(data["conformityPlot"])
        except ValueError:
            raise ConformityInputError(
                "conformityPlot must be one of 'vegetation', 'cable_track', 'overhang'"
            ) from None

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
