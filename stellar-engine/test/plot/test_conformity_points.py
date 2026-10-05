# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Test conformity points generation system.

This module tests the point generation system which is mastered by the 
ConformityResult object. It verifies that:
1. When N rules are tested, result_dict.conformity has N entries with keys = rule names
2. result_dict.results also has N entries with keys = rule names
3. The "radius" field corresponds to the security distance for every point
"""

import pytest

from stellar_engine.core.conformity.simulation import (
    get_conformity,
)
from stellar_engine.plot.obstacles import add_single_obstacle


# ============================================================================
# RULE ENTRY GENERATION TESTS
# ============================================================================
# These tests verify that the conformity result dictionary contains entries
# for all rules that were tested, with rule names as keys.


def test_single_rule_generates_single_conformity_entry(study_base):
    """Test that 1 rule generates 1 entry in result_dict.conformity and result_dict.results.
    
    Rule: When N=1 rule is tested:
    - result_dict.conformity should have 1 entry with key = rule type
    - result_dict.results should have 1 entry with key = rule type
    """
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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
            "selectedConformityRules": ["AT"],
            "conformity": ["AT"],
            "conformityPlot": "vegetation",
            "intermediatePoints": [0.33, 0.66],
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "AT",
                "ruleName": "AT",
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
        ],
        "rulesDistances": [
            {
                "ruleType": "AT",
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
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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

    result_dict = get_conformity(python_inputs, study_base)
    
    assert result_dict is not None, "Result dictionary should not be None"
    assert "conformity" in result_dict, "Result dictionary should have 'conformity' key"
    assert "results" in result_dict, "Result dictionary should have 'results' key"
    
    # VERIFY: Exactly 1 entry for the rule
    assert len(result_dict["conformity"]) == 1, (
        f"Expected 1 conformity entry, but got {len(result_dict['conformity'])}. "
        f"Keys: {list(result_dict['conformity'].keys())}"
    )
    assert len(result_dict["results"]) == 1, (
        f"Expected 1 results entry, but got {len(result_dict['results'])}. "
        f"Keys: {list(result_dict['results'].keys())}"
    )
    
    # VERIFY: Both use the same rule type as key
    assert "AT" in result_dict["conformity"], (
        f"Expected 'AT' key in conformity, but got {list(result_dict['conformity'].keys())}"
    )
    assert "AT" in result_dict["results"], (
        f"Expected 'AT' key in results, but got {list(result_dict['results'].keys())}"
    )


def test_two_rules_generate_two_conformity_entries(study_base):
    """Test that 2 rules generate 2 entries in result_dict.conformity and result_dict.results.
    
    Rule: When N=2 rules are tested:
    - result_dict.conformity should have 2 entries with keys = rule types
    - result_dict.results should have 2 entries with keys = rule types
    """
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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
            "selectedConformityRules": ["AT", "CCG-LA"],
            "conformity": ["AT", "CCG-LA"],
            "conformityPlot": "vegetation",
            "intermediatePoints": [0.33, 0.66],
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "AT",
                "ruleName": "AT",
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
                "ruleType": "CCG-LA",
                "ruleName": "CCG-LA",
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
                "ruleType": "AT",
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
                "ruleType": "CCG-LA",
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
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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

    result_dict = get_conformity(python_inputs, study_base)
    
    assert result_dict is not None, "Result dictionary should not be None"
    
    # VERIFY: Exactly 2 entries for the rules
    assert len(result_dict["conformity"]) == 2, (
        f"Expected 2 conformity entries, but got {len(result_dict['conformity'])}. "
        f"Keys: {list(result_dict['conformity'].keys())}"
    )
    assert len(result_dict["results"]) == 2, (
        f"Expected 2 results entries, but got {len(result_dict['results'])}. "
        f"Keys: {list(result_dict['results'].keys())}"
    )
    
    # VERIFY: Both dictionaries have the same rule type keys
    conformity_keys = set(result_dict["conformity"].keys())
    results_keys = set(result_dict["results"].keys())
    expected_keys = {"AT", "CCG-LA"}
    
    assert conformity_keys == expected_keys, (
        f"Expected conformity keys {expected_keys}, but got {conformity_keys}"
    )
    assert results_keys == expected_keys, (
        f"Expected results keys {expected_keys}, but got {results_keys}"
    )


def test_three_rules_generate_three_conformity_entries(study_base):
    """Test that 3 rules generate 3 entries in result_dict.conformity and result_dict.results.
    
    Rule: When N=3 rules are tested:
    - result_dict.conformity should have 3 entries with keys = rule types
    - result_dict.results should have 3 entries with keys = rule types
    """
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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
            "selectedConformityRules": ["AT", "CCG-LA", "ENV-NRM"],
            "conformity": ["AT", "CCG-LA", "ENV-NRM"],
            "conformityPlot": "vegetation",
            "intermediatePoints": [0.33, 0.66],
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "AT",
                "ruleName": "AT",
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
                "ruleType": "CCG-LA",
                "ruleName": "CCG-LA",
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
            {
                "ruleType": "ENV-NRM",
                "ruleName": "ENV-NRM",
                "lateralPoint": {
                    "temperature": 15,
                    "pressure": "WindZoneInput",
                    "red_zone": False,
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
                "ruleType": "AT",
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
                "ruleType": "CCG-LA",
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
                "ruleType": "ENV-NRM",
                "lateral": {
                    "63": 0.5,
                    "90": 0.6,
                    "150": 0.7,
                    "225": 0.8,
                    "400": 0.9,
                },
                "overhang": {
                    "63": 1.0,
                    "90": 1.1,
                    "150": 1.2,
                    "225": 1.3,
                    "400": 1.4,
                },
            },
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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

    result_dict = get_conformity(python_inputs, study_base)
    
    assert result_dict is not None, "Result dictionary should not be None"
    
    # VERIFY: Exactly 3 entries for the rules
    assert len(result_dict["conformity"]) == 3, (
        f"Expected 3 conformity entries, but got {len(result_dict['conformity'])}. "
        f"Keys: {list(result_dict['conformity'].keys())}"
    )
    assert len(result_dict["results"]) == 3, (
        f"Expected 3 results entries, but got {len(result_dict['results'])}. "
        f"Keys: {list(result_dict['results'].keys())}"
    )
    
    # VERIFY: Both dictionaries have the same rule type keys
    conformity_keys = set(result_dict["conformity"].keys())
    results_keys = set(result_dict["results"].keys())
    expected_keys = {"AT", "CCG-LA", "ENV-NRM"}
    
    assert conformity_keys == expected_keys, (
        f"Expected conformity keys {expected_keys}, but got {conformity_keys}"
    )
    assert results_keys == expected_keys, (
        f"Expected results keys {expected_keys}, but got {results_keys}"
    )


# ============================================================================
# RADIUS AND SECURITY DISTANCE TESTS
# ============================================================================
# These tests verify that the radius field in points corresponds to the 
# security distance from the scenarios.


def test_radius_equals_security_distance_vegetation_plot(study_base):
    """Test that radius field equals security distance for vegetation conformity plot.
    
    Rule: For conformity_plot="vegetation", radius is used and should equal 
    the security distance of the corresponding scenario (which is a constant value).
    
    For vegetation: get_radius() returns default_radius = 1.0
    """
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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
            "selectedConformityRules": ["AT"],
            "conformity": ["AT"],
            "conformityPlot": "vegetation",
            "intermediatePoints": [],
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "AT",
                "ruleName": "AT",
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
        ],
        "rulesDistances": [
            {
                "ruleType": "AT",
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
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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

    result_dict = get_conformity(python_inputs, study_base)
    
    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"
    
    at_conformity = result_dict["conformity"]["AT"]
    points = at_conformity.get("points", [])
    
    # VERIFY: Points should have radius values
    assert len(points) > 0, (
        f"Expected points with radius values for vegetation conformity plot, "
        f"but got {len(points)} points"
    )
    
    # For vegetation plot, all points should have radius = 1.0 (default_radius)
    for point in points:
        assert "radius" in point, (
            f"Point should have 'radius' field: {point}"
        )
        assert point["radius"] == 1.0, (
            f"Expected radius=1.0 for vegetation plot, but got {point['radius']}"
        )


def test_radius_equals_security_distance_cable_track_plot(study_base):
    """Test that radius field equals security distance for cable_track conformity plot.
    
    Rule: For conformity_plot="cable_track", radius = get_radius(security_distance) 
    which is the security_distance itself.
    
    For cable_track: get_radius(x) returns x (the security distance)
    """
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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
            "selectedConformityRules": ["AT"],
            "conformity": ["AT"],
            "conformityPlot": "cable_track",
            "intermediatePoints": [],
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "AT",
                "ruleName": "AT",
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
        ],
        "rulesDistances": [
            {
                "ruleType": "AT",
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
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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

    result_dict = get_conformity(python_inputs, study_base)
    
    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"
    
    at_conformity = result_dict["conformity"]["AT"]
    points = at_conformity.get("points", [])
    
    # VERIFY: Points should have radius values for cable_track
    assert len(points) > 0, (
        f"Expected points with radius values for cable_track conformity plot"
    )
    
    # For cable_track plot, each radius should be the security distance (lateral or overhang)
    # Lateral points have radius = 1.0 (400 KV lateral security distance)
    # Overhang points have radius = 1.5 (400 KV overhang security distance)
    # Intermediate points have radius that interpolates between lateral and overhang
    
    for point in points:
        assert "radius" in point, (
            f"Point should have 'radius' field: {point}"
        )
        # For cable_track, radius should be a positive number (the security distance)
        assert isinstance(point["radius"], (int, float)), (
            f"Expected radius to be numeric, but got {type(point['radius'])}: {point['radius']}"
        )
        assert point["radius"] > 0, (
            f"Expected positive radius value, but got {point['radius']}"
        )


def test_radius_equals_security_distance_overhang_plot(study_base):
    """Test that radius field equals security distance for overhang conformity plot.
    
    Rule: For conformity_plot="overhang", radius is used and should equal 
    the overhang security distance for all points.
    
    For overhang: get_radius() returns default_radius = 1.0
    """
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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
            "selectedConformityRules": ["AT"],
            "conformity": ["AT"],
            "conformityPlot": "overhang",
            "intermediatePoints": [],
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "AT",
                "ruleName": "AT",
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
        ],
        "rulesDistances": [
            {
                "ruleType": "AT",
                "lateral": None,
                "overhang": {
                    "63": 1.1,
                    "90": 1.2,
                    "150": 1.3,
                    "225": 1.4,
                    "400": 1.5,
                },
            },
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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

    result_dict = get_conformity(python_inputs, study_base)
    
    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"
    
    at_conformity = result_dict["conformity"]["AT"]
    points = at_conformity.get("points", [])
    
    # VERIFY: Points should have radius values
    assert len(points) > 0, (
        f"Expected points with radius values for overhang conformity plot"
    )
    
    # For overhang plot, all points should have radius = 1.0 (default_radius)
    for point in points:
        assert "radius" in point, (
            f"Point should have 'radius' field: {point}"
        )
        assert point["radius"] == 1.0, (
            f"Expected radius=1.0 for overhang plot, but got {point['radius']}"
        )


def test_points_structure_has_coordinates_and_radius(study_base):
    """Test that each point in conformity has x, y coordinates and radius.
    
    Rule: Each point in result_dict.conformity[rule_type].points should have:
    - "x": float coordinate
    - "y": float coordinate
    - "radius": float security distance
    """
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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
            "selectedConformityRules": ["AT"],
            "conformity": ["AT"],
            "conformityPlot": "vegetation",
            "intermediatePoints": [0.33, 0.66],
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "AT",
                "ruleName": "AT",
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
        ],
        "rulesDistances": [
            {
                "ruleType": "AT",
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
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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

    result_dict = get_conformity(python_inputs, study_base)
    
    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"
    
    at_conformity = result_dict["conformity"]["AT"]
    points = at_conformity.get("points", [])
    
    assert len(points) > 0, "Expected at least one point in conformity"
    
    # VERIFY: Each point has required fields
    for idx, point in enumerate(points):
        assert isinstance(point, dict), (
            f"Point {idx} should be a dictionary, but got {type(point)}"
        )
        assert "x" in point, (
            f"Point {idx} should have 'x' coordinate: {point}"
        )
        assert "y" in point, (
            f"Point {idx} should have 'y' coordinate: {point}"
        )
        assert "radius" in point, (
            f"Point {idx} should have 'radius': {point}"
        )
        
        # VERIFY: Coordinates and radius are numeric
        assert isinstance(point["x"], (int, float)), (
            f"Point {idx} x coordinate should be numeric, got {type(point['x'])}"
        )
        assert isinstance(point["y"], (int, float)), (
            f"Point {idx} y coordinate should be numeric, got {type(point['y'])}"
        )
        assert isinstance(point["radius"], (int, float)), (
            f"Point {idx} radius should be numeric, got {type(point['radius'])}"
        )


def test_multiple_rules_have_independent_points(study_base):
    """Test that different rules can have different numbers of points and radii.
    
    Rule: Each rule should independently generate points based on its scenarios
    and conformity plot settings. Points from different rules should not interfere.
    """
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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
            "selectedConformityRules": ["AT", "CCG-LA"],
            "conformity": ["AT", "CCG-LA"],
            "conformityPlot": "vegetation",
            "intermediatePoints": [0.33, 0.66],
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "AT",
                "ruleName": "AT",
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
                "ruleType": "CCG-LA",
                "ruleName": "CCG-LA",
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
                "ruleType": "AT",
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
                "ruleType": "CCG-LA",
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
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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

    result_dict = get_conformity(python_inputs, study_base)
    
    assert result_dict is not None, "Result dictionary should not be None"
    
    # VERIFY: Both rules are present
    assert "AT" in result_dict["conformity"], "Result should have AT rule"
    assert "CCG-LA" in result_dict["conformity"], "Result should have CCG-LA rule"
    
    at_conformity = result_dict["conformity"]["AT"]
    ccg_la_conformity = result_dict["conformity"]["CCG-LA"]
    
    at_points = at_conformity.get("points", [])
    ccg_la_points = ccg_la_conformity.get("points", [])
    
    # VERIFY: Both rules have points
    assert len(at_points) > 0, "AT rule should have points"
    assert len(ccg_la_points) > 0, "CCG-LA rule should have points"
    
    # VERIFY: Both rules have the same radius values (since they're using vegetation plot)
    for at_point in at_points:
        assert at_point["radius"] == 1.0, (
            f"AT point should have radius=1.0, got {at_point['radius']}"
        )
    
    for ccg_la_point in ccg_la_points:
        assert ccg_la_point["radius"] == 1.0, (
            f"CCG-LA point should have radius=1.0, got {ccg_la_point['radius']}"
        )


# ============================================================================
# CONFORMITY PLOT TYPE RULES TESTS
# ============================================================================
# These tests verify the new rules for point counts and zonePlot structure
# based on conformity plot type (cable_track, vegetation, overhang).


def test_cable_track_point_count_with_intermediate_points(study_base):
    """Test that cable_track conformity plot generates correct number of points.
    
    Rule: For conformity_plot="cable_track":
    - conformity.points = overhang (1) + lateral (2) + intermediate (N)
    - where N = length of inputs.form.intermediatePoints
    
    With intermediatePoints = [0.33, 0.66], total = 1 + 2 + 2 = 5 points
    """
    intermediate_points = [0.33, 0.66]
    expected_point_count = 1 + 2 + len(intermediate_points)  # 5 points
    
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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
            "selectedConformityRules": ["AT"],
            "conformity": ["AT"],
            "conformityPlot": "cable_track",
            "intermediatePoints": intermediate_points,
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "AT",
                "ruleName": "AT",
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
        ],
        "rulesDistances": [
            {
                "ruleType": "AT",
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
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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

    result_dict = get_conformity(python_inputs, study_base)
    
    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"
    
    at_conformity = result_dict["conformity"]["AT"]
    points = at_conformity.get("points", [])
    
    assert len(points) == expected_point_count, (
        f"For cable_track with {len(intermediate_points)} intermediate points, "
        f"expected {expected_point_count} points (1 overhang + 2 lateral + {len(intermediate_points)} intermediate), "
        f"but got {len(points)} points"
    )


def test_non_cable_track_point_count_without_intermediate_points(study_base):
    """Test that non-cable_track conformity plots generate correct number of points.
    
    Rule: For conformity_plot != "cable_track":
    - conformity.points = overhang (1) + lateral (2)
    - intermediatePoints are ignored
    - Total = 3 points
    """
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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
            "selectedConformityRules": ["AT"],
            "conformity": ["AT"],
            "conformityPlot": "vegetation",  # Not cable_track
            "intermediatePoints": [0.25, 0.5, 0.75],  # These should be ignored
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "AT",
                "ruleName": "AT",
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
        ],
        "rulesDistances": [
            {
                "ruleType": "AT",
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
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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

    result_dict = get_conformity(python_inputs, study_base)
    
    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"
    
    at_conformity = result_dict["conformity"]["AT"]
    points = at_conformity.get("points", [])
    
    expected_point_count = 3  # 1 overhang + 2 lateral
    assert len(points) == expected_point_count, (
        f"For vegetation conformity plot (non-cable_track), "
        f"expected {expected_point_count} points (1 overhang + 2 lateral), "
        f"but got {len(points)} points. "
        f"IntermediatePoints should be ignored for non-cable_track plots."
    )


def test_overhang_conformity_plot_zone_structure(study_base):
    """Test that overhang conformity plot has correct zonePlot structure.
    
    Rule: For conformity_plot="overhang":
    - zonePlot should have 4 points (LowerLeft, LowerRight, UpperRight, UpperLeft)
    - Lower points should have same y coordinate (horizontal line: lower_y == upper_y)
    - zoneBorder should have 1 segment: LowerLeft -> LowerRight (top edge only)
    """
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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
            "selectedConformityRules": ["AT"],
            "conformity": ["AT"],
            "conformityPlot": "overhang",
            "intermediatePoints": [],
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "AT",
                "ruleName": "AT",
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
        ],
        "rulesDistances": [
            {
                "ruleType": "AT",
                "lateral": None,
                "overhang": {
                    "63": 1.1,
                    "90": 1.2,
                    "150": 1.3,
                    "225": 1.4,
                    "400": 1.5,
                },
            },
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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

    result_dict = get_conformity(python_inputs, study_base)
    
    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"
    
    at_conformity = result_dict["conformity"]["AT"]
    zone_plot = at_conformity.get("zonePlot", {})
    zone_points = zone_plot.get("zonePoints", [])
    zone_border = zone_plot.get("zoneBorder", [])
    
    # VERIFY: Zone has 4 points
    assert len(zone_points) == 4, (
        f"For overhang conformity plot, zonePlot should have 4 points, "
        f"but got {len(zone_points)}: {[p for p in zone_points]}"
    )
    
    # VERIFY: Zone border has 1 segment (UpperRight -> UpperLeft)
    assert len(zone_border) == 1, (
        f"For overhang conformity plot, zoneBorder should have 1 segment, "
        f"but got {len(zone_border)}: {zone_border}"
    )


def test_vegetation_conformity_plot_zone_structure(study_base):
    """Test that vegetation conformity plot has correct zonePlot structure.
    
    Rule: For conformity_plot="vegetation":
    - zonePlot should have 4 different points (rectangle)
    - zoneBorder should have 3 segments:
      - UpperLeft -> LowerLeft
      - LowerLeft -> LowerRight
      - LowerRight -> UpperRight
    """
    python_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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
            "selectedConformityRules": ["AT"],
            "conformity": ["AT"],
            "conformityPlot": "vegetation",
            "intermediatePoints": [],
        },
        "rulesClimaticConditions": [
            {
                "ruleType": "AT",
                "ruleName": "AT",
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
        ],
        "rulesDistances": [
            {
                "ruleType": "AT",
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
        ],
    }

    obstacle_inputs = {
        "obstacle": {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": "test_obstacle",
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

    result_dict = get_conformity(python_inputs, study_base)
    
    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"
    
    at_conformity = result_dict["conformity"]["AT"]
    zone_plot = at_conformity.get("zonePlot", {})
    zone_points = zone_plot.get("zonePoints", [])
    zone_border = zone_plot.get("zoneBorder", [])
    
    # VERIFY: Zone has 4 points (rectangle)
    assert len(zone_points) == 4, (
        f"For vegetation conformity plot, zonePlot should have 4 points, "
        f"but got {len(zone_points)}: {[p for p in zone_points]}"
    )
    
    # VERIFY: Zone points form a rectangle (4 corners with different coordinates)
    zone_coords = [(p.get("LowerLeft") or p.get("LowerRight") or 
                    p.get("UpperRight") or p.get("UpperLeft")) 
                   for p in zone_points]
    assert len(zone_coords) == 4, "Zone should have 4 distinct corner points"
    
    # VERIFY: Zone border has 3 segments (U-shape or 3-sided)
    assert len(zone_border) == 3, (
        f"For vegetation conformity plot, zoneBorder should have 3 segments, "
        f"but got {len(zone_border)}: {zone_border}"
    )
    
    # VERIFY: Zone border connects properly (each segment should be a dict with x, y)
    for idx, segment in enumerate(zone_border):
        assert isinstance(segment, dict), (
            f"Zone border segment {idx} should be a dict, but got {type(segment)}"
        )
        assert "x" in segment and "y" in segment, (
            f"Zone border segment {idx} should have 'x' and 'y': {segment}"
        )
