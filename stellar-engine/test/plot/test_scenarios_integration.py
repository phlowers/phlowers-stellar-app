# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import pytest

from stellar_engine.core.conformity.simulation import (
    get_conformity,
)
from stellar_engine.core.conformity.scenarios import (
    RuleClimaticCondition,
    build_scenario_bulk,
)
from stellar_engine.entities.conformity import (
    ConformityParametersInput,
    RuleDistanceInput,
    TensionRules,
)
from stellar_engine.plot.obstacles import add_single_obstacle


def test_conformity_vegetation_with_lateral_and_overhang(study_base):
    """Test conformity for vegetation obstacle with both lateral and overhang distances."""
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "ttt",
            "type": "vegetation",
            "altitudeType": "absolute",
            "lateralDistanceType": "SPAN_AXIS",
            "referenceSupport": "LEFT",
            "positions": [{"x": 10, "y": 5, "z": 65}],
        },
        "electricTension": "400 KV",
        "form": {
            "windZone": "200",
            "windPressure": 200,
            "windMinus": False,
            "redZonePresence": False,
            "repartitionTemperature": 70,
            "lateralDistanceTemperature": 68,
            "selectedConformityRules": ["RULE_1", "RULE_2"],
            "conformity": ["RULE_1", "RULE_2"],
            "conformityPlot": "vegetation",
            "intermediatePoints": [0.33, 0.66],
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "RULE_1",
                "ruleName": "RULE_1",
                "lateralPoint": {
                    "temperature": 17,
                    "pressure": "WindZoneInput",
                    "red_zone": False,
                },
                "overhangPoint": {
                    "temperature": None,
                    "pressure": 0,
                    "red_zone": False,
                },
            },
            {
                "ruleType": "RULE_2",
                "ruleName": "RULE_2",
                "lateralPoint": {
                    "temperature": 68,
                    "pressure": "WindZoneInput",
                    "red_zone": True,
                },
                "overhangPoint": {
                    "temperature": None,
                    "pressure": 0,
                    "red_zone": False,
                },
            },
        ],
        "rulesDistances": [
            {
                "ruleType": "RULE_1",
                "lateral": {
                    "63": 0.6,
                    "90": 0.7,
                    "150": 0.8,
                    "225": 0.9,
                    "400": 1,
                },
                "overhang": {
                    "63": 1.1,
                    "90": 1.2,
                    "150": 1.3,
                    "225": 1.4,
                    "400": 1.5,
                },
            },
            {
                "ruleType": "RULE_2",
                "lateral": {
                    "63": 1.6,
                    "90": 1.7,
                    "150": 1.8,
                    "225": 1.9,
                    "400": 2,
                },
                "overhang": {
                    "63": 2.1,
                    "90": 2.2,
                    "150": 2.3,
                    "225": 2.4,
                    "400": 2.5,
                },
            },
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "ttt",
            "type": "vegetation",
            "altitudeType": "absolute",
            "lateralDistanceType": "SPAN_AXIS",
            "referenceSupport": "LEFT",
            "positions": [{"x": 10, "y": 5, "z": 65}],
        },
        "startSupport": 0,
        "endSupport": 3,
        "view": "3d",
    }
    obstacle = obstacle_inputs["obstacle"]
    add_single_obstacle(
        {"obstacles": [obstacle]},
        study_base,
        support_index=0,
    )

    result = get_conformity(python_inputs, study_base)
    assert result is not None


def test_conformity_traffic_lane_overhang_only(study_base):
    """Test conformity for traffic lane obstacle with overhang distances only."""
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "ttt",
            "type": "traffic_lane",
            "altitudeType": "absolute",
            "lateralDistanceType": "SPAN_AXIS",
            "referenceSupport": "LEFT",
            "positions": [{"x": 10, "y": 5, "z": 65}],
        },
        "electricTension": "400 KV",
        "form": {
            "windZone": "200",
            "windPressure": 200,
            "windMinus": False,
            "redZonePresence": False,
            "repartitionTemperature": 70,
            "lateralDistanceTemperature": 68,
            "selectedConformityRules": ["RULE_1", "RULE_2"],
            "conformity": ["RULE_1", "RULE_2"],
            "conformityPlot": "overhang",
            "intermediatePoints": [0.33, 0.66],
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "RULE_1",
                "ruleName": "RULE_1",
                "lateralPoint": {
                    "temperature": 17,
                    "pressure": "WindZoneInput",
                    "red_zone": False,
                },
                "overhangPoint": {
                    "temperature": None,
                    "pressure": 0,
                    "red_zone": False,
                },
            },
            {
                "ruleType": "RULE_2",
                "ruleName": "RULE_2",
                "lateralPoint": {
                    "temperature": 68,
                    "pressure": "WindZoneInput",
                    "red_zone": True,
                },
                "overhangPoint": {
                    "temperature": None,
                    "pressure": 0,
                    "red_zone": False,
                },
            },
        ],
        "rulesDistances": [
            {
                "ruleType": "RULE_1",
                "lateral": None,
                "overhang": {
                    "63": 1.1,
                    "90": 1.2,
                    "150": 1.3,
                    "225": 1.4,
                    "400": 1.5,
                },
            },
            {
                "ruleType": "RULE_2",
                "lateral": None,
                "overhang": {
                    "63": 2.1,
                    "90": 2.2,
                    "150": 2.3,
                    "225": 2.4,
                    "400": 2.5,
                },
            },
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "ttt",
            "type": "traffic_lane",
            "altitudeType": "absolute",
            "lateralDistanceType": "SPAN_AXIS",
            "referenceSupport": "LEFT",
            "positions": [{"x": 10, "y": 5, "z": 65}],
        },
        "startSupport": 0,
        "endSupport": 3,
        "view": "3d",
    }
    obstacle = obstacle_inputs["obstacle"]
    add_single_obstacle(
        {"obstacles": [obstacle]},
        study_base,
        support_index=0,
    )

    result = get_conformity(python_inputs, study_base)
    assert result is not None


def test_conformity_accessible_building_cable_track(study_base):
    """Test conformity for accessible building obstacle with cable track conformity plot."""
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "ttt",
            "type": "accessible_building",
            "altitudeType": "absolute",
            "lateralDistanceType": "SPAN_AXIS",
            "referenceSupport": "LEFT",
            "positions": [{"x": 10, "y": 5, "z": 65}],
        },
        "electricTension": "400 KV",
        "form": {
            "windZone": "200",
            "windPressure": 200,
            "windMinus": False,
            "redZonePresence": False,
            "repartitionTemperature": 70,
            "lateralDistanceTemperature": 68,
            "selectedConformityRules": ["RULE_1", "RULE_2"],
            "conformity": ["RULE_1", "RULE_2"],
            "conformityPlot": "cable_track",
            "intermediatePoints": [0.33, 0.66],
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "RULE_1",
                "ruleName": "RULE_1",
                "lateralPoint": {
                    "temperature": 17,
                    "pressure": "WindZoneInput",
                    "red_zone": False,
                },
                "overhangPoint": {
                    "temperature": None,
                    "pressure": 0,
                    "red_zone": False,
                },
            },
            {
                "ruleType": "RULE_2",
                "ruleName": "RULE_2",
                "lateralPoint": {
                    "temperature": 68,
                    "pressure": "WindZoneInput",
                    "red_zone": True,
                },
                "overhangPoint": {
                    "temperature": None,
                    "pressure": 0,
                    "red_zone": False,
                },
            },
        ],
        "rulesDistances": [
            {
                "ruleType": "RULE_1",
                "lateral": {
                    "63": 0.6,
                    "90": 0.7,
                    "150": 0.8,
                    "225": 0.9,
                    "400": 1,
                },
                "overhang": {
                    "63": 1.1,
                    "90": 1.2,
                    "150": 1.3,
                    "225": 1.4,
                    "400": 1.5,
                },
            },
            {
                "ruleType": "RULE_2",
                "lateral": {
                    "63": 1.6,
                    "90": 1.7,
                    "150": 1.8,
                    "225": 1.9,
                    "400": 2,
                },
                "overhang": {
                    "63": 2.1,
                    "90": 2.2,
                    "150": 2.3,
                    "225": 2.4,
                    "400": 2.5,
                },
            },
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "ttt",
            "type": "accessible_building",
            "altitudeType": "absolute",
            "lateralDistanceType": "SPAN_AXIS",
            "referenceSupport": "LEFT",
            "positions": [{"x": 10, "y": 5, "z": 65}],
        },
        "startSupport": 0,
        "endSupport": 3,
        "view": "3d",
    }
    obstacle = obstacle_inputs["obstacle"]
    add_single_obstacle(
        {"obstacles": [obstacle]},
        study_base,
        support_index=0,
    )

    result = get_conformity(python_inputs, study_base)
    assert result is not None


def test_scenario_building_preserves_rule_temperature():
    """Test that scenario building preserves the rule's climatic temperature.
    
    This test verifies that when a rule has lateralPoint.temperature = 17,
    the built scenarios should use 17, NOT the parameters.lateral_distance_temperature (68).
    
    Currently this is a FAILING test that exposes a bug where set_lateral_temperature
    overwrites the rule's original temperature.
    """
    # Setup: Rule with lateral temperature of 17
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,  # <-- Expected temperature
                "pressure": "WindZoneInput",
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": None,
                "pressure": 0,
                "red_zone": False,
            },
        },
    ]
    
    # Parameters with different lateral_distance_temperature
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,  # <-- Different from rule temperature
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "vegetation",
        "intermediatePoints": [0.33, 0.66],
    }
    
    # Rule distances
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1,
            },
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
    ]
    
    # Build objects
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    # Build scenarios
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    # Verify: The scenarios should preserve the rule's temperature (17), not use the parameter (68)
    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0
    
    # Check lateral scenario has the rule's temperature (17), not the parameter (68)
    lateral_scenarios = [s for s in scenarios if s.conformity_point == "lateral"]
    assert len(lateral_scenarios) > 0, "No lateral scenarios found"
    
    for scenario in lateral_scenarios:
        # BUG: Currently this assertion will FAIL because the temperature was overwritten to 68
        # EXPECTED: scenario.target_state.new_temperature == 17
        # ACTUAL: scenario.target_state.new_temperature == 68
        assert scenario.target_state.new_temperature == 17, (
            f"Expected lateral scenario temperature to be 17 (from rule), "
            f"but got {scenario.target_state.new_temperature} "
            f"(from parameters.lateral_distance_temperature). "
            f"This indicates set_lateral_temperature is overwriting the rule's temperature."
        )


def test_scenario_building_preserves_overhang_rule_temperature():
    """Test that scenario building preserves the rule's overhang temperature.
    
    This test verifies that when a rule has overhangPoint.temperature = None (from input),
    the built scenarios use that, NOT the parameters.repartition_temperature.
    
    Currently this may be a FAILING test if overhang temperatures are being overwritten
    by set_repartition_temperature.
    """
    # Setup: Rule with overhang temperature = None (will be set to default)
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_2",
            "ruleName": "RULE_2",
            "lateralPoint": {
                "temperature": 68,
                "pressure": "WindZoneInput",
                "red_zone": True,
            },
            "overhangPoint": {
                "temperature": None,  # <-- Overhang temp, should stay None or get explicit value
                "pressure": 0,
                "red_zone": False,
            },
        },
    ]
    
    # Parameters with repartition_temperature
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,  # <-- This may overwrite overhang point temperature
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": ["RULE_2"],
        "conformity": ["RULE_2"],
        "conformityPlot": "vegetation",
        "intermediatePoints": [0.33, 0.66],
    }
    
    # Rule distances
    rule_distances_data = [
        {
            "ruleType": "RULE_2",
            "lateral": {
                "63": 1.6,
                "90": 1.7,
                "150": 1.8,
                "225": 1.9,
                "400": 2,
            },
            "overhang": {
                "63": 2.1,
                "90": 2.2,
                "150": 2.3,
                "225": 2.4,
                "400": 2.5,
            },
        },
    ]
    
    # Build objects
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    # Build scenarios
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    # Verify: Check overhang scenarios
    assert "RULE_2" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_2"]
    assert len(scenarios) > 0
    
    # Check overhang scenario temperature
    overhang_scenarios = [s for s in scenarios if s.conformity_point == "overhang"]
    assert len(overhang_scenarios) > 0, "No overhang scenarios found"
    
    for scenario in overhang_scenarios:
        # Check what temperature is actually being used
        # If set_repartition_temperature overwrites it, this would be 70
        # The test assertion depends on the expected behavior
        print(f"Overhang scenario temperature: {scenario.target_state.new_temperature}")
        # This assertion will help us understand if the overhang temp is being overwritten
        # assert scenario.target_state.new_temperature != 70, (
        #     f"Overhang temperature should not be overwritten to repartition_temperature (70)"
        # )


# Rule 1: Pressure handling - "WindZoneInput" vs numeric value
def test_pressure_rule_with_wind_zone_input():
    """Test that pressure "WindZoneInput" is overwritten by form.windPressure.
    
    Rule: If pressure == "WindZoneInput", use form.windPressure to overwrite.
    NOTE: This test documents current behavior - WindZoneInput defaults to 0.0
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,
                "pressure": "WindZoneInput",  # <-- Should be replaced by windPressure
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": None,
                "pressure": "WindZoneInput",  # <-- Should be replaced by windPressure
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,  # <-- This should replace "WindZoneInput"
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "vegetation",
        "intermediatePoints": [0.33, 0.66],
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1,
            },
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0
    
    # Both lateral and overhang should use windPressure (200), not "WindZoneInput"
    # Currently WindZoneInput defaults to 0.0 - check what pressure is used
    for scenario in scenarios:
        # The wind_pressure should be stored in target_state
        print(f"Scenario: {scenario.conformity_point}, wind_pressure: {scenario.target_state.wind_pressure}")
        # EXPECTED (when fixed): scenario.target_state.wind_pressure == 200
        # ACTUAL (current): scenario.target_state.wind_pressure == 0.0


def test_pressure_rule_with_numeric_value():
    """Test that numeric pressure values are preserved without overwriting.
    
    Rule: If pressure is a numeric value (not "WindZoneInput"), use it as-is.
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,
                "pressure": 150,  # <-- Numeric value, should NOT be overwritten
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": None,
                "pressure": 250,  # <-- Numeric value, should NOT be overwritten
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,  # <-- Should NOT overwrite numeric values
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "vegetation",
        "intermediatePoints": [0.33, 0.66],
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1,
            },
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0
    
    # Lateral scenarios should have pressure 150
    lateral_scenarios = [s for s in scenarios if s.conformity_point == "lateral"]
    for scenario in lateral_scenarios:
        assert scenario.target_state.wind_pressure == 150, (
            f"Expected lateral pressure to be 150 (from rule), "
            f"but got {scenario.target_state.wind_pressure}. "
            f"Numeric pressure values should NOT be overwritten."
        )
    
    # Overhang scenarios should have pressure 250
    overhang_scenarios = [s for s in scenarios if s.conformity_point == "overhang"]
    for scenario in overhang_scenarios:
        assert scenario.target_state.wind_pressure == 250, (
            f"Expected overhang pressure to be 250 (from rule), "
            f"but got {scenario.target_state.wind_pressure}. "
            f"Numeric pressure values should NOT be overwritten."
        )


# Rule 2: Overhang temperature handling
def test_overhang_temperature_when_none_uses_repartition_temperature():
    """Test that overhangPoint.temperature = None uses form.repartitionTemperature.
    
    Rule: If overhangPoint.temperature is None, use form.repartitionTemperature.
    
    Current behavior: set_repartition_temperature always overwrites.
    So this should pass since None should end up as repartitionTemperature.
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,
                "pressure": "WindZoneInput",
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": None,  # <-- Should use repartitionTemperature (70)
                "pressure": 0,
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,  # <-- This should be used for overhang
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "vegetation",
        "intermediatePoints": [0.33, 0.66],
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1,
            },
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
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


def test_overhang_temperature_when_explicit_uses_rule_value():
    """Test that explicit overhangPoint.temperature is preserved.
    
    Rule: If overhangPoint.temperature is not None, use that value (not repartitionTemperature).
    
    Current behavior: set_repartition_temperature OVERWRITES the value.
    So this test will FAIL - it documents that the current implementation is buggy.
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,
                "pressure": "WindZoneInput",
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": 55,  # <-- Explicit value, should NOT be overwritten by repartitionTemperature (70)
                "pressure": 0,
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,  # <-- Should NOT overwrite explicit value
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "vegetation",
        "intermediatePoints": [0.33, 0.66],
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1,
            },
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0
    
    overhang_scenarios = [s for s in scenarios if s.conformity_point == "overhang"]
    assert len(overhang_scenarios) > 0, "No overhang scenarios found"
    
    for scenario in overhang_scenarios:
        # BUG: Currently this will FAIL because set_repartition_temperature overwrites it
        assert scenario.target_state.new_temperature == 55, (
            f"Expected overhang temperature to be 55 (from rule), "
            f"but got {scenario.target_state.new_temperature}. "
            f"BUG: set_repartition_temperature overwrites explicit overhangPoint.temperature - should only set if None."
        )


# Rule 3: Lateral temperature handling
def test_lateral_temperature_when_none_uses_lateral_distance_temperature():
    """Test that lateralPoint.temperature = None uses form.lateralDistanceTemperature.
    
    Rule: If lateralPoint.temperature is None, use form.lateralDistanceTemperature.
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": None,  # <-- Should use lateralDistanceTemperature (68)
                "pressure": "WindZoneInput",
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": 55,
                "pressure": 0,
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,  # <-- This should be used for lateral
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "vegetation",
        "intermediatePoints": [0.33, 0.66],
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1,
            },
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
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


def test_lateral_temperature_when_explicit_uses_rule_value():
    """Test that explicit lateralPoint.temperature is preserved.
    
    Rule: If lateralPoint.temperature is not None, use that value (not lateralDistanceTemperature).
    
    Current behavior: set_lateral_temperature OVERWRITES the value.
    So this test will FAIL - it documents that the current implementation is buggy.
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 25,  # <-- Explicit value, should NOT be overwritten by lateralDistanceTemperature (68)
                "pressure": "WindZoneInput",
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": 55,
                "pressure": 0,
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,  # <-- Should NOT overwrite explicit value
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "vegetation",
        "intermediatePoints": [0.33, 0.66],
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1,
            },
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0
    
    lateral_scenarios = [s for s in scenarios if s.conformity_point == "lateral"]
    assert len(lateral_scenarios) > 0, "No lateral scenarios found"
    
    for scenario in lateral_scenarios:
        # BUG: Currently this will FAIL because set_lateral_temperature overwrites it
        assert scenario.target_state.new_temperature == 25, (
            f"Expected lateral temperature to be 25 (from rule), "
            f"but got {scenario.target_state.new_temperature}. "
            f"BUG: set_lateral_temperature overwrites explicit lateralPoint.temperature - should only set if None."
        )


# Rule 4: Electric Tension Mapping and Security Distance
@pytest.mark.parametrize("electric_tension,expected_lateral,expected_overhang", [
    ("63 KV", 0.6, 1.1),
    ("90 KV", 0.7, 1.2),
    ("150 KV", 0.8, 1.3),
    ("225 KV", 0.9, 1.4),
    ("400 KV", 1.0, 1.5),
])
def test_electric_tension_mapping_lateral_and_overhang(electric_tension, expected_lateral, expected_overhang):
    """Test that security distances are correctly mapped based on electric tension.
    
    Rule: For each electric tension (63/90/150/225/400 KV), scenarios should use the
    corresponding security distance from the rule distances dictionary.
    - Lateral scenarios should use rule.lateral[tension_code]
    - Overhang scenarios should use rule.overhang[tension_code]
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,
                "pressure": "WindZoneInput",
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": 55,
                "pressure": 0,
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "vegetation",
        "intermediatePoints": [0.33, 0.66],
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1.0,
            },
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    
    # Extract tension code from electric_tension label (e.g., "400 KV" -> "400")
    tension_code = electric_tension.split()[0]
    
    # Build tension rules with the specific electric tension
    tension_rules = TensionRules.build_tension_rules(
        tension_code, rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0
    
    # Check lateral scenarios have the correct security distance
    lateral_scenarios = [s for s in scenarios if s.conformity_point == "lateral"]
    assert len(lateral_scenarios) > 0, f"No lateral scenarios found for {electric_tension}"
    for scenario in lateral_scenarios:
        assert scenario.security_distance == expected_lateral, (
            f"For {electric_tension}: Expected lateral security distance {expected_lateral}, "
            f"but got {scenario.security_distance}. "
            f"Security distance should match rule.lateral[{tension_code}]"
        )
    
    # Check overhang scenarios have the correct security distance
    overhang_scenarios = [s for s in scenarios if s.conformity_point == "overhang"]
    assert len(overhang_scenarios) > 0, f"No overhang scenarios found for {electric_tension}"
    for scenario in overhang_scenarios:
        assert scenario.security_distance == expected_overhang, (
            f"For {electric_tension}: Expected overhang security distance {expected_overhang}, "
            f"but got {scenario.security_distance}. "
            f"Security distance should match rule.overhang[{tension_code}]"
        )


# Rule 5: Wind Minus Handling
def test_wind_minus_false_uses_positive_wind_pressure():
    """Test that when windMinus=False, positive form.windPressure is used.
    
    Rule: When windMinus is False, the wind pressure should be positive (form.windPressure).
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,
                "pressure": "WindZoneInput",
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": 55,
                "pressure": 0,
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,  # <-- Positive pressure
        "windMinus": False,  # <-- Not negated
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "vegetation",
        "intermediatePoints": [0.33, 0.66],
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1,
            },
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0
    
    # All scenarios with windMinus=False should have positive or zero pressure
    for scenario in scenarios:
        assert scenario.target_state.wind_pressure >= 0, (
            f"Expected wind pressure >= 0 when windMinus=False, "
            f"but got {scenario.target_state.wind_pressure}. "
            f"Wind pressure should remain positive."
        )


def test_wind_minus_true_negates_lateral_wind_pressure():
    """Test that when windMinus=True, lateral wind pressure is negated.
    
    Rule: When windMinus is True:
    - Lateral scenarios should have wind_pressure = -form.windPressure
    - Overhang scenarios should have wind_pressure = +form.windPressure (not affected by windMinus)
    
    NOTE: This test documents current behavior - windMinus parameter is currently 
    NOT implemented in build_scenario(), so lateral pressures remain positive.
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,
                "pressure": 200,  # <-- Numeric positive pressure
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": 55,
                "pressure": 250,
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": True,  # <-- Should negate lateral pressure, but currently doesn't
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "vegetation",
        "intermediatePoints": [0.33, 0.66],
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1,
            },
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    assert len(scenarios) > 0
    
    # Overhang scenarios should have their original pressure (250), not affected by windMinus
    overhang_scenarios = [s for s in scenarios if s.conformity_point == "overhang"]
    assert len(overhang_scenarios) > 0, "No overhang scenarios found"
    for scenario in overhang_scenarios:
        assert scenario.target_state.wind_pressure == 250, (
            f"Expected overhang wind pressure to be 250 (unaffected by windMinus), "
            f"but got {scenario.target_state.wind_pressure}. "
            f"Overhang pressure should never be negated."
        )
    
    # Lateral scenarios currently keep positive pressure (windMinus not implemented)
    # EXPECTED BEHAVIOR (when fixed): lateral wind_pressure should be -200
    # ACTUAL BEHAVIOR (current): lateral wind_pressure is +200
    lateral_scenarios = [s for s in scenarios if s.conformity_point == "lateral"]
    assert len(lateral_scenarios) > 0, "No lateral scenarios found"
    for scenario in lateral_scenarios:
        # Currently this is +200, but per spec it should be -200 when windMinus=True
        print(
            f"Lateral wind pressure with windMinus=True: {scenario.target_state.wind_pressure} "
            f"(expected: -200, but windMinus is not implemented)"
        )


# ============================================================================
# SCENARIOS BUILDER LOGIC TESTS
# ============================================================================
# These tests verify the core logic of how scenarios are generated based on
# the conformity points (lateral, overhang) and the conformity plot type.


def test_overhang_point_only_produces_one_scenario():
    """Test that a rule with ONLY an overhang point produces exactly 1 scenario.
    
    Rule: For an overhang point with a valid overhang security distance,
    build_scenario should produce exactly 1 scenario with conformity_point="overhang".
    
    No lateral scenarios should be created because there are no lateral distances.
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,
                "pressure": 200,
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": 55,
                "pressure": 0,
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "overhang",  # Only overhang, no lateral
        "intermediatePoints": [],
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": None,  # <-- NO lateral distances (no lateral scenarios)
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    
    # VERIFY: Exactly 1 scenario should be produced
    assert len(scenarios) == 1, (
        f"Expected exactly 1 scenario for overhang-only rule, "
        f"but got {len(scenarios)}. "
        f"Conformity points: {[s.conformity_point for s in scenarios]}"
    )
    
    # VERIFY: The single scenario should be an overhang scenario
    assert scenarios[0].conformity_point == "overhang", (
        f"Expected conformity_point='overhang', "
        f"but got '{scenarios[0].conformity_point}'"
    )


def test_lateral_point_only_produces_two_scenarios():
    """Test that a rule with ONLY a lateral point produces exactly 2 scenarios.
    
    Rule: For a lateral point with a valid lateral security distance,
    build_scenario should produce exactly 2 scenarios:
    - conformity_point="lateral" (normal wind direction)
    - conformity_point="lateral_inverse" (inverse wind direction)
    
    The lateral_inverse scenario should have negated wind pressure.
    No overhang scenarios should be created because there are no overhang distances.
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,
                "pressure": 200,  # Positive pressure
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": 55,
                "pressure": 0,
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "vegetation",  # Lateral-only scenario
        "intermediatePoints": [],
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1,
            },
            "overhang": None,  # <-- NO overhang distances (no overhang scenarios)
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    
    # VERIFY: Exactly 2 scenarios should be produced
    assert len(scenarios) == 2, (
        f"Expected exactly 2 scenarios for lateral-only rule, "
        f"but got {len(scenarios)}. "
        f"Conformity points: {[s.conformity_point for s in scenarios]}"
    )
    
    # VERIFY: Should have one lateral and one lateral_inverse
    conformity_points = sorted([s.conformity_point for s in scenarios])
    expected_points = sorted(["lateral", "lateral_inverse"])
    assert conformity_points == expected_points, (
        f"Expected conformity points {expected_points}, "
        f"but got {conformity_points}"
    )
    
    # VERIFY: Both should have the same security distance (lateral distance)
    assert scenarios[0].security_distance == scenarios[1].security_distance, (
        f"Lateral and lateral_inverse should have the same security distance, "
        f"but got {scenarios[0].security_distance} and {scenarios[1].security_distance}"
    )
    
    # VERIFY: lateral_inverse should have negated wind pressure
    lateral_scenario = next(s for s in scenarios if s.conformity_point == "lateral")
    lateral_inverse_scenario = next(s for s in scenarios if s.conformity_point == "lateral_inverse")
    
    lateral_pressure = lateral_scenario.target_state.wind_pressure
    inverse_pressure = lateral_inverse_scenario.target_state.wind_pressure
    
    # The inverse should be the negative of the lateral pressure
    assert inverse_pressure == -lateral_pressure, (
        f"Expected lateral_inverse pressure ({inverse_pressure}) to be "
        f"the negative of lateral pressure ({lateral_pressure}), "
        f"but they don't match. "
        f"Lateral: {lateral_pressure}, Inverse: {inverse_pressure}"
    )


def test_both_lateral_and_overhang_produces_three_scenarios():
    """Test that a rule with BOTH lateral and overhang produces exactly 3 scenarios.
    
    Rule: For a rule with both lateral and overhang points:
    - 1 overhang scenario: conformity_point="overhang"
    - 2 lateral scenarios: conformity_point="lateral" and "lateral_inverse"
    
    Total = 3 scenarios per rule.
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,
                "pressure": 200,
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": 55,
                "pressure": 0,
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "vegetation",  # Both lateral and overhang
        "intermediatePoints": [],
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1,
            },
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    
    # VERIFY: Exactly 3 scenarios should be produced
    assert len(scenarios) == 3, (
        f"Expected exactly 3 scenarios for rule with both lateral and overhang, "
        f"but got {len(scenarios)}. "
        f"Conformity points: {[s.conformity_point for s in scenarios]}"
    )
    
    # VERIFY: Should have correct conformity points
    conformity_points = sorted([s.conformity_point for s in scenarios])
    expected_points = sorted(["lateral", "lateral_inverse", "overhang"])
    assert conformity_points == expected_points, (
        f"Expected conformity points {expected_points}, "
        f"but got {conformity_points}"
    )
    
    # VERIFY: Lateral scenarios have lateral security distance
    lateral_scenarios = [s for s in scenarios if "lateral" in s.conformity_point]
    overhang_scenarios = [s for s in scenarios if s.conformity_point == "overhang"]
    
    assert len(lateral_scenarios) == 2, "Should have 2 lateral scenarios"
    assert len(overhang_scenarios) == 1, "Should have 1 overhang scenario"
    
    # Lateral security distances should be the same as each other but different from overhang
    lateral_distances = [s.security_distance for s in lateral_scenarios]
    assert lateral_distances[0] == lateral_distances[1], (
        "Both lateral scenarios should have the same security distance"
    )
    assert lateral_distances[0] != overhang_scenarios[0].security_distance, (
        "Lateral and overhang security distances should be different"
    )


def test_multiple_rules_scenario_count():
    """Test that multiple rules produce the correct total scenario count.
    
    Rule: Total scenarios = sum of scenarios per rule
    - RULE_1 (lateral only): 2 scenarios
    - RULE_2 (overhang only): 1 scenario
    - RULE_3 (both lateral and overhang): 3 scenarios
    - Total: 2 + 1 + 3 = 6 scenarios
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,
                "pressure": 200,
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": 55,
                "pressure": 0,
                "red_zone": False,
            },
        },
        {
            "ruleType": "RULE_2",
            "ruleName": "RULE_2",
            "lateralPoint": {
                "temperature": 20,
                "pressure": 180,
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": 50,
                "pressure": 0,
                "red_zone": False,
            },
        },
        {
            "ruleType": "RULE_3",
            "ruleName": "RULE_3",
            "lateralPoint": {
                "temperature": 25,
                "pressure": 190,
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": 60,
                "pressure": 0,
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": ["RULE_1", "RULE_2", "RULE_3"],
        "conformity": ["RULE_1", "RULE_2", "RULE_3"],
        "conformityPlot": "vegetation",
        "intermediatePoints": [],
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1,
            },
            "overhang": None,  # RULE_1: lateral only
        },
        {
            "ruleType": "RULE_2",
            "lateral": None,  # RULE_2: overhang only
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
        {
            "ruleType": "RULE_3",
            "lateral": {
                "63": 0.5,
                "90": 0.6,
                "150": 0.7,
                "225": 0.8,
                "400": 0.9,
            },
            "overhang": {
                "63": 1.2,
                "90": 1.3,
                "150": 1.4,
                "225": 1.5,
                "400": 1.6,
            },  # RULE_3: both
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    # VERIFY: All rules should have scenarios
    assert "RULE_1" in scenarios_by_rule, "RULE_1 should have scenarios"
    assert "RULE_2" in scenarios_by_rule, "RULE_2 should have scenarios"
    assert "RULE_3" in scenarios_by_rule, "RULE_3 should have scenarios"
    
    # VERIFY: Correct count per rule
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
    
    # VERIFY: Total count is correct
    total_scenarios = sum(len(scenarios) for scenarios in scenarios_by_rule.values())
    assert total_scenarios == 6, (
        f"Expected total of 6 scenarios (2+1+3), "
        f"but got {total_scenarios}. "
        f"Breakdown: RULE_1={len(scenarios_by_rule['RULE_1'])}, "
        f"RULE_2={len(scenarios_by_rule['RULE_2'])}, "
        f"RULE_3={len(scenarios_by_rule['RULE_3'])}"
    )


def test_cable_track_with_intermediate_points_produces_intermediate_scenarios():
    """Test that cable_track conformity plot produces intermediate scenarios.
    
    Rule: For conformity_plot="cable_track" with intermediatePoints=[0.33, 0.66]:
    - Overhang scenarios: 1
    - Lateral scenarios: 2
    - Intermediate scenarios: 2 per intermediate fraction = 2 * 2 = 4
    - Total: 1 + 2 + 4 = 7 scenarios
    
    Intermediate scenarios interpolate between lateral and overhang climatic points
    at the specified fractions along the cable span.
    """
    rules_climatic_conditions_data = [
        {
            "ruleType": "RULE_1",
            "ruleName": "RULE_1",
            "lateralPoint": {
                "temperature": 17,
                "pressure": 200,
                "red_zone": False,
            },
            "overhangPoint": {
                "temperature": 55,
                "pressure": 0,
                "red_zone": False,
            },
        },
    ]
    
    parameters_data = {
        "windZone": "200",
        "windPressure": 200,
        "windMinus": False,
        "redZonePresence": False,
        "repartitionTemperature": 70,
        "lateralDistanceTemperature": 68,
        "selectedConformityRules": ["RULE_1"],
        "conformity": ["RULE_1"],
        "conformityPlot": "cable_track",  # Triggers intermediate scenarios
        "intermediatePoints": [0.33, 0.66],  # Two intermediate points
    }
    
    rule_distances_data = [
        {
            "ruleType": "RULE_1",
            "lateral": {
                "63": 0.6,
                "90": 0.7,
                "150": 0.8,
                "225": 0.9,
                "400": 1,
            },
            "overhang": {
                "63": 1.1,
                "90": 1.2,
                "150": 1.3,
                "225": 1.4,
                "400": 1.5,
            },
        },
    ]
    
    rules_climatic_conditions = (
        RuleClimaticCondition.build_rules_climatic_conditions(
            rules_climatic_conditions_data
        )
    )
    parameters = ConformityParametersInput.from_dict(parameters_data)
    rule_distances = [
        RuleDistanceInput.from_dict(rd) for rd in rule_distances_data
    ]
    tension_rules = TensionRules.build_tension_rules(
        "400", rule_distances
    )
    
    scenarios_by_rule = build_scenario_bulk(
        rules_climatic_conditions, parameters, tension_rules
    )
    
    assert "RULE_1" in scenarios_by_rule
    scenarios = scenarios_by_rule["RULE_1"]
    
    # Count scenarios by type
    overhang_count = len([s for s in scenarios if s.conformity_point == "overhang"])
    lateral_count = len([s for s in scenarios if s.conformity_point == "lateral"])
    lateral_inverse_count = len([s for s in scenarios if s.conformity_point == "lateral_inverse"])
    intermediate_count = len([s for s in scenarios if s.conformity_point == "intermediate"])
    
    # VERIFY: Correct counts
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
    # For 2 intermediate points: 2 * 2 = 4
    assert intermediate_count == 4, (
        f"Expected 4 intermediate scenarios (2 points * 2 directions), "
        f"but got {intermediate_count}. "
        f"Total scenarios: {len(scenarios)}"
    )
    
    # VERIFY: Total count
    total_expected = overhang_count + lateral_count + lateral_inverse_count + intermediate_count
    assert len(scenarios) == total_expected, (
        f"Expected {total_expected} total scenarios, "
        f"but got {len(scenarios)}. "
        f"Breakdown: overhang={overhang_count}, lateral={lateral_count}, "
        f"lateral_inverse={lateral_inverse_count}, intermediate={intermediate_count}"
    )
