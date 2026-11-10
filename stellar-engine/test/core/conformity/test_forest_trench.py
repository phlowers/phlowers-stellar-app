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
    assert request.base_case.temperature == 15
    assert len(request.spans) == 2
    assert len(request.spans[0].distances) == 5


def test_forest_trench_request_rejects_mismatched_ground_arrays(
    make_forest_trench_inputs,
):
    inputs = make_forest_trench_inputs(span_indices=(0,))
    inputs["spans"][0]["altitudes"].pop()

    with pytest.raises(ConformityInputError, match="equal-length"):
        ForestTrenchRequest.from_dict(inputs)


def test_run_returns_multi_span_plot_table_and_repartition_sag(
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
        assert len(span["plot"]["baseCase"]) == 5
        assert len(span["plot"]["repartition"]) == 5
        assert len(span["plot"]["lateral"]["AT"]["cable"]) == 5
        assert len(span["plot"]["lateralInverse"]["AT"]["limit"]) == 5
        assert len(span["points"]) == 5

        for point in span["points"]:
            assert point["baseCase"]["heightAboveGround"] == pytest.approx(
                point["baseCase"]["elevation"] - point["groundElevation"]
            )
            lateral = point["lateral"]["AT"]
            side = lateral["axisDistance"] or 200
            expected_limit = lateral["axisDistance"] + (1 if side > 0 else -1)
            assert lateral["limitAxisDistance"] == pytest.approx(
                expected_limit
            )
            overhang = point["overhang"]["AT"]
            assert overhang[
                "complianceLimitHeightAboveGround"
            ] == pytest.approx(
                overhang["elevation"] - 1.5 - point["groundElevation"]
            )

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
