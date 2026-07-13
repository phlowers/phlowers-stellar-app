# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging
from copy import copy
from dataclasses import dataclass, field
from typing import ClassVar, Optional

from stellar_engine.entities.conformity import (
    ConformityParametersInput,
    TensionRules,
)

logger = logging.getLogger("stellar_engine")


# ---------------------------scenario classes----------------


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
    """Represents a conformity computation scenario.

    This scenario encapsulates the rule type, conformity rule, conformity point (lateral, overhang, or cable_track), security distance, and the target climatic state.
    It is intended to be used in the loop that computes conformity for each rule and point.

    """

    rule_type: str
    conformity_rule: str
    conformity_point: str  # "lateral" or "overhang" or "cable_track"
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
            raise ValueError(
                "ClimaticPoint missing required field: wind_pressure"
            )
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
            self.inverse_lateral_point.wind_pressure = (
                -self.lateral_point.wind_pressure
            )

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

    def interpolate_between_points(
        self, intermediate_points: list[float]
    ) -> list['ClimaticPoint']:
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
                inverse_lateral_pressure * (1 - point)
                + overhang_pressure * point
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

        required_fields = [
            "ruleType",
            "ruleName",
            "lateralPoint",
            "overhangPoint",
        ]
        for fields in required_fields:
            if fields not in data:
                raise ValueError(
                    f"RuleClimaticCondition missing required field: {fields}"
                )

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
    def build_rules_climatic_conditions(
        rules_climatic_conditions_data: list[dict],
    ) -> list['RuleClimaticCondition']:
        """Build list of RuleClimaticCondition from list of dictionaries."""

        rules = []
        for rcc in rules_climatic_conditions_data:
            rule = RuleClimaticCondition.from_dict(rcc)
            rules.append(rule)

        return rules


# ---------------------------Conformity----------------


def build_scenario(
    rule: RuleClimaticCondition,
    # conformity_point: str,
    # temperature_key: Literal["lateral_distance_temperature", "repartition_temperature"],
    parameters: ConformityParametersInput,
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

    if (
        security_distance.lateral is not None
        and rule.lateral_point is not None
    ):
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

    if (
        security_distance.overhang is not None
        and rule.overhang_point is not None
    ):
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

    if parameters.conformity_plot == "cable_track":
        additional_points = rule.interpolate_between_points(
            parameters.intermediate_points
        )
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
                        security_distance=security_distance.lateral,  # Assuming overhang distance for cable_track
                        target_state=target_state,
                    )
                )
                logger.debug(
                    f"Added intermediate scenario for rule {rule.rule_type} with wind pressure {point.wind_pressure} and temperature {point.temperature}"
                )

    return scenarios


def build_scenario_bulk(
    rules_climatic_conditions: list[RuleClimaticCondition],
    parameters: ConformityParametersInput,
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
    scenarios_by_rule: dict[str, list[Scenario]] = {
        rule.rule_type: [] for rule in rules_climatic_conditions
    }

    for rule in rules_climatic_conditions:
        tension_rules_distance = tension_rules.get(rule.rule_type, None)

        if tension_rules_distance is None:
            logger.warning(
                f"No tension rules found for rule type: {rule.rule_type}. Skipping scenario generation."
            )
            continue

        build_scenario_list = build_scenario(
            rule=rule,
            parameters=parameters,
            security_distance=tension_rules_distance,
        )
        scenarios_by_rule[rule.rule_type] = build_scenario_list

    return scenarios_by_rule
