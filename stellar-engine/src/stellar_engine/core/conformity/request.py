# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Validated conformity request parsed from the python task inputs."""

from dataclasses import dataclass

from stellar_engine.core.conformity.scenarios import RuleClimaticCondition
from stellar_engine.entities.conformity import (
    ConformityParametersInput,
    ElectricTensionMapper,
    RuleDistanceInput,
    TensionRules,
)
from stellar_engine.entities.errors import ConformityInputError


def _index(value: object, name: str, default: int | None = None) -> int:
    if value is None and default is not None:
        return default
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        raise ConformityInputError(f"{name} must be a non-negative integer")
    return value


def _rule_types(items: list, name: str) -> None:
    rule_types = [item.rule_type for item in items]
    if len(set(rule_types)) != len(rule_types):
        raise ConformityInputError(f"Duplicate ruleType in {name}")


@dataclass(frozen=True)
class ConformityRequest:
    """Every conformity input, parsed and validated before any computation."""

    obstacle_uuid: str
    obstacle_name: str
    span_index: int
    point_index: int
    parameters: ConformityParametersInput
    rules: tuple[RuleClimaticCondition, ...]
    tension_rules: dict[str, TensionRules]

    @classmethod
    def from_dict(cls, python_inputs: dict) -> 'ConformityRequest':
        """Parse the python task inputs.

        Raises:
            ConformityInputError: If an input is missing or invalid
        """
        obstacle = python_inputs.get("obstacle")
        if not isinstance(obstacle, dict):
            raise ConformityInputError("obstacle must be a dictionary")
        obstacle_uuid = obstacle.get("uuid")
        if not isinstance(obstacle_uuid, str):
            raise ConformityInputError("obstacle uuid must be a string")
        obstacle_name = obstacle.get("name", obstacle_uuid)
        span_index = _index(obstacle.get("supportIndex"), "supportIndex")
        point_index = _index(python_inputs.get("pointIndex"), "pointIndex", 0)

        electric_tension_code = python_inputs.get("electricTension")
        if not isinstance(electric_tension_code, str):
            raise ConformityInputError(
                "Invalid electric tension code: missing or non-string value"
            )
        electric_tension = ElectricTensionMapper.get_code(
            electric_tension_code
        )
        if electric_tension is None:
            raise ConformityInputError(
                f"Invalid electric tension code: {electric_tension_code}"
            )

        parameters = ConformityParametersInput.from_dict(
            python_inputs.get("form", {})
        )

        rules_distances_data = python_inputs.get("rulesDistances")
        if (
            not isinstance(rules_distances_data, list)
            or not rules_distances_data
        ):
            raise ConformityInputError(
                "rulesDistances must be a non-empty list"
            )
        rule_distances = [
            RuleDistanceInput.from_dict(data) for data in rules_distances_data
        ]
        _rule_types(rule_distances, "rulesDistances")

        rules_data = python_inputs.get("rulesClimaticConditions")
        if not isinstance(rules_data, list) or not rules_data:
            raise ConformityInputError(
                "rulesClimaticConditions must be a non-empty list"
            )
        rules = RuleClimaticCondition.build_rules_climatic_conditions(
            rules_data, wind_zone_pressure=parameters.wind_pressure
        )
        _rule_types(rules, "rulesClimaticConditions")

        return cls(
            obstacle_uuid=obstacle_uuid,
            obstacle_name=obstacle_name,
            span_index=span_index,
            point_index=point_index,
            parameters=parameters,
            rules=tuple(rules),
            tension_rules=TensionRules.build_tension_rules(
                electric_tension, rule_distances
            ),
        )
