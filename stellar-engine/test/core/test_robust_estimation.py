# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import pytest
from mechaphlowers.entities.errors import ConvergenceError

from stellar_engine.core.estimation.robust import RobustEstimation


def robust(is_solvable, **kwargs) -> RobustEstimation:
    return RobustEstimation(
        variable="Wind",
        is_solvable=is_solvable,
        tolerance=1.0,
        step=50.0,
        **kwargs,
    )


def test_solvable_bounds_stop_at_the_first_failing_value():
    # strong values solve again on a reversed state beyond a failing gap
    estimation = robust(
        lambda value: -300.0 <= value <= 400.0 or value <= -950.0
    )

    lower, upper = estimation.solvable_bounds((-1000.0, 1000.0))

    assert lower == pytest.approx(-300.0, abs=1.0)
    assert upper == pytest.approx(400.0, abs=1.0)


def test_solvable_bounds_scan_from_the_neutral_value_clamped_in_bounds():
    estimation = robust(lambda value: value <= 400.0, neutral=0.0)

    lower, upper = estimation.solvable_bounds((100.0, 1000.0))

    assert lower == 100.0
    assert upper == pytest.approx(400.0, abs=1.0)


def test_solvable_bounds_stop_on_a_value_bracketing_the_solution():
    tried = []

    def is_solvable(value):
        tried.append(value)
        return True

    estimation = robust(is_solvable, brackets=lambda value: value <= -120.0)

    lower, upper = estimation.solvable_bounds((-1000.0, 1000.0))

    assert lower == -150.0
    assert upper == 1000.0
    assert min(tried) == -150.0


def test_solvable_bounds_are_unchanged_when_the_reference_fails():
    estimation = robust(lambda _value: False)

    assert estimation.solvable_bounds((-1000.0, 1000.0)) == (-1000.0, 1000.0)


def test_run_retries_on_bounds_shrunk_toward_the_reference():
    searched_bounds = []

    def search(bounds):
        searched_bounds.append(bounds)
        if len(searched_bounds) < 3:
            raise ConvergenceError("solver failed")
        return "result"

    estimation = robust(
        lambda _value: True,
        neutral=100.0,
        shrink=0.5,
        retried_errors=(ConvergenceError,),
    )

    assert estimation.run(search, (-300.0, 500.0)) == "result"
    assert searched_bounds == [
        (-300.0, 500.0),
        (-100.0, 300.0),
        (0.0, 200.0),
    ]


def test_run_gives_up_after_the_retries():
    calls = []

    def search(bounds):
        calls.append(bounds)
        raise ConvergenceError("solver failed")

    estimation = robust(
        lambda _value: True, retries=2, retried_errors=(ConvergenceError,)
    )

    with pytest.raises(ConvergenceError):
        estimation.run(search, (-100.0, 100.0))
    assert len(calls) == 3
