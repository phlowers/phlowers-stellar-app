# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Factory fixtures building fresh conformity inputs for the plot tests."""

from copy import deepcopy

import pytest

from stellar_engine.core.conformity.scenarios import (
    RuleClimaticCondition,
    build_scenario_bulk,
)
from stellar_engine.core.conformity.simulation import get_conformity
from stellar_engine.entities.conformity import (
    ConformityParametersInput,
    RuleDistanceInput,
    TensionRules,
)
from stellar_engine.plot.obstacles import add_single_obstacle

DEFAULT_LATERAL = {"63": 0.6, "90": 0.7, "150": 0.8, "225": 0.9, "400": 1}
DEFAULT_OVERHANG = {"63": 1.1, "90": 1.2, "150": 1.3, "225": 1.4, "400": 1.5}

# Distinguishes "use the default map" from an explicit None (no distance).
_DEFAULT = object()


def _with_rule_names(form: dict, rules: list[dict]) -> dict:
    names = [rule["ruleType"] for rule in rules]
    return {**form, "selectedConformityRules": names, "conformity": names}


@pytest.fixture
def make_form():
    def _make_form(**overrides) -> dict:
        form = {
            "windZone": "200",
            "windPressure": 200,
            "windMinus": False,
            "redZonePresence": False,
            "repartitionTemperature": 70,
            "lateralDistanceTemperature": 68,
            "conformityPlot": "vegetation",
            "intermediatePoints": [],
        }
        form.update(overrides)
        return form

    return _make_form


@pytest.fixture
def make_rule():
    def _make_rule(
        rule_type: str,
        lateral_temp=17,
        lateral_pressure="WindZoneInput",
        overhang_temp=None,
        overhang_pressure=0,
        lateral_red_zone=False,
    ) -> dict:
        return {
            "ruleType": rule_type,
            "ruleName": rule_type,
            "lateralPoint": {
                "temperature": lateral_temp,
                "pressure": lateral_pressure,
                "red_zone": lateral_red_zone,
            },
            "overhangPoint": {
                "temperature": overhang_temp,
                "pressure": overhang_pressure,
                "red_zone": False,
            },
        }

    return _make_rule


@pytest.fixture
def make_distances():
    def _make_distances(
        rule_type: str, lateral=_DEFAULT, overhang=_DEFAULT
    ) -> dict:
        return {
            "ruleType": rule_type,
            "lateral": deepcopy(DEFAULT_LATERAL)
            if lateral is _DEFAULT
            else deepcopy(lateral),
            "overhang": deepcopy(DEFAULT_OVERHANG)
            if overhang is _DEFAULT
            else deepcopy(overhang),
        }

    return _make_distances


@pytest.fixture
def make_obstacle():
    def _make_obstacle(
        obstacle_type: str, name: str = "test_obstacle", position=None
    ) -> dict:
        return {
            "uuid": "52b6cc64-72c2-442f-8159-89dba631a066",
            "supportUuid": "0bf38433-6b68-4cf7-ae18-9766db2967ed",
            "supportIndex": 0,
            "name": name,
            "type": obstacle_type,
            "altitudeType": "absolute",
            "lateralDistanceType": "SPAN_AXIS",
            "referenceSupport": "LEFT",
            "positions": [position or {"x": 10, "y": 5, "z": 65}],
        }

    return _make_obstacle


@pytest.fixture
def make_python_inputs(make_obstacle):
    def _make_python_inputs(
        obstacle_type: str,
        form: dict,
        rules: list[dict],
        distances: list[dict],
        tension: str = "400 KV",
        obstacle_name: str = "test_obstacle",
        obstacle_position=None,
    ) -> dict:
        return {
            "obstacle": make_obstacle(
                obstacle_type, name=obstacle_name, position=obstacle_position
            ),
            "electricTension": tension,
            "form": _with_rule_names(form, rules),
            "rulesClimaticConditions": rules,
            "rulesDistances": distances,
        }

    return _make_python_inputs


@pytest.fixture
def build_scenarios():
    def _build_scenarios(
        rules: list[dict],
        form: dict,
        distances: list[dict],
        tension: str = "400",
    ):
        parameters = ConformityParametersInput.from_dict(
            _with_rule_names(form, rules)
        )
        rules_climatic_conditions = (
            RuleClimaticCondition.build_rules_climatic_conditions(
                rules, wind_zone_pressure=parameters.wind_pressure
            )
        )
        rule_distances = [RuleDistanceInput.from_dict(d) for d in distances]
        tension_rules = TensionRules.build_tension_rules(
            tension, rule_distances
        )
        return build_scenario_bulk(
            rules_climatic_conditions, parameters, tension_rules
        )

    return _build_scenarios


@pytest.fixture
def run_conformity(study_base):
    def _run_conformity(python_inputs: dict) -> dict:
        add_single_obstacle(
            {"obstacles": [python_inputs["obstacle"]]},
            study_base,
            support_index=0,
        )
        return get_conformity(python_inputs, study_base)

    return _run_conformity
