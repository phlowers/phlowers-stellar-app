# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from copy import deepcopy

import numpy as np
import pytest

from stellar_engine.core.conformity.forest_trench import run
from stellar_engine.core.conformity.request import (
    ForestTrenchRequest,
)
from stellar_engine.entities.errors import ConformityInputError


def test_forest_trench_request_parses_shared_and_span_inputs(
    make_forest_trench_inputs,
):
    request = ForestTrenchRequest.from_dict(make_forest_trench_inputs())

    assert request.electric_tension == "400 KV"
    assert request.overhang_rules == ("AT",)
    assert request.lateral_rules == ("AT",)
    assert len(request.spans) == 2
    assert len(request.spans[0].distances) == 5


def test_forest_trench_request_rejects_mismatched_ground_arrays(
    make_forest_trench_inputs,
):
    inputs = make_forest_trench_inputs(span_indices=(0,))
    inputs["spans"][0]["altitudes"].pop()

    with pytest.raises(ConformityInputError, match="equal-length"):
        ForestTrenchRequest.from_dict(inputs)


def test_run_returns_multi_span_rule_scenarios_and_overhang_sag(
    solved_study, make_forest_trench_inputs
):
    inputs = make_forest_trench_inputs()
    original_obstacles = (
        solved_study.position_engine.get_group_points().obstacles
    )
    original_coordinates = (
        None
        if original_obstacles is None
        else {
            uuid: points.tolist()
            for uuid, points in original_obstacles.dict_coords().items()
        }
    )

    result = run(inputs, solved_study)

    current_obstacles = (
        solved_study.position_engine.get_group_points().obstacles
    )
    current_coordinates = (
        None
        if current_obstacles is None
        else {
            uuid: points.tolist()
            for uuid, points in current_obstacles.dict_coords().items()
        }
    )
    assert current_coordinates == original_coordinates
    assert len(result["spans"]) == 2
    for span in result["spans"]:
        assert span["spanIndex"] in (0, 1)
        assert span["length"] > 0
        assert isinstance(span["medianF1"], float)
        assert span["axis"] == [
            {"x": 0.0, "y": 0.0},
            {"x": span["length"], "y": 0.0},
        ]
        assert set(span["plot"]) == {"lateral", "lateralInverse", "overhang"}
        assert len(span["plot"]["lateral"]["AT"]["cable"]) == 5
        assert len(span["plot"]["lateralInverse"]["AT"]["limit"]) == 5
        assert set(span["plot"]["overhang"]["AT"]) == {"cable"}
        assert len(span["plot"]["overhang"]["AT"]["cable"]) == 5
        assert len(span["points"]) == 5

        for point in span["points"]:
            assert set(point) == {
                "distanceToLeftSupport",
                "groundElevation",
                "lateral",
                "lateralInverse",
                "overhang",
            }
            lateral = point["lateral"]["AT"]
            assert lateral["limitAxisDistance"] == pytest.approx(
                lateral["axisDistance"] - 1
            )
            lateral_inverse = point["lateralInverse"]["AT"]
            assert lateral_inverse["limitAxisDistance"] == pytest.approx(
                lateral_inverse["axisDistance"] + 1
            )
            overhang = point["overhang"]["AT"]
            assert overhang["heightAboveGround"] == pytest.approx(
                overhang["elevation"] - point["groundElevation"]
            )
            assert overhang[
                "complianceLimitHeightAboveGround"
            ] == pytest.approx(overhang["heightAboveGround"] - 1.5)

    expected_study = deepcopy(solved_study)
    expected_study.solve_change_state(
        wind_pressure=0,
        new_temperature=70,
        ice_thickness=0.0,
        wind_direction="clockwise",
    )
    expected_sag = expected_study.balance_engine.get_data_spans()["sag"]
    for span in result["spans"]:
        assert span["medianF1"] == pytest.approx(
            expected_sag[span["spanIndex"]]
        )


def test_run_without_overhang_rule_has_no_median_f1(
    solved_study, make_forest_trench_inputs
):
    inputs = make_forest_trench_inputs(span_indices=(0,), n_points=3)
    inputs["overhangRules"] = []

    result = run(inputs, solved_study)

    span = result["spans"][0]
    assert span["medianF1"] is None
    assert span["plot"]["overhang"] == {}
    assert all(point["overhang"] == {} for point in span["points"])


def test_run_wind_minus_swaps_lateral_states_and_keeps_limits(
    solved_study, make_forest_trench_inputs
):
    inputs = make_forest_trench_inputs(span_indices=(0,), n_points=3)
    inputs_wind_minus = deepcopy(inputs)
    inputs_wind_minus["form"]["windMinus"] = True

    default_span = run(inputs, solved_study)["spans"][0]
    wind_minus_span = run(inputs_wind_minus, solved_study)["spans"][0]

    # The same cable positions are exchanged, so each keeps its own limit
    for default_point, wind_minus_point in zip(
        default_span["points"], wind_minus_span["points"]
    ):
        assert wind_minus_point["lateral"]["AT"] == pytest.approx(
            default_point["lateralInverse"]["AT"]
        )
        assert wind_minus_point["lateralInverse"]["AT"] == pytest.approx(
            default_point["lateral"]["AT"]
        )
    for default_key, wind_minus_key in (
        ("lateralInverse", "lateral"),
        ("lateral", "lateralInverse"),
    ):
        default_plot = default_span["plot"][default_key]["AT"]
        wind_minus_plot = wind_minus_span["plot"][wind_minus_key]["AT"]
        assert wind_minus_plot == default_plot


VIRTUAL_SUPPORT_ON_FIRST_SPAN = {
    0: {
        "x": 100.0,
        "y": 0.0,
        "z": 60.0,
        "insulator_length": 3.0,
        "insulator_mass": 500.0,
        "hanging_cable_point_from_left_support": 100.0,
    },
}


@pytest.fixture
def study_with_virtual_support(solved_study):
    study = deepcopy(solved_study)
    study.set_virtual_support(VIRTUAL_SUPPORT_ON_FIRST_SPAN)
    study.solve_change_state()
    return study


def test_run_maps_real_span_index_after_virtual_support(
    solved_study, study_with_virtual_support, make_forest_trench_inputs
):
    # Real span 1 is engine span 2 once span 0 is split by a virtual support
    inputs = make_forest_trench_inputs(span_indices=(1,), n_points=3)

    result = run(inputs, study_with_virtual_support)

    span = result["spans"][0]
    real_supports = (
        study_with_virtual_support.position_engine.get_group_points()
        .all_points_virtual_separated()["supports"]
        .coords[:, 0, :]
    )
    expected_length = float(
        np.linalg.norm(real_supports[2, :2] - real_supports[1, :2])
    )
    assert span["length"] == pytest.approx(expected_length)
    expected_study = deepcopy(study_with_virtual_support)
    expected_study.solve_change_state(
        wind_pressure=0,
        new_temperature=70,
        ice_thickness=0.0,
        wind_direction="clockwise",
    )
    expected_sag = expected_study.balance_engine.get_data_spans()["sag"]
    assert span["medianF1"] == pytest.approx(float(expected_sag[2]))


def test_run_rejects_span_split_by_virtual_support(
    study_with_virtual_support, make_forest_trench_inputs
):
    inputs = make_forest_trench_inputs(span_indices=(0,), n_points=3)

    with pytest.raises(ConformityInputError, match="split"):
        run(inputs, study_with_virtual_support)
