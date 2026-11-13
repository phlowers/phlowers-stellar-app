# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from copy import deepcopy

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
