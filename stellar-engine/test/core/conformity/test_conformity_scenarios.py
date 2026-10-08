# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from copy import deepcopy
from unittest.mock import patch

import numpy as np
import pytest
from mechaphlowers import SectionStudy

from stellar_engine.core.conformity.request import ConformityRequest
from stellar_engine.core.conformity.scenarios import (
    RuleClimaticCondition,
    ScenarioBuilder,
)
from stellar_engine.core.conformity.simulation import get_conformity
from stellar_engine.core.conformity.strategies import get_strategy
from stellar_engine.entities.conformity import (
    ConformityParametersInput,
    RuleDistanceInput,
    TensionRules,
)
from stellar_engine.entities.errors import (
    ConformityInputError,
    ObstacleNotFoundError,
    SupportOutOfRangeError,
)
from stellar_engine.plot.obstacles import add_single_obstacle


def test_pressure_rule_with_wind_zone_input(
    build_scenarios, make_form, make_rule, make_distances
):
    """A "WindZoneInput" pressure resolves to the form windPressure."""
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", overhang_pressure="WindZoneInput")],
        make_form(windPressure=250, intermediatePoints=[0.33, 0.66]),
        [make_distances("RULE_1")],
    )

    overhang = next(
        s
        for s in scenarios_by_rule["RULE_1"]
        if s.conformity_point == "overhang"
    )
    assert overhang.target_state.wind_pressure == 250


@pytest.mark.parametrize("wind_pressure", [200, 300])
def test_wind_zone_input_resolved_with_given_pressure(
    build_scenarios, make_form, make_rule, make_distances, wind_pressure
):
    """WindZoneInput is resolved with the pressure given at build time, not a global."""
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1")],
        make_form(windPressure=wind_pressure),
        [make_distances("RULE_1")],
    )

    lateral = next(
        s
        for s in scenarios_by_rule["RULE_1"]
        if s.conformity_point == "lateral"
    )
    assert lateral.target_state.wind_pressure == wind_pressure


def test_get_conformity_does_not_leak_wind_pressure(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Running get_conformity must not change how later rules are built."""
    rules = [make_rule("RULE_1")]
    run_conformity(
        make_python_inputs(
            "vegetation",
            make_form(windPressure=200),
            rules,
            [make_distances("RULE_1")],
        )
    )

    built = RuleClimaticCondition.build_rules_climatic_conditions(
        [make_rule("RULE_1")]
    )

    assert built[0].lateral_point.wind_pressure == 0.0


def test_pressure_rule_with_numeric_value(
    build_scenarios, make_form, make_rule, make_distances
):
    """Test that numeric pressure values are preserved without overwriting.

    Rule: If pressure is a numeric value (not "WindZoneInput"), use it as-is.
    """
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", lateral_pressure=150, overhang_pressure=250)],
        make_form(intermediatePoints=[0.33, 0.66]),
        [make_distances("RULE_1")],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0

    lateral_scenarios = [
        s for s in scenarios if s.conformity_point == "lateral"
    ]
    for scenario in lateral_scenarios:
        assert scenario.target_state.wind_pressure == 150

    overhang_scenarios = [
        s for s in scenarios if s.conformity_point == "overhang"
    ]
    for scenario in overhang_scenarios:
        assert scenario.target_state.wind_pressure == 250


# Rule 2: Overhang temperature handling
def test_overhang_temperature_when_none_uses_repartition_temperature(
    build_scenarios, make_form, make_rule, make_distances
):
    """Test that overhangPoint.temperature = None uses form.repartitionTemperature."""
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1")],
        make_form(intermediatePoints=[0.33, 0.66]),
        [make_distances("RULE_1")],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0

    overhang_scenarios = [
        s for s in scenarios if s.conformity_point == "overhang"
    ]
    assert len(overhang_scenarios) > 0

    for scenario in overhang_scenarios:
        assert scenario.target_state.new_temperature == 70


def test_overhang_temperature_when_explicit_uses_rule_value(
    build_scenarios, make_form, make_rule, make_distances
):
    """An explicit overhangPoint.temperature wins over repartitionTemperature."""
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", overhang_temp=55)],
        make_form(intermediatePoints=[0.33, 0.66]),
        [make_distances("RULE_1")],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0

    overhang_scenarios = [
        s for s in scenarios if s.conformity_point == "overhang"
    ]
    assert len(overhang_scenarios) > 0

    for scenario in overhang_scenarios:
        assert scenario.target_state.new_temperature == 55


# Rule 3: Lateral temperature handling
def test_lateral_temperature_when_none_uses_lateral_distance_temperature(
    build_scenarios, make_form, make_rule, make_distances
):
    """Test that lateralPoint.temperature = None uses form.lateralDistanceTemperature."""
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", lateral_temp=None, overhang_temp=55)],
        make_form(intermediatePoints=[0.33, 0.66]),
        [make_distances("RULE_1")],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0

    lateral_scenarios = [
        s for s in scenarios if s.conformity_point == "lateral"
    ]
    assert len(lateral_scenarios) > 0

    for scenario in lateral_scenarios:
        assert scenario.target_state.new_temperature == 68


def test_lateral_temperature_when_explicit_uses_rule_value(
    build_scenarios, make_form, make_rule, make_distances
):
    """An explicit lateralPoint.temperature wins over lateralDistanceTemperature."""
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", lateral_temp=25, overhang_temp=55)],
        make_form(intermediatePoints=[0.33, 0.66]),
        [make_distances("RULE_1")],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0

    lateral_scenarios = [
        s for s in scenarios if s.conformity_point == "lateral"
    ]
    assert len(lateral_scenarios) > 0

    for scenario in lateral_scenarios:
        assert scenario.target_state.new_temperature == 25


def test_lateral_inverse_temperature_when_explicit_uses_rule_value(
    build_scenarios, make_form, make_rule, make_distances
):
    """The inverse lateral scenario shares the explicit lateral rule temperature."""
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", lateral_temp=25, overhang_temp=55)],
        make_form(),
        [make_distances("RULE_1")],
    )

    inverse = next(
        s
        for s in scenarios_by_rule["RULE_1"]
        if s.conformity_point == "lateral_inverse"
    )
    assert inverse.target_state.new_temperature == 25


# Rule 4: Electric Tension Mapping and Security Distance
@pytest.mark.parametrize(
    "electric_tension,expected_lateral,expected_overhang",
    [
        ("63 KV", 0.6, 1.1),
        ("90 KV", 0.7, 1.2),
        ("150 KV", 0.8, 1.3),
        ("225 KV", 0.9, 1.4),
        ("400 KV", 1.0, 1.5),
    ],
)
def test_electric_tension_mapping_lateral_and_overhang(
    build_scenarios,
    make_form,
    make_rule,
    make_distances,
    electric_tension,
    expected_lateral,
    expected_overhang,
):
    """Test that security distances are correctly mapped based on electric tension.

    Rule: For each electric tension (63/90/150/225/400 KV), scenarios should use the
    corresponding security distance from the rule distances dictionary.
    - Lateral scenarios should use rule.lateral[tension_code]
    - Overhang scenarios should use rule.overhang[tension_code]
    """
    tension_code = electric_tension.split()[0]

    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", overhang_temp=55)],
        make_form(intermediatePoints=[0.33, 0.66]),
        [make_distances("RULE_1")],
        tension=tension_code,
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0

    lateral_scenarios = [
        s for s in scenarios if s.conformity_point == "lateral"
    ]
    assert len(lateral_scenarios) > 0
    for scenario in lateral_scenarios:
        assert scenario.security_distance == expected_lateral

    overhang_scenarios = [
        s for s in scenarios if s.conformity_point == "overhang"
    ]
    assert len(overhang_scenarios) > 0
    for scenario in overhang_scenarios:
        assert scenario.security_distance == expected_overhang


# Rule 5: Wind Minus Handling
def test_wind_minus_false_keeps_lateral_positive_inverse_negative(
    build_scenarios, make_form, make_rule, make_distances
):
    """With windMinus=False the lateral pressure is positive and the inverse negative."""
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", overhang_temp=55)],
        make_form(windMinus=False, intermediatePoints=[0.33, 0.66]),
        [make_distances("RULE_1")],
    )

    by_point = {s.conformity_point: s for s in scenarios_by_rule["RULE_1"]}
    assert by_point["lateral"].target_state.wind_pressure == 200
    assert by_point["lateral_inverse"].target_state.wind_pressure == -200
    assert by_point["overhang"].target_state.wind_pressure == 0


@pytest.mark.parametrize("lateral_pressure", [200, "WindZoneInput"])
def test_wind_minus_true_flips_lateral_sign(
    build_scenarios, make_form, make_rule, make_distances, lateral_pressure
):
    """With windMinus=True the lateral pressure is negative and the inverse positive."""
    scenarios_by_rule = build_scenarios(
        [
            make_rule(
                "RULE_1",
                lateral_pressure=lateral_pressure,
                overhang_temp=55,
                overhang_pressure=250,
            )
        ],
        make_form(windMinus=True),
        [make_distances("RULE_1")],
    )

    by_point = {s.conformity_point: s for s in scenarios_by_rule["RULE_1"]}
    assert by_point["lateral"].target_state.wind_pressure == -200
    assert by_point["lateral_inverse"].target_state.wind_pressure == 200
    assert by_point["overhang"].target_state.wind_pressure == 250


# ============================================================================
# SCENARIOS BUILDER LOGIC TESTS
# ============================================================================
# These tests verify the core logic of how scenarios are generated based on
# the conformity points (lateral, overhang) and the conformity plot type.


def test_overhang_point_only_produces_one_scenario(
    build_scenarios, make_form, make_rule, make_distances
):
    """Test that a rule with ONLY an overhang point produces exactly 1 scenario.

    Rule: For an overhang point with a valid overhang security distance,
    build_scenario should produce exactly 1 scenario with conformity_point="overhang".

    No lateral scenarios should be created because there are no lateral distances.
    """
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", lateral_pressure=200, overhang_temp=55)],
        make_form(conformityPlot="overhang", intermediatePoints=[]),
        [make_distances("RULE_1", lateral=None)],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]

    assert len(scenarios) == 1, (
        f"Expected exactly 1 scenario for overhang-only rule, "
        f"but got {len(scenarios)}. "
        f"Conformity points: {[s.conformity_point for s in scenarios]}"
    )

    assert scenarios[0].conformity_point == "overhang", (
        f"Expected conformity_point='overhang', "
        f"but got '{scenarios[0].conformity_point}'"
    )


def test_build_does_not_mutate_rule(make_form, make_rule):
    rule_data = make_rule("RULE_1", overhang_temp=55)
    rule = RuleClimaticCondition.from_dict(rule_data)
    parameters = ConformityParametersInput.from_dict(
        {
            **make_form(conformityPlot="overhang", windMinus=True),
            "selectedConformityRules": ["RULE_1"],
        }
    )
    builder = ScenarioBuilder(parameters, get_strategy("overhang"))
    distances = TensionRules(lateral=1.0, overhang=1.5)

    first = builder.build(rule, distances)
    second = builder.build(rule, distances)

    assert first == second
    assert rule == RuleClimaticCondition.from_dict(rule_data)


def test_cable_track_without_lateral_distance_has_no_intermediate_scenario(
    build_scenarios, make_form, make_rule, make_distances
):
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1")],
        make_form(conformityPlot="cable_track", intermediatePoints=[0.5]),
        [make_distances("RULE_1", lateral=None)],
    )

    points = [s.conformity_point for s in scenarios_by_rule["RULE_1"]]
    assert points == ["overhang"]


def test_rule_distance_from_dict_does_not_mutate_input(make_distances):
    """from_dict maps a missing distance to {} on the instance only."""
    data = make_distances("RULE_1", lateral=None)
    original = deepcopy(data)

    rule_distance = RuleDistanceInput.from_dict(data)

    assert data == original
    assert rule_distance.lateral == {}


def test_lateral_point_only_produces_two_scenarios(
    build_scenarios, make_form, make_rule, make_distances
):
    """Test that a rule with ONLY a lateral point produces exactly 2 scenarios.

    Rule: For a lateral point with a valid lateral security distance,
    build_scenario should produce exactly 2 scenarios:
    - conformity_point="lateral" (normal wind direction)
    - conformity_point="lateral_inverse" (inverse wind direction)

    The lateral_inverse scenario should have negated wind pressure.
    No overhang scenarios should be created because there are no overhang distances.
    """
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", lateral_pressure=200, overhang_temp=55)],
        make_form(conformityPlot="vegetation", intermediatePoints=[]),
        [make_distances("RULE_1", overhang=None)],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]

    assert len(scenarios) == 2, (
        f"Expected exactly 2 scenarios for lateral-only rule, "
        f"but got {len(scenarios)}. "
        f"Conformity points: {[s.conformity_point for s in scenarios]}"
    )

    conformity_points = sorted([s.conformity_point for s in scenarios])
    expected_points = sorted(["lateral", "lateral_inverse"])
    assert conformity_points == expected_points, (
        f"Expected conformity points {expected_points}, "
        f"but got {conformity_points}"
    )

    assert scenarios[0].security_distance == scenarios[1].security_distance, (
        f"Lateral and lateral_inverse should have the same security distance, "
        f"but got {scenarios[0].security_distance} and {scenarios[1].security_distance}"
    )

    lateral_scenario = next(
        s for s in scenarios if s.conformity_point == "lateral"
    )
    lateral_inverse_scenario = next(
        s for s in scenarios if s.conformity_point == "lateral_inverse"
    )

    lateral_pressure = lateral_scenario.target_state.wind_pressure
    inverse_pressure = lateral_inverse_scenario.target_state.wind_pressure

    assert inverse_pressure == -lateral_pressure, (
        f"Expected lateral_inverse pressure ({inverse_pressure}) to be "
        f"the negative of lateral pressure ({lateral_pressure}), "
        f"but they don't match. "
        f"Lateral: {lateral_pressure}, Inverse: {inverse_pressure}"
    )


def test_both_lateral_and_overhang_produces_three_scenarios(
    build_scenarios, make_form, make_rule, make_distances
):
    """Test that a rule with BOTH lateral and overhang produces exactly 3 scenarios.

    Rule: For a rule with both lateral and overhang points:
    - 1 overhang scenario: conformity_point="overhang"
    - 2 lateral scenarios: conformity_point="lateral" and "lateral_inverse"

    Total = 3 scenarios per rule.
    """
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", lateral_pressure=200, overhang_temp=55)],
        make_form(conformityPlot="vegetation", intermediatePoints=[]),
        [make_distances("RULE_1")],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]

    assert len(scenarios) == 3, (
        f"Expected exactly 3 scenarios for rule with both lateral and overhang, "
        f"but got {len(scenarios)}. "
        f"Conformity points: {[s.conformity_point for s in scenarios]}"
    )

    conformity_points = sorted([s.conformity_point for s in scenarios])
    expected_points = sorted(["lateral", "lateral_inverse", "overhang"])
    assert conformity_points == expected_points, (
        f"Expected conformity points {expected_points}, "
        f"but got {conformity_points}"
    )

    lateral_scenarios = [
        s for s in scenarios if "lateral" in s.conformity_point
    ]
    overhang_scenarios = [
        s for s in scenarios if s.conformity_point == "overhang"
    ]

    assert len(lateral_scenarios) == 2, "Should have 2 lateral scenarios"
    assert len(overhang_scenarios) == 1, "Should have 1 overhang scenario"

    lateral_distances = [s.security_distance for s in lateral_scenarios]
    assert (
        lateral_distances[0] == lateral_distances[1]
    ), "Both lateral scenarios should have the same security distance"
    assert (
        lateral_distances[0] != overhang_scenarios[0].security_distance
    ), "Lateral and overhang security distances should be different"


def test_multiple_rules_scenario_count(
    build_scenarios, make_form, make_rule, make_distances
):
    """Test that multiple rules produce the correct total scenario count.

    Rule: Total scenarios = sum of scenarios per rule
    - RULE_1 (lateral only): 2 scenarios
    - RULE_2 (overhang only): 1 scenario
    - RULE_3 (both lateral and overhang): 3 scenarios
    - Total: 2 + 1 + 3 = 6 scenarios
    """
    scenarios_by_rule = build_scenarios(
        [
            make_rule("RULE_1", lateral_pressure=200, overhang_temp=55),
            make_rule(
                "RULE_2",
                lateral_temp=20,
                lateral_pressure=180,
                overhang_temp=50,
            ),
            make_rule(
                "RULE_3",
                lateral_temp=25,
                lateral_pressure=190,
                overhang_temp=60,
            ),
        ],
        make_form(conformityPlot="vegetation", intermediatePoints=[]),
        [
            make_distances("RULE_1", overhang=None),
            make_distances("RULE_2", lateral=None),
            make_distances(
                "RULE_3",
                lateral={
                    "63": 0.5,
                    "90": 0.6,
                    "150": 0.7,
                    "225": 0.8,
                    "400": 0.9,
                },
                overhang={
                    "63": 1.2,
                    "90": 1.3,
                    "150": 1.4,
                    "225": 1.5,
                    "400": 1.6,
                },
            ),
        ],
    )

    assert "RULE_1" in scenarios_by_rule, "RULE_1 should have scenarios"
    assert "RULE_2" in scenarios_by_rule, "RULE_2 should have scenarios"
    assert "RULE_3" in scenarios_by_rule, "RULE_3 should have scenarios"

    assert len(scenarios_by_rule["RULE_1"]) == 2, (
        f"RULE_1 (lateral only) should have 2 scenarios, "
        f"but got {len(scenarios_by_rule['RULE_1'])}"
    )
    assert len(scenarios_by_rule["RULE_2"]) == 1, (
        f"RULE_2 (overhang only) should have 1 scenario, "
        f"but got {len(scenarios_by_rule['RULE_2'])}"
    )
    assert len(scenarios_by_rule["RULE_3"]) == 3, (
        f"RULE_3 (both) should have 3 scenarios, "
        f"but got {len(scenarios_by_rule['RULE_3'])}"
    )

    total_scenarios = sum(
        len(scenarios) for scenarios in scenarios_by_rule.values()
    )
    assert total_scenarios == 6, (
        f"Expected total of 6 scenarios (2+1+3), "
        f"but got {total_scenarios}. "
        f"Breakdown: RULE_1={len(scenarios_by_rule['RULE_1'])}, "
        f"RULE_2={len(scenarios_by_rule['RULE_2'])}, "
        f"RULE_3={len(scenarios_by_rule['RULE_3'])}"
    )


@pytest.mark.parametrize("wind_minus", [False, True])
def test_cable_track_intermediate_wind_pressures(
    build_scenarios, make_form, make_rule, make_distances, wind_minus
):
    """Intermediate pressures are symmetric around the overhang pressure."""
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", lateral_pressure=30, overhang_temp=55)],
        make_form(
            conformityPlot="cable_track",
            intermediatePoints=[0.33, 0.66],
            windMinus=wind_minus,
        ),
        [make_distances("RULE_1")],
    )

    pressures = sorted(
        s.target_state.wind_pressure for s in scenarios_by_rule["RULE_1"]
    )
    assert pressures == pytest.approx([-30, -19.8, -9.9, 0, 9.9, 19.8, 30])


def test_cable_track_with_intermediate_points_produces_intermediate_scenarios(
    build_scenarios, make_form, make_rule, make_distances
):
    """Test that cable_track conformity plot produces intermediate scenarios.

    Rule: For conformity_plot="cable_track" with intermediatePoints=[0.33, 0.66]:
    - Overhang scenarios: 1
    - Lateral scenarios: 2
    - Intermediate scenarios: 2 per intermediate fraction = 2 * 2 = 4
    - Total: 1 + 2 + 4 = 7 scenarios

    Intermediate scenarios interpolate between lateral and overhang climatic points
    at the specified fractions along the cable span.
    """
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", lateral_pressure=200, overhang_temp=55)],
        make_form(
            conformityPlot="cable_track", intermediatePoints=[0.33, 0.66]
        ),
        [make_distances("RULE_1")],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]

    overhang_count = len(
        [s for s in scenarios if s.conformity_point == "overhang"]
    )
    lateral_count = len(
        [s for s in scenarios if s.conformity_point == "lateral"]
    )
    lateral_inverse_count = len(
        [s for s in scenarios if s.conformity_point == "lateral_inverse"]
    )
    intermediate_count = len(
        [s for s in scenarios if s.conformity_point == "intermediate"]
    )

    assert (
        overhang_count == 1
    ), f"Expected 1 overhang scenario, but got {overhang_count}"
    assert (
        lateral_count == 1
    ), f"Expected 1 lateral scenario, but got {lateral_count}"
    assert (
        lateral_inverse_count == 1
    ), f"Expected 1 lateral_inverse scenario, but got {lateral_inverse_count}"

    # Intermediate scenarios: 2 per intermediate fraction (forward and inverse)
    assert intermediate_count == 4, (
        f"Expected 4 intermediate scenarios (2 points * 2 directions), "
        f"but got {intermediate_count}. "
        f"Total scenarios: {len(scenarios)}"
    )

    total_expected = (
        overhang_count
        + lateral_count
        + lateral_inverse_count
        + intermediate_count
    )
    assert len(scenarios) == total_expected, (
        f"Expected {total_expected} total scenarios, "
        f"but got {len(scenarios)}. "
        f"Breakdown: overhang={overhang_count}, lateral={lateral_count}, "
        f"lateral_inverse={lateral_inverse_count}, intermediate={intermediate_count}"
    )


# ============================================================================
# ERROR AND EDGE CASES
# ============================================================================


def test_build_all_skips_rule_missing_from_tension_rules(make_form, make_rule):
    rules = RuleClimaticCondition.build_rules_climatic_conditions(
        [make_rule("RULE_1")]
    )
    parameters = ConformityParametersInput.from_dict(
        {**make_form(), "selectedConformityRules": ["RULE_1"]}
    )
    builder = ScenarioBuilder(
        parameters, get_strategy(parameters.conformity_plot)
    )

    assert builder.build_all(rules, {}) == {"RULE_1": []}


def test_get_conformity_with_empty_rules_distances_raises(
    study_base, make_python_inputs, make_form, make_rule
):
    python_inputs = make_python_inputs(
        "vegetation", make_form(), [make_rule("RULE_1")], []
    )

    with pytest.raises(ConformityInputError):
        get_conformity(python_inputs, study_base)


def _set(*path, value):
    def mutate(inputs):
        target = inputs
        for key in path[:-1]:
            target = target[key]
        target[path[-1]] = value

    return mutate


def _duplicate_first(key):
    def mutate(inputs):
        inputs[key].append(deepcopy(inputs[key][0]))

    return mutate


@pytest.mark.parametrize(
    "mutate",
    [
        pytest.param(
            lambda inputs: inputs["obstacle"].pop("uuid"),
            id="no-obstacle-uuid",
        ),
        pytest.param(
            _set("obstacle", "supportIndex", value=None),
            id="support-index-none",
        ),
        pytest.param(
            _set("obstacle", "supportIndex", value=-1),
            id="support-index-negative",
        ),
        pytest.param(_set("pointIndex", value="a"), id="point-index-text"),
        pytest.param(
            _set("rulesClimaticConditions", value=[]),
            id="no-climatic-condition",
        ),
        pytest.param(
            _duplicate_first("rulesClimaticConditions"),
            id="duplicate-climatic-rule",
        ),
        pytest.param(
            _duplicate_first("rulesDistances"), id="duplicate-distance-rule"
        ),
        pytest.param(
            _set("rulesDistances", 0, "lateral", value={"63": 1.0}),
            id="distance-without-tension",
        ),
        pytest.param(
            _set(
                "rulesClimaticConditions",
                0,
                "lateralPoint",
                "pressure",
                value=None,
            ),
            id="lateral-pressure-none",
        ),
        pytest.param(
            _set(
                "rulesClimaticConditions",
                0,
                "lateralPoint",
                "temperature",
                value="hot",
            ),
            id="lateral-temperature-text",
        ),
        pytest.param(
            _set("form", "windPressure", value=True), id="wind-pressure-bool"
        ),
        pytest.param(
            _set("form", "intermediatePoints", value=[1.5]),
            id="intermediate-point-above-one",
        ),
    ],
)
def test_conformity_request_rejects_invalid_inputs(
    make_python_inputs, make_form, make_rule, make_distances, mutate
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(),
        [make_rule("RULE_1")],
        [make_distances("RULE_1")],
    )
    mutate(python_inputs)

    with pytest.raises(ConformityInputError):
        ConformityRequest.from_dict(python_inputs)


def test_get_conformity_with_last_support_index_raises(
    study_base, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(),
        [make_rule("RULE_1")],
        [make_distances("RULE_1")],
    )
    add_single_obstacle(
        {"obstacles": [python_inputs["obstacle"]]}, study_base, support_index=0
    )
    python_inputs["obstacle"]["supportIndex"] = 3

    with pytest.raises(SupportOutOfRangeError):
        get_conformity(python_inputs, study_base)


def test_get_conformity_with_invalid_voltage_raises(
    study_base, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(),
        [make_rule("RULE_1")],
        [make_distances("RULE_1")],
        tension="12 KV",
    )

    with pytest.raises(ValueError):
        get_conformity(python_inputs, study_base)


def test_get_conformity_with_unknown_obstacle_raises(
    study_base, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(),
        [make_rule("RULE_1")],
        [make_distances("RULE_1")],
    )
    add_single_obstacle(
        {"obstacles": [python_inputs["obstacle"]]}, study_base, support_index=0
    )
    python_inputs["obstacle"]["uuid"] = "00000000-0000-0000-0000-000000000000"

    with pytest.raises(ObstacleNotFoundError):
        get_conformity(python_inputs, study_base)


def test_get_conformity_leaves_study_unchanged(
    study_base, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(),
        [make_rule("RULE_1", lateral_pressure=400)],
        [make_distances("RULE_1")],
    )
    study_base.solve_adjustment()
    study_base.solve_change_state()
    add_single_obstacle(
        {"obstacles": [python_inputs["obstacle"]]}, study_base, support_index=0
    )
    coords_calculator = study_base.position_engine.coords_calculator
    before = np.array(coords_calculator.get_spans(frame="section").coords)

    get_conformity(python_inputs, study_base)

    after = np.array(coords_calculator.get_spans(frame="section").coords)
    np.testing.assert_allclose(after, before)


@pytest.mark.parametrize("point_index", [0, 1])
def test_get_conformity_obstacle_name_includes_point_number(
    run_conformity,
    make_python_inputs,
    make_form,
    make_rule,
    make_distances,
    point_index,
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(),
        [make_rule("RULE_1")],
        [make_distances("RULE_1")],
        obstacle_name="ttt",
    )
    python_inputs["obstacle"]["positions"] = [
        {"x": 10, "y": 5, "z": 65},
        {"x": 20, "y": 6, "z": 66},
    ]
    python_inputs["pointIndex"] = point_index

    result = run_conformity(python_inputs)

    assert result["obstacle"]["name"] == f"ttt point {point_index + 1}"


def test_get_conformity_with_out_of_range_point_index_raises(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(),
        [make_rule("RULE_1")],
        [make_distances("RULE_1")],
    )
    python_inputs["pointIndex"] = 5

    with pytest.raises(ValueError, match="out of range"):
        run_conformity(python_inputs)


@pytest.mark.parametrize(
    "override",
    [
        {"windMinus": "yes"},
        {"conformityPlot": "unknown"},
        {"conformityPlot": None},
        {"intermediatePoints": ["a"]},
        {"intermediatePoints": 0.5},
    ],
)
def test_conformity_parameters_reject_invalid_values(make_form, override):
    data = {**make_form(**override), "selectedConformityRules": ["RULE_1"]}

    with pytest.raises(ValueError):
        ConformityParametersInput.from_dict(data)


@pytest.mark.parametrize("span_index", [0, 1, 2])
def test_line_axis_distances_are_measured_from_the_span_axis(
    study_angled,
    make_python_inputs,
    make_form,
    make_rule,
    make_distances,
    span_index,
):
    python_inputs = make_python_inputs(
        "traffic_lane",
        make_form(conformityPlot="overhang"),
        [make_rule("AT")],
        [make_distances("AT", lateral=None)],
        obstacle_position={"x": 250, "y": 0, "z": 30},
    )
    python_inputs["obstacle"]["supportIndex"] = span_index
    add_single_obstacle(
        {"obstacles": [python_inputs["obstacle"]]},
        study_angled,
        support_index=span_index,
    )

    result = get_conformity(python_inputs, study_angled)

    assert result["obstacle"]["points"][0]["x"] == pytest.approx(0, abs=1e-6)
    # The crossarm is 10 m long.
    assert result["results"]["AT"][
        "overhangCableLineAxisDistance"
    ] == pytest.approx(10, abs=2.5)


def test_scenarios_are_solved_with_clockwise_wind(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(),
        [make_rule("RULE_1")],
        [make_distances("RULE_1")],
    )
    original = SectionStudy.solve_change_state

    with patch.object(
        SectionStudy,
        "solve_change_state",
        autospec=True,
        side_effect=original,
    ) as spy:
        run_conformity(python_inputs)

    assert spy.call_args_list
    assert all(
        call.kwargs["wind_direction"] == "clockwise"
        for call in spy.call_args_list
    )


def test_runner_solves_each_climatic_state_once(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(intermediatePoints=[]),
        [make_rule("RULE_1"), make_rule("RULE_2")],
        [make_distances("RULE_1"), make_distances("RULE_2")],
    )
    original = SectionStudy.solve_change_state

    with patch.object(
        SectionStudy,
        "solve_change_state",
        autospec=True,
        side_effect=original,
    ) as spy:
        run_conformity(python_inputs)

    assert len(spy.call_args_list) == 3
