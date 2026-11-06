# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging
from collections.abc import Callable
from copy import deepcopy

import numpy as np
from mechaphlowers import SectionStudy
from mechaphlowers.core.geometry.position_engine import PositionEngine

from stellar_engine.entities.errors import EffortEstimationError, _Errors
from stellar_engine.entities.inputs import CableEffortInputs

logger = logging.getLogger("stellar_engine")

# Mass (kg) used to locate the unloaded application point: a null load is ignored by the engine.
REFERENCE_MASS = 1e-6
# The bracketing of the searched load starts at this mass (kg) and doubles up to MAX_MASS.
INITIAL_MASS = 50.0
MAX_MASS = 20000.0


def _bracket_mass(
    objective: Callable[[float], float], sign: float
) -> tuple[float, float]:
    """Find an interval of masses over which the objective changes sign.

    Very large loads make the engine solver diverge, so the interval is grown
    progressively instead of using fixed wide bounds.
    """
    reference_mass = sign * REFERENCE_MASS
    reference_value = objective(reference_mass)
    lower_mass = reference_mass
    mass = INITIAL_MASS
    while mass <= MAX_MASS:
        value = objective(sign * mass)
        if value * reference_value <= 0:
            return min(lower_mass, sign * mass), max(lower_mass, sign * mass)
        lower_mass = sign * mass
        mass *= 2
    raise ValueError("The target displacement is not bracketed")


def estimate_cable_effort(inputs: dict, study: SectionStudy) -> dict:
    """Estimate the load applied on a span to displace the cable vertically.

    The load is applied at ``distanceToReferenceSupport`` from the reference support, at the
    given temperature. The returned effort is in daN (1 daN = 1 kg under the 10 m/s² convention):
    negative for a traction (upward displacement), positive for a weight (downward displacement).
    ``xDisplacement`` is the absolute displacement of the application point along the span axis.
    """
    effort_inputs = CableEffortInputs(**inputs)
    if effort_inputs.targetDisplacement == 0:
        return {"effort": 0.0, "xDisplacement": 0.0}

    span_index = study.manipulation.span_index_after_virtual_support(
        effort_inputs.spanIndex
    )
    if span_index is None:
        raise EffortEstimationError(
            _Errors.effort_span_split(effort_inputs.spanIndex)
        )

    balance_engine = deepcopy(
        study.balance_engine,
        {id(study.balance_engine._observers): []},
    )
    position_engine = PositionEngine(balance_engine)
    span_length = float(
        balance_engine.section_array.data.span_length.to_numpy()[span_index]
    )
    load_position = (
        effort_inputs.distanceToReferenceSupport
        if effort_inputs.referenceSupport == "LEFT"
        else span_length - effort_inputs.distanceToReferenceSupport
    )
    if not 0 <= load_position <= span_length:
        raise EffortEstimationError(
            _Errors.effort_position_out_of_span(
                effort_inputs.distanceToReferenceSupport, span_length
            )
        )

    n_spans = len(balance_engine.span_loads.load_mass)
    positions = np.zeros(n_spans)
    masses = np.zeros(n_spans)
    positions[span_index] = load_position

    def application_point(mass: float) -> np.ndarray:
        masses[span_index] = mass
        balance_engine.set_loads(positions, masses)
        # a cold solve right after set_loads may diverge
        balance_engine.solve_change_state()
        balance_engine.solve_change_state(
            new_temperature=effort_inputs.temperature
        )
        return position_engine.get_loads_coords()[span_index]

    reference_point = application_point(REFERENCE_MASS)
    signed_target = (
        effort_inputs.targetDisplacement
        if effort_inputs.direction == "UP"
        else -effort_inputs.targetDisplacement
    )

    def objective(mass: float) -> float:
        return application_point(mass)[2] - reference_point[2] - signed_target

    # Tractions are negative masses, weights are positive ones.
    sign = -1.0 if effort_inputs.direction == "UP" else 1.0
    unreachable_error = EffortEstimationError(
        _Errors.effort_target_unreachable(effort_inputs.targetDisplacement)
    )
    try:
        bounds = _bracket_mass(objective, sign)
        result = study.estimation_engine.estimate(objective, bounds)
    except Exception as error:
        logger.debug("Effort estimation failed: %s", error)
        raise unreachable_error from error
    if not result.converged:
        raise unreachable_error

    final_point = application_point(result.value)
    return {
        "effort": float(result.value),
        "xDisplacement": float(abs(final_point[0] - reference_point[0])),
    }
