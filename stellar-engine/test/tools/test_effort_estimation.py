# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import math

import numpy as np
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
from stellar_engine.tools.effort_estimation import estimate_effort

RESULT_KEYS = {
    "value",
    "residual",
    "iterations",
    "converged",
    "effort",
    "axisDisplacement",
}
GRAVITY_DAN_PER_KG = 0.981
SPAN_LENGTH = 500.0
INPUTS = {
    "spanIndex": 0,
    "loadPositionDistance": 250.0,
    "temperature": 15.0,
    "targetVerticalDisplacement": -2.0,
}
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


def load_point(study, mass: float) -> np.ndarray:
    """Load point (frame of the left support) computed on a study copy."""
    loaded = study.copy()
    loaded.set_loads(
        [INPUTS["loadPositionDistance"], 0.0, 0.0], [mass, 0.0, 0.0]
    )
    loaded.solve_change_state()
    coords = loaded.position_engine.get_loads_coords(
        project=True, frame_index=0
    )
    return np.array(coords[0])


def test_downward_displacement_gives_a_positive_weight(solved_study):
    result = estimate_effort(INPUTS, solved_study)

    assert set(result) == RESULT_KEYS
    assert result["converged"] is True
    assert result["value"] > 0
    displacement = (
        load_point(solved_study, result["value"])[2]
        - load_point(solved_study, 1e-6)[2]
    )
    assert displacement == pytest.approx(-2.0, abs=0.01)


def test_integer_load_masses_do_not_truncate_the_reference_mass(
    solved_study,
):
    solved_study.set_loads([0.0, 0.0, 0.0], [0, 0, 0])
    solved_study.solve_change_state()
    assert np.issubdtype(
        solved_study.balance_engine.span_loads.load_mass.dtype, np.integer
    )

    result = estimate_effort(INPUTS, solved_study)

    assert result["converged"] is True
    assert result["value"] > 0


def test_effort_is_the_mass_in_daN(solved_study):
    result = estimate_effort(INPUTS, solved_study)

    assert result["effort"] == pytest.approx(
        result["value"] * GRAVITY_DAN_PER_KG
    )


def test_upward_displacement_gives_a_negative_traction(solved_study):
    result = estimate_effort(
        {**INPUTS, "targetVerticalDisplacement": 2.0}, solved_study
    )

    assert result["value"] < 0
    displacement = (
        load_point(solved_study, result["value"])[2]
        - load_point(solved_study, 1e-6)[2]
    )
    assert displacement == pytest.approx(2.0, abs=0.01)


def test_axis_displacement_is_the_move_of_the_load_point_along_x(
    solved_study,
):
    result = estimate_effort(INPUTS, solved_study)

    expected = abs(
        load_point(solved_study, result["value"])[0]
        - load_point(solved_study, 1e-6)[0]
    )
    assert result["axisDisplacement"] > 0
    assert result["axisDisplacement"] == pytest.approx(expected, abs=1e-6)


def test_larger_displacement_needs_a_larger_effort(solved_study):
    small = estimate_effort(INPUTS, solved_study)
    large = estimate_effort(
        {**INPUTS, "targetVerticalDisplacement": -4.0}, solved_study
    )

    assert large["value"] > small["value"]


@pytest.mark.parametrize("position", [0.0, 250.0, SPAN_LENGTH])
def test_zero_displacement_needs_no_effort(solved_study, position: float):
    result = estimate_effort(
        {
            **INPUTS,
            "loadPositionDistance": position,
            "targetVerticalDisplacement": 0.0,
        },
        solved_study,
    )

    assert result == {
        "value": 0.0,
        "residual": 0.0,
        "iterations": 0,
        "converged": True,
        "effort": 0.0,
        "axisDisplacement": 0.0,
    }


@pytest.mark.parametrize("position", [0.0, SPAN_LENGTH, SPAN_LENGTH + 10.0])
def test_load_on_a_support_cannot_displace_the_cable(
    solved_study, position: float
):
    with pytest.raises(EstimationNotConvergedError, match="support"):
        estimate_effort(
            {**INPUTS, "loadPositionDistance": position}, solved_study
        )


def test_study_is_left_untouched(solved_study):
    before = solved_study.balance_engine.span_loads.load_mass.copy()

    estimate_effort(INPUTS, solved_study)

    assert (solved_study.balance_engine.span_loads.load_mass == before).all()


@pytest.mark.parametrize(
    "inputs",
    [
        {**INPUTS, "spanIndex": None},
        {**INPUTS, "spanIndex": -1},
        {**INPUTS, "loadPositionDistance": -1.0},
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


def test_split_span_raises_estimate_on_split_support_error(solved_study):
    solved_study.set_virtual_support(VIRTUAL_SUPPORT_ON_FIRST_SPAN)

    with pytest.raises(EstimateOnSplitSupportError, match="split"):
        estimate_effort(INPUTS, solved_study)


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


def test_bracket_mass_retries_a_failed_trial_with_a_smaller_step():
    def objective(mass: float) -> float:
        if abs(mass) >= 100.0:
            raise ConvergenceError("diverged")
        return abs(mass) - 76.0

    low, high = effort_estimation._bracket_mass(objective, 1.0)

    assert 50.0 <= low < 76.0 <= high < 100.0


def test_bracket_mass_retries_a_failed_traction_trial():
    def objective(mass: float) -> float:
        if abs(mass) >= 100.0:
            raise ConvergenceError("diverged")
        return 76.0 + mass

    low, high = effort_estimation._bracket_mass(objective, -1.0)

    assert -100.0 < low <= -76.0 < high <= -50.0


def test_load_point_rebuilds_the_engine_copy_after_a_solver_failure(
    solved_study, monkeypatch
):
    engine_class = type(solved_study.estimation_engine)
    builds = []
    build = engine_class._build_load_objective

    def counting_build(engine, *args):
        builds.append(1)
        return build(engine, *args)

    monkeypatch.setattr(engine_class, "_build_load_objective", counting_build)
    balance_engine_class = type(solved_study.balance_engine)
    solve = balance_engine_class.solve_change_state
    calls = []

    def failing_on_first_trial(engine, *args, **kwargs):
        calls.append(1)
        # the first call sets the initial state while building the objective
        if len(calls) == 2:
            raise ConvergenceError("diverged")
        return solve(engine, *args, **kwargs)

    monkeypatch.setattr(
        balance_engine_class, "solve_change_state", failing_on_first_trial
    )
    load_point = effort_estimation._load_point_function(INPUTS, solved_study)

    with pytest.raises(ConvergenceError):
        load_point(50.0)
    assert np.all(np.isfinite(load_point(50.0)))
    assert len(builds) == 2
