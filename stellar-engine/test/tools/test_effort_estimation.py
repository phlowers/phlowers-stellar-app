# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import pytest

from stellar_engine.entities.errors import EffortEstimationError
from stellar_engine.tools.effort_estimation import estimate_cable_effort

INPUTS = {
    "spanIndex": 0,
    "referenceSupport": "LEFT",
    "distanceToReferenceSupport": 250.0,
    "temperature": 15.0,
    "targetDisplacement": 2.0,
    "direction": "DOWN",
}


@pytest.fixture
def solved_study(study_base):
    study_base.solve_adjustment()
    study_base.solve_change_state()
    return study_base


def test_down_displacement_gives_a_positive_weight(solved_study):
    result = estimate_cable_effort(INPUTS, solved_study)

    assert set(result.keys()) == {"effort", "xDisplacement"}
    assert result["effort"] > 0
    assert result["xDisplacement"] >= 0


def test_up_displacement_gives_a_negative_traction(solved_study):
    result = estimate_cable_effort({**INPUTS, "direction": "UP"}, solved_study)

    assert result["effort"] < 0
    assert result["xDisplacement"] >= 0


def test_larger_displacement_needs_a_larger_effort(solved_study):
    small = estimate_cable_effort(INPUTS, solved_study)
    large = estimate_cable_effort(
        {**INPUTS, "targetDisplacement": 4.0}, solved_study
    )

    assert abs(large["effort"]) > abs(small["effort"])


def test_zero_displacement_needs_no_effort(solved_study):
    result = estimate_cable_effort(
        {**INPUTS, "targetDisplacement": 0.0}, solved_study
    )

    assert result == {"effort": 0.0, "xDisplacement": 0.0}


def test_right_reference_support_mirrors_the_left_one(solved_study):
    from_left = estimate_cable_effort(INPUTS, solved_study)
    from_right = estimate_cable_effort(
        {**INPUTS, "referenceSupport": "RIGHT"}, solved_study
    )

    assert from_left["effort"] == pytest.approx(from_right["effort"], rel=0.1)


def test_study_is_left_untouched(solved_study):
    before = solved_study.balance_engine.span_loads.load_mass.copy()

    estimate_cable_effort(INPUTS, solved_study)

    assert (solved_study.balance_engine.span_loads.load_mass == before).all()


def test_distance_outside_the_span_raises(solved_study):
    with pytest.raises(EffortEstimationError, match="outside"):
        estimate_cable_effort(
            {**INPUTS, "distanceToReferenceSupport": 600.0}, solved_study
        )


def test_unreachable_displacement_raises(solved_study):
    with pytest.raises(EffortEstimationError, match="No effort found"):
        estimate_cable_effort(
            {**INPUTS, "targetDisplacement": 150.0, "direction": "UP"},
            solved_study,
        )
