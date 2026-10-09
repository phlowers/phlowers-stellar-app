# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Climatic scenarios of the conformity rules and their pure builder."""

import logging
from dataclasses import dataclass
from typing import Optional

from stellar_engine.core.conformity.strategies import PlotStrategy
from stellar_engine.entities.conformity import (
    ConformityParametersInput,
    ConformityPlot,
    ScenarioPoint,
    TensionRules,
    _is_number,
)
from stellar_engine.entities.errors import ConformityInputError

logger = logging.getLogger("stellar_engine")


# ---------------------------scenario classes----------------


@dataclass(frozen=True)
class TargetState:
    """Represents the target climatic state for a scenario."""

    new_temperature: float
    wind_pressure: float


@dataclass(frozen=True)
class Scenario:
    """Represents a conformity computation scenario.

    This scenario encapsulates the rule type, conformity plot, conformity point (lateral, overhang, or cable_track), security distance, and the target climatic state.
    It is intended to be used in the loop that computes conformity for each rule and point.

    """

    rule_type: str
    conformity_plot: ConformityPlot
    conformity_point: ScenarioPoint
    security_distance: float
    target_state: TargetState


@dataclass(frozen=True)
class ClimaticPoint:
    """Represents climatic conditions for a conformity point."""

    temperature: Optional[float]
    wind_pressure: float
    # Carried to the output only. The red zone is handled by the caller, which sends
    # the red zone wind pressure as `windPressure` (see ConformityParametersInput).
    red_zone: bool

    @classmethod
    def from_dict(
        cls, data: dict, wind_zone_pressure: float = 0.0
    ) -> 'ClimaticPoint':
        """Create ClimaticPoint from dictionary with validation.

        Args:
            data: Dictionary containing temperature (optional), pressure and red_zone
            wind_zone_pressure: Pressure resolving a "WindZoneInput" value

        Returns:
            ClimaticPoint instance

        Raises:
            ConformityInputError: If required fields are missing or invalid
        """
        if not isinstance(data, dict):
            raise ConformityInputError(
                "ClimaticPoint data must be a dictionary"
            )

        if "pressure" not in data:
            raise ConformityInputError(
                "ClimaticPoint missing required field: pressure"
            )
        if "red_zone" not in data:
            raise ConformityInputError(
                "ClimaticPoint missing required field: red_zone"
            )

        pressure = data["pressure"]
        if pressure != "WindZoneInput" and not _is_number(pressure):
            raise ConformityInputError(
                "ClimaticPoint pressure must be a number or 'WindZoneInput'"
            )
        temperature = data.get("temperature")
        if temperature is not None and not _is_number(temperature):
            raise ConformityInputError(
                "ClimaticPoint temperature must be a number or null"
            )
        if not isinstance(data["red_zone"], bool):
            raise ConformityInputError(
                "ClimaticPoint red_zone must be a boolean"
            )

        return cls(
            temperature=temperature,
            wind_pressure=float(
                wind_zone_pressure if pressure == "WindZoneInput" else pressure
            ),
            red_zone=data["red_zone"],
        )


@dataclass(frozen=True)
class RuleClimaticCondition:
    """Represents climatic conditions for a conformity rule."""

    rule_type: str
    rule_name: str
    lateral_point: ClimaticPoint
    overhang_point: ClimaticPoint

    @classmethod
    def from_dict(
        cls, data: dict, wind_zone_pressure: float = 0.0
    ) -> 'RuleClimaticCondition':
        """Create RuleClimaticCondition from dictionary with validation.

        Args:
            data: Dictionary containing rule configuration
            wind_zone_pressure: Pressure resolving "WindZoneInput" values

        Returns:
            RuleClimaticCondition instance

        Raises:
            ConformityInputError: If required fields are missing or invalid
        """
        if not isinstance(data, dict):
            raise ConformityInputError(
                "RuleClimaticCondition data must be a dictionary"
            )

        required_fields = [
            "ruleType",
            "ruleName",
            "lateralPoint",
            "overhangPoint",
        ]
        for fields in required_fields:
            if fields not in data:
                raise ConformityInputError(
                    f"RuleClimaticCondition missing required field: {fields}"
                )

        return cls(
            rule_type=data["ruleType"],
            rule_name=data["ruleName"],
            lateral_point=ClimaticPoint.from_dict(
                data["lateralPoint"], wind_zone_pressure
            ),
            overhang_point=ClimaticPoint.from_dict(
                data["overhangPoint"], wind_zone_pressure
            ),
        )

    @staticmethod
    def build_rules_climatic_conditions(
        rules_climatic_conditions_data: list[dict],
        wind_zone_pressure: float = 0.0,
    ) -> list['RuleClimaticCondition']:
        """Build list of RuleClimaticCondition from list of dictionaries."""

        rules = []
        for rcc in rules_climatic_conditions_data:
            rule = RuleClimaticCondition.from_dict(rcc, wind_zone_pressure)
            rules.append(rule)

        return rules


# ---------------------------Conformity----------------


class ScenarioBuilder:
    """Builds the climatic scenarios of the rules, without mutating them."""

    def __init__(
        self, parameters: ConformityParametersInput, strategy: PlotStrategy
    ):
        self._parameters = parameters
        self._strategy = strategy

    def build(
        self, rule: RuleClimaticCondition, distances: TensionRules
    ) -> list[Scenario]:
        """Build the scenarios of a rule: lateral, lateral inverse, overhang, then intermediates."""
        parameters = self._parameters
        lateral_temperature = (
            rule.lateral_point.temperature
            if rule.lateral_point.temperature is not None
            else parameters.lateral_distance_temperature
        )
        overhang_temperature = (
            rule.overhang_point.temperature
            if rule.overhang_point.temperature is not None
            else parameters.repartition_temperature
        )
        lateral_pressure = rule.lateral_point.wind_pressure
        if parameters.wind_minus:
            lateral_pressure = -lateral_pressure
        overhang_pressure = rule.overhang_point.wind_pressure

        scenarios = []
        if distances.lateral is not None:
            scenarios.append(
                self._scenario(
                    rule,
                    ScenarioPoint.LATERAL,
                    distances.lateral,
                    lateral_temperature,
                    lateral_pressure,
                )
            )
            scenarios.append(
                self._scenario(
                    rule,
                    ScenarioPoint.LATERAL_INVERSE,
                    distances.lateral,
                    lateral_temperature,
                    -lateral_pressure,
                )
            )

        if distances.overhang is not None:
            scenarios.append(
                self._scenario(
                    rule,
                    ScenarioPoint.OVERHANG,
                    distances.overhang,
                    overhang_temperature,
                    overhang_pressure,
                )
            )

        if (
            self._strategy.uses_intermediate_points
            and distances.lateral is not None
        ):
            for fraction in parameters.intermediate_points:
                for target in (-lateral_pressure, lateral_pressure):
                    scenarios.append(
                        self._scenario(
                            rule,
                            ScenarioPoint.INTERMEDIATE,
                            distances.lateral,
                            # intermediate scenarios keep the lateral temperature
                            lateral_temperature,
                            overhang_pressure * (1 - fraction)
                            + target * fraction,
                        )
                    )

        return scenarios

    def build_all(
        self,
        rules: list[RuleClimaticCondition],
        tension_rules: dict[str, TensionRules],
    ) -> dict[str, list[Scenario]]:
        """Build the scenarios of every rule, organized by rule type.

        A rule without tension rules gets an empty list.
        """
        scenarios_by_rule: dict[str, list[Scenario]] = {
            rule.rule_type: [] for rule in rules
        }

        for rule in rules:
            distances = tension_rules.get(rule.rule_type)
            if distances is None:
                logger.warning(
                    f"No tension rules found for rule type: {rule.rule_type}. Skipping scenario generation."
                )
                continue
            scenarios_by_rule[rule.rule_type].extend(
                self.build(rule, distances)
            )

        return scenarios_by_rule

    def _scenario(
        self,
        rule: RuleClimaticCondition,
        point: ScenarioPoint,
        security_distance: float,
        temperature: float,
        wind_pressure: float,
    ) -> Scenario:
        return Scenario(
            rule_type=rule.rule_type,
            conformity_plot=self._parameters.conformity_plot,
            conformity_point=point,
            security_distance=security_distance,
            target_state=TargetState(
                new_temperature=temperature, wind_pressure=wind_pressure
            ),
        )
