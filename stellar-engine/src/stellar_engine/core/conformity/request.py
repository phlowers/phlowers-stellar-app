# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Validated conformity request parsed from the python task inputs."""

import math
from dataclasses import dataclass

from stellar_engine.core.conformity.scenarios import RuleClimaticCondition
from stellar_engine.entities.conformity import (
    ConformityParametersInput,
    ConformityPlot,
    ElectricTensionMapper,
    RuleDistanceInput,
    TensionRules,
)
from stellar_engine.entities.errors import ConformityInputError


def _check_dict_value_nonnegative_integer_or_bool(
    dictionary: dict, key: str, default: int | None = None
) -> int:
    """Validate and normalize an index-like input value.

    If the value is missing (None) and a default is provided, return that default.
    Otherwise, the value must be a non-negative integer. Boolean values are rejected
    because they are not valid indexes, and negative numbers are rejected.

    Args:
        value: Candidate index value extracted from the task input.
        name: Human-readable field name used in validation errors.
        default: Optional fallback used when the input is missing.

    Returns:
        The validated non-negative integer index.

    Raises:
        ConformityInputError: If the value is not a valid non-negative integer.
    """

    value = dictionary.get(key, default)
    if value is None and default is not None:
        return default
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        raise ConformityInputError(
            f"{key} must be a non-negative integer or boolean"
        )
    return value


def _rule_types(items: list, name: str) -> None:
    rule_types = [item.rule_type for item in items]
    if len(set(rule_types)) != len(rule_types):
        raise ConformityInputError(f"Duplicate ruleType in {name}")


def _parse_shared_inputs(
    python_inputs: dict,
) -> tuple[
    str,
    ConformityParametersInput,
    tuple[RuleClimaticCondition, ...],
    dict[str, TensionRules],
]:
    """Parse the tension, form, rules, and distances shared by conformity tools."""
    electric_tension_code = python_inputs.get("electricTension")
    if not isinstance(electric_tension_code, str):
        raise ConformityInputError(
            "Invalid electric tension code: missing or non-string value"
        )
    electric_tension = ElectricTensionMapper.get_code(electric_tension_code)
    if electric_tension is None:
        raise ConformityInputError(
            f"Invalid electric tension code: {electric_tension_code}"
        )

    parameters = ConformityParametersInput.from_dict(
        python_inputs.get("form", {})
    )

    rules_distances_data = python_inputs.get("rulesDistances")
    if not isinstance(rules_distances_data, list) or not rules_distances_data:
        raise ConformityInputError("rulesDistances must be a non-empty list")
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
    tension_rules = TensionRules.build_tension_rules(
        electric_tension, rule_distances
    )
    return electric_tension_code, parameters, tuple(rules), tension_rules


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
        span_index = _check_dict_value_nonnegative_integer_or_bool(
            obstacle,
            "supportIndex",
        )
        point_index = _check_dict_value_nonnegative_integer_or_bool(
            python_inputs, "pointIndex", 0
        )
        _, parameters, rules, tension_rules = _parse_shared_inputs(
            python_inputs
        )

        return cls(
            obstacle_uuid=obstacle_uuid,
            obstacle_name=obstacle_name,
            span_index=span_index,
            point_index=point_index,
            parameters=parameters,
            rules=rules,
            tension_rules=tension_rules,
        )


@dataclass(frozen=True)
class ForestTrenchBaseCase:
    """Climatic conditions of the additional forest-trenches base case."""

    name: str
    temperature: float
    wind: float


@dataclass(frozen=True)
class ForestTrenchSpanInput:
    """Ground points and section span index for one forest-trenches span."""

    span_index: int
    distances: tuple[float, ...]
    altitudes: tuple[float, ...]


@dataclass(frozen=True)
class ForestTrenchRequest:
    """Validated request for the multi-point forest-trenches simulation."""

    electric_tension: str
    parameters: ConformityParametersInput
    rules: tuple[RuleClimaticCondition, ...]
    tension_rules: dict[str, TensionRules]
    overhang_rules: tuple[str, ...]
    lateral_rules: tuple[str, ...]
    base_case: ForestTrenchBaseCase
    spans: tuple[ForestTrenchSpanInput, ...]

    @classmethod
    def from_dict(cls, python_inputs: dict) -> "ForestTrenchRequest":
        """Parse and validate the forest-trenches task inputs."""
        (
            electric_tension,
            parameters,
            rules,
            tension_rules,
        ) = _parse_shared_inputs(python_inputs)
        if parameters.conformity_plot != ConformityPlot.FOREST_TRENCHES:
            raise ConformityInputError(
                "conformityPlot must be 'forest_trenches'"
            )

        overhang_rules = python_inputs.get("overhangRules")
        if not isinstance(overhang_rules, list) or not all(
            isinstance(rule, str) for rule in overhang_rules
        ):
            raise ConformityInputError(
                "overhangRules must be a list of strings"
            )
        lateral_rules = python_inputs.get("lateralRules")
        if not isinstance(lateral_rules, list) or not all(
            isinstance(rule, str) for rule in lateral_rules
        ):
            raise ConformityInputError(
                "lateralRules must be a list of strings"
            )

        base_case = python_inputs.get("baseCase")
        if not isinstance(base_case, dict):
            raise ConformityInputError("baseCase must be a dictionary")
        base_name = base_case.get("name")
        temperature = base_case.get("temperature")
        wind = base_case.get("wind")
        if not isinstance(base_name, str):
            raise ConformityInputError("baseCase name must be a string")
        if not _is_finite_number(temperature) or not _is_finite_number(wind):
            raise ConformityInputError(
                "baseCase temperature and wind must be finite numbers"
            )

        spans_data = python_inputs.get("spans")
        if not isinstance(spans_data, list) or not spans_data:
            raise ConformityInputError("spans must be a non-empty list")
        spans = []
        seen_span_indices = set()
        for span_data in spans_data:
            if not isinstance(span_data, dict):
                raise ConformityInputError("span entries must be dictionaries")
            span_index = _check_dict_value_nonnegative_integer_or_bool(
                span_data, "spanIndex"
            )
            if span_index in seen_span_indices:
                raise ConformityInputError(
                    f"Duplicate spanIndex in spans: {span_index}"
                )
            seen_span_indices.add(span_index)

            distances = span_data.get("distances")
            altitudes = span_data.get("altitudes")
            if (
                not isinstance(distances, list)
                or not isinstance(altitudes, list)
                or len(distances) < 2
                or len(distances) != len(altitudes)
            ):
                raise ConformityInputError(
                    "span distances and altitudes must be equal-length lists with at least two points"
                )
            if not all(_is_finite_number(value) for value in distances):
                raise ConformityInputError(
                    "span distances must be finite numbers"
                )
            if not all(_is_finite_number(value) for value in altitudes):
                raise ConformityInputError(
                    "span altitudes must be finite numbers"
                )
            spans.append(
                ForestTrenchSpanInput(
                    span_index=span_index,
                    distances=tuple(float(value) for value in distances),
                    altitudes=tuple(float(value) for value in altitudes),
                )
            )

        return cls(
            electric_tension=electric_tension,
            parameters=parameters,
            rules=rules,
            tension_rules=tension_rules,
            overhang_rules=tuple(overhang_rules),
            lateral_rules=tuple(lateral_rules),
            base_case=ForestTrenchBaseCase(
                name=base_name,
                temperature=float(temperature),
                wind=float(wind),
            ),
            spans=tuple(spans),
        )


def _is_finite_number(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
    )
