# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Effort (traction or weight) estimation on a span of a section study.

Built on ``stellar_engine.core.estimation``: same input validation, span
index mapping, solver wrapper, result format (``EstimationResult``) and
errors. Unlike ``estimate_load``, the target is the vertical displacement of
the load application point instead of a distance to an obstacle: the
mechaphlowers distance to an obstacle cannot be computed near a traction.

Inputs:
    spanIndex: Index of the span (before manipulation) holding the load.
    loadPositionDistance: Load position from the left support of the span
        (m).
    temperature: Fixed cable temperature in °C.
    targetVerticalDisplacement: Wanted vertical displacement of the load
        application point (m), positive upward.

The study is left untouched: the loads are applied on a copy of its balance
engine. An existing load on ``spanIndex`` is replaced, as in
``estimate_load``.
"""

from collections.abc import Callable
from copy import deepcopy

import numpy as np
from mechaphlowers import SectionStudy, units
from mechaphlowers.core.geometry.position_engine import PositionEngine
from mechaphlowers.core.numeric import EstimationResult
from mechaphlowers.entities.errors import SolverError
from mechaphlowers.utils import arr

from stellar_engine.core.estimation import (
    _engine_span_index,
    _index,
    _non_negative_float,
    _required_float,
    _solve,
)
from stellar_engine.entities.errors import (
    EstimationNotConvergedError,
    _Errors,
)

# A null mass is ignored by the engine: this mass locates the unloaded point.
REFERENCE_MASS = 1e-6
# Very large loads make the engine solver diverge: the search interval of
# the mass (kg) starts at INITIAL_MASS and doubles up to MAX_MASS.
INITIAL_MASS = 50.0
MAX_MASS = 20000.0


def _is_on_support(inputs: dict, study: SectionStudy) -> bool:
    """Whether the load position is on one of the supports of the span.

    The engine ignores a load on a support, whose cable point cannot move.
    """
    span_index = _engine_span_index(study, _index(inputs, "spanIndex"))
    span_length = arr.decr(
        study.balance_engine.section_array.data.span_length.to_numpy()
    )[span_index]
    position = _non_negative_float(inputs, "loadPositionDistance")
    return position <= 0 or position >= span_length


def _load_point_function(
    inputs: dict, study: SectionStudy
) -> Callable[[float], np.ndarray]:
    """Return ``f(mass) -> [x, y, z]`` of the load application point (m).

    Coordinates are expressed in the frame of the left support of the span,
    so that ``x`` runs along the span axis.
    """
    span_index = _engine_span_index(study, _index(inputs, "spanIndex"))
    load_position_distance = _non_negative_float(
        inputs, "loadPositionDistance"
    )
    temperature = _required_float(inputs, "temperature")

    original_balance_engine = study.balance_engine
    # Drop observers so the study's downstream engines are not copied
    balance_engine = deepcopy(
        original_balance_engine,
        {id(original_balance_engine._observers): []},
    )
    position_engine = PositionEngine(balance_engine)
    span_length = arr.decr(
        balance_engine.section_array.data.span_length.to_numpy()
    )
    load_positions = balance_engine.span_loads.load_position * span_length
    load_masses = balance_engine.span_loads.load_mass.copy()
    load_positions[span_index] = load_position_distance

    def load_point(mass: float) -> np.ndarray:
        load_masses[span_index] = mass if mass != 0 else REFERENCE_MASS
        balance_engine.set_loads(load_positions, load_masses)
        # set_loads resets the nodes: a cold solve may diverge
        balance_engine.solve_change_state()
        balance_engine.solve_change_state(new_temperature=temperature)
        coords = position_engine.get_loads_coords(
            project=True, frame_index=span_index
        )
        return np.array(coords[span_index], dtype=float)

    return load_point


def _bracket_mass(
    objective: Callable[[float], float], sign: float
) -> tuple[float, float] | None:
    """Find masses of ``sign`` over which the objective changes sign.

    Returns None when no sign change is found up to MAX_MASS or when the
    engine solver fails before.
    """
    lower_mass = sign * REFERENCE_MASS
    reference_value = objective(lower_mass)
    mass = INITIAL_MASS
    while True:
        try:
            value = objective(sign * mass)
        except SolverError:
            return None
        if value * reference_value <= 0:
            return min(lower_mass, sign * mass), max(lower_mass, sign * mass)
        if mass >= MAX_MASS:
            return None
        lower_mass = sign * mass
        mass = min(mass * 2, MAX_MASS)


def estimate_effort(inputs: dict, study: SectionStudy) -> dict:
    """Estimate the load mass (kg) moving the load point by a vertical target.

    The estimated ``value`` is negative for a traction (upward displacement)
    and positive for a weight (downward displacement); ``effort`` is the same
    load in daN. ``axisDisplacement`` is the displacement (m, absolute value)
    of the load point along the span axis between the unloaded cable and the
    cable under the estimated load.
    """
    target = _required_float(inputs, "targetVerticalDisplacement")
    _required_float(inputs, "temperature")
    on_support = _is_on_support(inputs, study)
    if target == 0:
        return {
            "value": 0.0,
            "residual": 0.0,
            "iterations": 0,
            "converged": True,
            "effort": 0.0,
            "axisDisplacement": 0.0,
        }
    if on_support:
        raise EstimationNotConvergedError(_Errors.estimation_load_on_support())
    load_point = _load_point_function(inputs, study)
    unloaded_point = load_point(REFERENCE_MASS)

    def objective(mass: float) -> float:
        return load_point(mass)[2] - unloaded_point[2] - target

    # Tractions are negative masses, weights are positive ones.
    sign = -1.0 if target > 0 else 1.0

    def solve(kwargs: dict) -> EstimationResult:
        bounds = _bracket_mass(objective, sign)
        if bounds is None:
            raise EstimationNotConvergedError(
                _Errors.estimation_not_converged(
                    "Effort",
                    sign * MAX_MASS,
                    tuple(sorted((0.0, sign * MAX_MASS))),
                )
            )
        return study.estimation_engine.estimate(objective, bounds)

    result = _solve("Effort", solve, None)
    loaded_point = load_point(result["value"])
    return {
        **result,
        "effort": float(units(result["value"], "kg").to("daN").magnitude),
        "axisDisplacement": float(abs(loaded_point[0] - unloaded_point[0])),
    }
