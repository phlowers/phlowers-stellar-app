# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Factory fixtures building fresh conformity inputs for the plot tests."""

from copy import deepcopy

import numpy as np
import pandas as pd
import pytest
from mechaphlowers import SectionArray, SectionStudy, sample_cable_catalog

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
from stellar_engine.plot.obstacles import add_single_obstacle

DEFAULT_LATERAL = {"63": 0.6, "90": 0.7, "150": 0.8, "225": 0.9, "400": 1}
DEFAULT_OVERHANG = {"63": 1.1, "90": 1.2, "150": 1.3, "225": 1.4, "400": 1.5}

# Distinguishes "use the default map" from an explicit None (no distance).
_DEFAULT = object()


def build_section_study(line_angles: list[float]) -> SectionStudy:
    """Section of the root `study_base` with the given line angles (grad)."""
    section_array = SectionArray(
        pd.DataFrame(
            {
                "name": ["1", "2", "3", "4"],
                "suspension": [False, True, True, False],
                "conductor_attachment_altitude": [50, 100, 50, 50],
                "crossarm_length": [10, 10, 10, 10],
                "line_angle": line_angles,
                "insulator_length": [3, 3, 3, 3],
                "span_length": [500, 500, 500, np.nan],
                "insulator_mass": [100.0, 50.0, 5.0, 100.0],
                "load_mass": [0, 0, 0, 0],
                "load_position": [0, 0, 0, 0],
            }
        ),
        sagging_parameter=2000,
        sagging_temperature=15,
    )
    section_array.add_units({"line_angle": "grad"})
    return SectionStudy(
        cable_array=sample_cable_catalog.get_as_object(["ASTER600"]),
        section_array=section_array,
    )


@pytest.fixture
def study_angled() -> SectionStudy:
    return build_section_study([0, 30, 30, 0])


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
        return ScenarioBuilder(
            parameters, get_strategy(parameters.conformity_plot)
        ).build_all(rules_climatic_conditions, tension_rules)

    return _build_scenarios


@pytest.fixture(scope="module")
def solved_study() -> SectionStudy:
    study = build_section_study([0, 0, 0, 0])
    study.solve_adjustment()
    study.solve_change_state()
    return study


@pytest.fixture
def run_conformity(solved_study):
    def _run_conformity(python_inputs: dict) -> dict:
        study = deepcopy(solved_study)
        add_single_obstacle(
            {"obstacles": [python_inputs["obstacle"]]},
            study,
            support_index=0,
        )
        return get_conformity(python_inputs, study)

    return _run_conformity
