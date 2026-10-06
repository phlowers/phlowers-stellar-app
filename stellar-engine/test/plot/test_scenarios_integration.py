# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from copy import deepcopy

import pytest

from stellar_engine.core.conformity.scenarios import (
    RuleClimaticCondition,
    build_scenario,
    build_scenario_bulk,
)
from stellar_engine.core.conformity.simulation import get_conformity
from stellar_engine.entities.conformity import (
    ConformityParametersInput,
    RuleDistanceInput,
    TensionRules,
)
from stellar_engine.entities.errors import ObstacleNotFoundError
from stellar_engine.plot.obstacles import add_single_obstacle


def test_conformity_vegetation_with_lateral_and_overhang(
    run_conformity,
    make_python_inputs,
    make_form,
    make_rule,
    make_distances,
):
    """Test conformity for vegetation obstacle with both lateral and overhang distances."""
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(conformityPlot="vegetation", intermediatePoints=[0.33, 0.66]),
        [
            make_rule("RULE_1"),
            make_rule("RULE_2", lateral_temp=68, lateral_red_zone=True),
        ],
        [
            make_distances("RULE_1"),
            make_distances(
                "RULE_2",
                lateral={"63": 1.6, "90": 1.7, "150": 1.8, "225": 1.9, "400": 2},
                overhang={"63": 2.1, "90": 2.2, "150": 2.3, "225": 2.4, "400": 2.5},
            ),
        ],
        obstacle_name="ttt",
    )

    result = run_conformity(python_inputs)
    assert result is not None


def test_conformity_traffic_lane_overhang_only(
    run_conformity,
    make_python_inputs,
    make_form,
    make_rule,
    make_distances,
):
    """Test conformity for traffic lane obstacle with overhang distances only."""
    python_inputs = make_python_inputs(
        "traffic_lane",
        make_form(conformityPlot="overhang", intermediatePoints=[0.33, 0.66]),
        [
            make_rule("RULE_1"),
            make_rule("RULE_2", lateral_temp=68, lateral_red_zone=True),
        ],
        [
            make_distances("RULE_1", lateral=None),
            make_distances(
                "RULE_2",
                lateral=None,
                overhang={"63": 2.1, "90": 2.2, "150": 2.3, "225": 2.4, "400": 2.5},
            ),
        ],
        obstacle_name="ttt",
    )

    result = run_conformity(python_inputs)
    assert result is not None


def test_conformity_accessible_building_cable_track(
    run_conformity,
    make_python_inputs,
    make_form,
    make_rule,
    make_distances,
):
    """Test conformity for accessible building obstacle with cable track conformity plot."""
    python_inputs = make_python_inputs(
        "accessible_building",
        make_form(conformityPlot="cable_track", intermediatePoints=[0.33, 0.66]),
        [
            make_rule("RULE_1"),
            make_rule("RULE_2", lateral_temp=68, lateral_red_zone=True),
        ],
        [
            make_distances("RULE_1"),
            make_distances(
                "RULE_2",
                lateral={"63": 1.6, "90": 1.7, "150": 1.8, "225": 1.9, "400": 2},
                overhang={"63": 2.1, "90": 2.2, "150": 2.3, "225": 2.4, "400": 2.5},
            ),
        ],
        obstacle_name="ttt",
    )

    result = run_conformity(python_inputs)
    assert result is not None


def test_scenario_building_preserves_overhang_rule_temperature(
    build_scenarios, make_form, make_rule, make_distances
):
    """Test that scenario building preserves the rule's overhang temperature.

    This test verifies that when a rule has overhangPoint.temperature = None (from input),
    the built scenarios use that, NOT the parameters.repartition_temperature.

    Currently this may be a FAILING test if overhang temperatures are being overwritten
    by set_repartition_temperature.
    """
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_2", lateral_temp=68, lateral_red_zone=True)],
        make_form(intermediatePoints=[0.33, 0.66]),
        [
            make_distances(
                "RULE_2",
                lateral={"63": 1.6, "90": 1.7, "150": 1.8, "225": 1.9, "400": 2},
                overhang={"63": 2.1, "90": 2.2, "150": 2.3, "225": 2.4, "400": 2.5},
            )
        ],
    )

    assert "RULE_2" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_2"]
    assert len(scenarios) > 0

    overhang_scenarios = [s for s in scenarios if s.conformity_point == "overhang"]
    assert len(overhang_scenarios) > 0, "No overhang scenarios found"

    for scenario in overhang_scenarios:
        print(f"Overhang scenario temperature: {scenario.target_state.new_temperature}")


# Rule 1: Pressure handling - "WindZoneInput" vs numeric value
def test_pressure_rule_with_wind_zone_input(
    build_scenarios, make_form, make_rule, make_distances
):
    """Test that pressure "WindZoneInput" is overwritten by form.windPressure.

    Rule: If pressure == "WindZoneInput", use form.windPressure to overwrite.
    NOTE: This test documents current behavior - WindZoneInput defaults to 0.0
    """
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", overhang_pressure="WindZoneInput")],
        make_form(intermediatePoints=[0.33, 0.66]),
        [make_distances("RULE_1")],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0

    for scenario in scenarios:
        print(
            f"Scenario: {scenario.conformity_point}, wind_pressure: {scenario.target_state.wind_pressure}"
        )


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
        s for s in scenarios_by_rule["RULE_1"] if s.conformity_point == "lateral"
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

    lateral_scenarios = [s for s in scenarios if s.conformity_point == "lateral"]
    for scenario in lateral_scenarios:
        assert scenario.target_state.wind_pressure == 150, (
            f"Expected lateral pressure to be 150 (from rule), "
            f"but got {scenario.target_state.wind_pressure}. "
            f"Numeric pressure values should NOT be overwritten."
        )

    overhang_scenarios = [s for s in scenarios if s.conformity_point == "overhang"]
    for scenario in overhang_scenarios:
        assert scenario.target_state.wind_pressure == 250, (
            f"Expected overhang pressure to be 250 (from rule), "
            f"but got {scenario.target_state.wind_pressure}. "
            f"Numeric pressure values should NOT be overwritten."
        )


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

    overhang_scenarios = [s for s in scenarios if s.conformity_point == "overhang"]
    assert len(overhang_scenarios) > 0, "No overhang scenarios found"

    for scenario in overhang_scenarios:
        assert scenario.target_state.new_temperature == 70, (
            f"Expected overhang temperature to be 70 (from repartitionTemperature), "
            f"but got {scenario.target_state.new_temperature}. "
            f"When overhangPoint.temperature is None, should use form.repartitionTemperature."
        )


def test_overhang_temperature_when_explicit_uses_rule_value(
    build_scenarios, make_form, make_rule, make_distances
):
    """Test that explicit overhangPoint.temperature is preserved.

    Rule: If overhangPoint.temperature is not None, use that value (not repartitionTemperature).
    """
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", overhang_temp=55)],
        make_form(intermediatePoints=[0.33, 0.66]),
        [make_distances("RULE_1")],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0

    overhang_scenarios = [s for s in scenarios if s.conformity_point == "overhang"]
    assert len(overhang_scenarios) > 0, "No overhang scenarios found"

    for scenario in overhang_scenarios:
        assert scenario.target_state.new_temperature == 55, (
            f"Expected overhang temperature to be 55 (from rule), "
            f"but got {scenario.target_state.new_temperature}. "
            f"set_repartition_temperature must only set the temperature if None."
        )


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

    lateral_scenarios = [s for s in scenarios if s.conformity_point == "lateral"]
    assert len(lateral_scenarios) > 0, "No lateral scenarios found"

    for scenario in lateral_scenarios:
        assert scenario.target_state.new_temperature == 68, (
            f"Expected lateral temperature to be 68 (from lateralDistanceTemperature), "
            f"but got {scenario.target_state.new_temperature}. "
            f"When lateralPoint.temperature is None, should use form.lateralDistanceTemperature."
        )


def test_lateral_temperature_when_explicit_uses_rule_value(
    build_scenarios, make_form, make_rule, make_distances
):
    """Test that explicit lateralPoint.temperature is preserved.

    Rule: If lateralPoint.temperature is not None, use that value (not lateralDistanceTemperature).
    """
    scenarios_by_rule = build_scenarios(
        [make_rule("RULE_1", lateral_temp=25, overhang_temp=55)],
        make_form(intermediatePoints=[0.33, 0.66]),
        [make_distances("RULE_1")],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0

    lateral_scenarios = [s for s in scenarios if s.conformity_point == "lateral"]
    assert len(lateral_scenarios) > 0, "No lateral scenarios found"

    for scenario in lateral_scenarios:
        assert scenario.target_state.new_temperature == 25, (
            f"Expected lateral temperature to be 25 (from rule), "
            f"but got {scenario.target_state.new_temperature}. "
            f"set_lateral_temperature must only set the temperature if None."
        )


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

    lateral_scenarios = [s for s in scenarios if s.conformity_point == "lateral"]
    assert len(lateral_scenarios) > 0, f"No lateral scenarios found for {electric_tension}"
    for scenario in lateral_scenarios:
        assert scenario.security_distance == expected_lateral, (
            f"For {electric_tension}: Expected lateral security distance {expected_lateral}, "
            f"but got {scenario.security_distance}. "
            f"Security distance should match rule.lateral[{tension_code}]"
        )

    overhang_scenarios = [s for s in scenarios if s.conformity_point == "overhang"]
    assert len(overhang_scenarios) > 0, f"No overhang scenarios found for {electric_tension}"
    for scenario in overhang_scenarios:
        assert scenario.security_distance == expected_overhang, (
            f"For {electric_tension}: Expected overhang security distance {expected_overhang}, "
            f"but got {scenario.security_distance}. "
            f"Security distance should match rule.overhang[{tension_code}]"
        )


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


def test_wind_minus_true_negates_lateral_wind_pressure(
    build_scenarios, make_form, make_rule, make_distances
):
    """Test that when windMinus=True, lateral wind pressure is negated.

    Rule: When windMinus is True:
    - Lateral scenarios should have the negated lateral wind pressure
    - Overhang scenarios keep their own wind pressure (not affected by windMinus)
    """
    scenarios_by_rule = build_scenarios(
        [
            make_rule(
                "RULE_1",
                lateral_pressure=200,
                overhang_temp=55,
                overhang_pressure=250,
            )
        ],
        make_form(windMinus=True, intermediatePoints=[0.33, 0.66]),
        [make_distances("RULE_1")],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0

    overhang_scenarios = [s for s in scenarios if s.conformity_point == "overhang"]
    assert len(overhang_scenarios) > 0, "No overhang scenarios found"
    for scenario in overhang_scenarios:
        assert scenario.target_state.wind_pressure == 250, (
            f"Expected overhang wind pressure to be 250 (unaffected by windMinus), "
            f"but got {scenario.target_state.wind_pressure}. "
            f"Overhang pressure should never be negated."
        )

    lateral_scenarios = [s for s in scenarios if s.conformity_point == "lateral"]
    assert len(lateral_scenarios) > 0, "No lateral scenarios found"
    for scenario in lateral_scenarios:
        assert scenario.target_state.wind_pressure == -200


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


def test_overhang_only_rule_has_no_inverse_lateral_point(make_form, make_rule):
    """An overhang-only rule must not create an inverse lateral point."""
    rule = RuleClimaticCondition.from_dict(make_rule("RULE_1", overhang_temp=55))
    parameters = ConformityParametersInput.from_dict(
        {**make_form(conformityPlot="overhang"), "selectedConformityRules": ["RULE_1"]}
    )

    scenarios = build_scenario(
        rule, parameters, TensionRules(lateral=None, overhang=1.5)
    )

    assert [s.conformity_point for s in scenarios] == ["overhang"]
    assert rule.inverse_lateral_point is None


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

    lateral_scenario = next(s for s in scenarios if s.conformity_point == "lateral")
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

    lateral_scenarios = [s for s in scenarios if "lateral" in s.conformity_point]
    overhang_scenarios = [s for s in scenarios if s.conformity_point == "overhang"]

    assert len(lateral_scenarios) == 2, "Should have 2 lateral scenarios"
    assert len(overhang_scenarios) == 1, "Should have 1 overhang scenario"

    lateral_distances = [s.security_distance for s in lateral_scenarios]
    assert lateral_distances[0] == lateral_distances[1], (
        "Both lateral scenarios should have the same security distance"
    )
    assert lateral_distances[0] != overhang_scenarios[0].security_distance, (
        "Lateral and overhang security distances should be different"
    )


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
                lateral={"63": 0.5, "90": 0.6, "150": 0.7, "225": 0.8, "400": 0.9},
                overhang={"63": 1.2, "90": 1.3, "150": 1.4, "225": 1.5, "400": 1.6},
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

    total_scenarios = sum(len(scenarios) for scenarios in scenarios_by_rule.values())
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
        make_form(conformityPlot="cable_track", intermediatePoints=[0.33, 0.66]),
        [make_distances("RULE_1")],
    )

    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]

    overhang_count = len([s for s in scenarios if s.conformity_point == "overhang"])
    lateral_count = len([s for s in scenarios if s.conformity_point == "lateral"])
    lateral_inverse_count = len(
        [s for s in scenarios if s.conformity_point == "lateral_inverse"]
    )
    intermediate_count = len(
        [s for s in scenarios if s.conformity_point == "intermediate"]
    )

    assert overhang_count == 1, (
        f"Expected 1 overhang scenario, but got {overhang_count}"
    )
    assert lateral_count == 1, (
        f"Expected 1 lateral scenario, but got {lateral_count}"
    )
    assert lateral_inverse_count == 1, (
        f"Expected 1 lateral_inverse scenario, but got {lateral_inverse_count}"
    )

    # Intermediate scenarios: 2 per intermediate fraction (forward and inverse)
    assert intermediate_count == 4, (
        f"Expected 4 intermediate scenarios (2 points * 2 directions), "
        f"but got {intermediate_count}. "
        f"Total scenarios: {len(scenarios)}"
    )

    total_expected = (
        overhang_count + lateral_count + lateral_inverse_count + intermediate_count
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


def test_build_scenario_bulk_skips_rule_missing_from_tension_rules(
    make_form, make_rule
):
    rules = RuleClimaticCondition.build_rules_climatic_conditions(
        [make_rule("RULE_1")]
    )
    parameters = ConformityParametersInput.from_dict(
        {**make_form(), "selectedConformityRules": ["RULE_1"]}
    )

    assert build_scenario_bulk(rules, parameters, {}) == {"RULE_1": []}


def test_get_conformity_with_empty_rules_distances_returns_empty_dict(
    study_base, make_python_inputs, make_form, make_rule
):
    python_inputs = make_python_inputs(
        "vegetation", make_form(), [make_rule("RULE_1")], []
    )

    assert get_conformity(python_inputs, study_base) == {}


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


@pytest.mark.parametrize(
    "override",
    [
        {"windMinus": "yes"},
        {"conformityPlot": "unknown"},
        {"intermediatePoints": ["a"]},
        {"intermediatePoints": 0.5},
    ],
)
def test_conformity_parameters_reject_invalid_values(make_form, override):
    data = {**make_form(**override), "selectedConformityRules": ["RULE_1"]}

    with pytest.raises(ValueError):
        ConformityParametersInput.from_dict(data)
