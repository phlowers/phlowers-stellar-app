# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Make a 1D estimation robust to the trial values the solver cannot solve.

mechaphlowers searches evaluate the objective at both bounds and abort on
the first balance solver failure. ``RobustEstimation`` first reduces the
bounds to the values the solver can solve around a reference value, then
retries the search on bounds shrunk toward that reference when a failure
still occurs inside them. ``is_state_solvable`` is the mechaphlowers probe
used to build its ``is_solvable`` predicate.
"""

import logging
import math
from collections.abc import Callable
from copy import deepcopy
from dataclasses import dataclass
from typing import TypeVar

from mechaphlowers import SectionStudy
from mechaphlowers.entities.errors import SolverError, SuspectedChainReversal

logger = logging.getLogger("stellar_engine")

Bounds = tuple[float, float]
T = TypeVar("T")


def is_state_solvable(study: SectionStudy, **state) -> bool:
    """Tell whether the balance solver succeeds for this ``state``.

    ``state`` holds the ``solve_change_state`` arguments (``new_temperature``,
    ``wind_pressure``, ``ice_thickness``, ``wind_direction``...).

    Solves like the mechaphlowers estimation searches: directly on a fresh
    copy of the balance engine, without the warm start of
    ``SectionStudy.solve_change_state`` (which solves more cases). A fresh
    copy per probe, as a failed solve poisons the engine.
    """
    engine = study.balance_engine
    # Drop observers so the study's downstream engines are not copied
    probe = deepcopy(engine, {id(engine._observers): []})
    try:
        probe.solve_change_state(**state)
    except SolverError:
        return False
    return True


@dataclass(frozen=True)
class RobustEstimation:
    """Robust search of an estimated variable over bounds.

    Attributes:
        variable: Name of the estimated variable, for the logs.
        is_solvable: Tells whether the balance solver succeeds for a value.
        tolerance: Precision of the solvable limits.
        step: Step of the outward scan looking for the first unsolvable value.
        neutral: Value expected to be solvable (e.g. no wind); the reference
            is this value clamped into the bounds.
        retries: Retries of the search after a ``retried_errors`` failure.
        shrink: Fraction of each bound (from the reference) kept per retry.
        retried_errors: Solver failures triggering a retry.
    """

    variable: str
    is_solvable: Callable[[float], bool]
    tolerance: float
    step: float
    neutral: float = 0.0
    retries: int = 3
    shrink: float = 0.75
    retried_errors: tuple[type[Exception], ...] = (SuspectedChainReversal,)

    def reference(self, bounds: Bounds) -> float:
        """Return ``neutral`` clamped into ``bounds``."""
        lower, upper = bounds
        return min(max(self.neutral, lower), upper)

    def solvable_bounds(self, bounds: Bounds) -> Bounds:
        """Shrink ``bounds`` to the interval the balance solver can solve.

        The solvable values are not always a single interval (e.g. a much
        stronger wind can solve again on reversed chains). So, from the
        reference, each side is scanned outward by ``step`` up to the first
        failing value, then the limit is refined by bisection.

        When the reference cannot be solved either, the bounds are returned
        unchanged so that the solver error reaches the user.
        """
        reference = self.reference(bounds)
        if not self.is_solvable(reference):
            return bounds
        lower, upper = bounds
        return (
            self._solvable_limit(reference, lower),
            self._solvable_limit(reference, upper),
        )

    def _solvable_limit(self, reference: float, bound: float) -> float:
        step = math.copysign(self.step, bound - reference)
        last_solvable = reference
        while last_solvable != bound:
            trial = (
                bound
                if abs(bound - last_solvable) <= self.step
                else last_solvable + step
            )
            if not self.is_solvable(trial):
                break
            last_solvable = trial
        else:
            return bound
        failing = trial
        while abs(failing - last_solvable) > self.tolerance:
            middle = (last_solvable + failing) / 2
            if self.is_solvable(middle):
                last_solvable = middle
            else:
                failing = middle
        return last_solvable

    def shrunk_bounds(self, bounds: Bounds, reference: float) -> Bounds:
        """Move both bounds toward ``reference`` by ``shrink``."""
        lower, upper = bounds
        return (
            reference + (lower - reference) * self.shrink,
            reference + (upper - reference) * self.shrink,
        )

    def run(self, search: Callable[[Bounds], T], bounds: Bounds) -> T:
        """Run ``search`` on the solvable bounds, retrying on shrunk ones.

        Raises:
            retried_errors: If the search still fails after ``retries``.
        """
        reference = self.reference(bounds)
        bounds = self.solvable_bounds(bounds)
        retry = 0
        while True:
            try:
                return search(bounds)
            except self.retried_errors:
                if retry >= self.retries:
                    raise
                retry += 1
                bounds = self.shrunk_bounds(bounds, reference)
                logger.debug(
                    "%s search failed on a solver error: retrying on %s",
                    self.variable,
                    bounds,
                )
