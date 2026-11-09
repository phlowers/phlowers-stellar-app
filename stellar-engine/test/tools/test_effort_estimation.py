# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import math

import pytest
from mechaphlowers.entities.errors import (
    ConvergenceError,
    EstimateOnSplitSupportError,
    InvalidManipulationIndex,
)

from stellar_engine.entities.errors import (
    EstimationInputError,
    EstimationNotConvergedError,
)
from stellar_engine.tools import effort_estimation
from stellar_engine.tools.effort_estimation import (
    estimate_effort,
    get_load_points,
)

RESULT_KEYS = {"value", "residual", "iterations", "converged"}
LOAD_INPUTS = {
    "spanIndex": 0,
    "loadPositionDistance": 250.0,
    "temperature": 15.0,
}
INPUTS = {**LOAD_INPUTS, "targetVerticalDisplacement": -2.0}
VIRTUAL_SUPPORT_ON_FIRST_SPAN = {
    0: {
        "x": 100.0,
        "y": 0.0,
        "z": 60.0,
        "insulator_length": 3.0,
        "insulator_mass": 500.0,
        "hanging_cable_point_from_left_support": 100.0,
    }
}


@pytest.fixture
def solved_study(study_base):
    study_base.solve_adjustment()
    study_base.solve_change_state()
    return study_base


def vertical_displacement(study, mass: float) -> float:
    unloaded, loaded = get_load_points(
        {**LOAD_INPUTS, "loadMasses": [0.0, mass]}, study
    )["points"]
    return loaded[2] - unloaded[2]


def test_downward_displacement_gives_a_positive_weight(solved_study):
    result = estimate_effort(INPUTS, solved_study)

    assert set(result.keys()) == RESULT_KEYS
    assert result["converged"] is True
    assert result["value"] > 0
    assert vertical_displacement(solved_study, result["value"]) == (
        pytest.approx(-2.0, abs=0.01)
    )


def test_upward_displacement_gives_a_negative_traction(solved_study):
    result = estimate_effort(
        {**INPUTS, "targetVerticalDisplacement": 2.0}, solved_study
    )

    assert result["value"] < 0
    assert vertical_displacement(solved_study, result["value"]) == (
        pytest.approx(2.0, abs=0.01)
    )


def test_larger_displacement_needs_a_larger_effort(solved_study):
    small = estimate_effort(INPUTS, solved_study)
    large = estimate_effort(
        {**INPUTS, "targetVerticalDisplacement": -4.0}, solved_study
    )

    assert large["value"] > small["value"]


def test_zero_displacement_needs_no_effort(solved_study):
    result = estimate_effort(
        {**INPUTS, "targetVerticalDisplacement": 0.0}, solved_study
    )

    assert result == {
        "value": 0.0,
        "residual": 0.0,
        "iterations": 0,
        "converged": True,
    }


def test_study_is_left_untouched(solved_study):
    before = solved_study.balance_engine.span_loads.load_mass.copy()

    estimate_effort(INPUTS, solved_study)
    get_load_points({**LOAD_INPUTS, "loadMasses": [100.0]}, solved_study)

    assert (solved_study.balance_engine.span_loads.load_mass == before).all()


def test_load_points_follow_the_masses(solved_study):
    points = get_load_points(
        {**LOAD_INPUTS, "loadMasses": [0.0, 100.0, -100.0]}, solved_study
    )["points"]

    assert len(points) == 3
    assert all(len(point) == 3 for point in points)
    assert all(isinstance(value, float) for point in points for value in point)
    unloaded, weighted, pulled = points
    assert weighted[2] < unloaded[2] < pulled[2]


def test_no_load_mass_gives_no_point(solved_study):
    assert get_load_points(
        {**LOAD_INPUTS, "loadMasses": []}, solved_study
    ) == {"points": []}


@pytest.mark.parametrize(
    "inputs",
    [
        {**INPUTS, "spanIndex": None},
        {**INPUTS, "spanIndex": -1},
        {**INPUTS, "loadPositionDistance": 0.0},
        {**INPUTS, "temperature": None},
        {**INPUTS, "targetVerticalDisplacement": None},
        {**INPUTS, "targetVerticalDisplacement": math.nan},
    ],
)
def test_invalid_effort_inputs_raise_estimation_input_error(
    solved_study, inputs: dict
):
    with pytest.raises(EstimationInputError):
        estimate_effort(inputs, solved_study)


@pytest.mark.parametrize(
    "inputs",
    [
        LOAD_INPUTS,
        {**LOAD_INPUTS, "loadMasses": [math.inf]},
        {**LOAD_INPUTS, "loadMasses": ["heavy"]},
    ],
)
def test_invalid_load_points_inputs_raise_estimation_input_error(
    solved_study, inputs: dict
):
    with pytest.raises(EstimationInputError):
        get_load_points(inputs, solved_study)


def test_unreachable_displacement_raises_not_converged(solved_study):
    with pytest.raises(EstimationNotConvergedError, match="did not converge"):
        estimate_effort(
            {**INPUTS, "targetVerticalDisplacement": 150.0}, solved_study
        )


def test_unbracketed_target_raises_not_converged(solved_study, monkeypatch):
    monkeypatch.setattr(
        effort_estimation, "_bracket_mass", lambda objective, sign: None
    )

    with pytest.raises(EstimationNotConvergedError, match="did not converge"):
        estimate_effort(INPUTS, solved_study)


def test_plain_value_error_raises_not_converged(solved_study, monkeypatch):
    def not_computable(objective, sign):
        raise ValueError("NaN displacement")

    monkeypatch.setattr(effort_estimation, "_bracket_mass", not_computable)

    with pytest.raises(EstimationNotConvergedError):
        estimate_effort(INPUTS, solved_study)


def test_typed_engine_errors_keep_their_own_error(solved_study, monkeypatch):
    def typed_error(objective, sign):
        raise InvalidManipulationIndex("bad index")

    monkeypatch.setattr(effort_estimation, "_bracket_mass", typed_error)

    with pytest.raises(InvalidManipulationIndex):
        estimate_effort(INPUTS, solved_study)


def test_span_out_of_range_raises_invalid_manipulation_index(solved_study):
    with pytest.raises(InvalidManipulationIndex):
        estimate_effort({**INPUTS, "spanIndex": 99}, solved_study)


@pytest.mark.parametrize(
    "run, inputs",
    [
        (estimate_effort, INPUTS),
        (get_load_points, {**LOAD_INPUTS, "loadMasses": [0.0]}),
    ],
)
def test_split_span_raises_estimate_on_split_support_error(
    solved_study, run, inputs: dict
):
    solved_study.set_virtual_support(VIRTUAL_SUPPORT_ON_FIRST_SPAN)

    with pytest.raises(EstimateOnSplitSupportError, match="split"):
        run(inputs, solved_study)


def test_bracket_mass_finds_the_interval_of_a_traction():
    low, high = effort_estimation._bracket_mass(
        lambda mass: mass + 120.0, -1.0
    )

    assert low < -120.0 < high


def test_bracket_mass_returns_none_without_sign_change():
    assert effort_estimation._bracket_mass(lambda mass: 1.0, 1.0) is None


def test_bracket_mass_returns_none_when_the_solver_fails():
    def objective(mass: float) -> float:
        if abs(mass) > 1.0:
            raise ConvergenceError("diverged")
        return 1.0

    assert effort_estimation._bracket_mass(objective, 1.0) is None
