# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Inverse estimations on a section study (rope, temperature, load, wind).

Each function reads camelCase inputs coming from the frontend, delegates to
``SectionStudy.estimation_engine`` (mechaphlowers ``EstimationEngine``) and
returns a JSON-serializable dictionary. The study is left untouched.
``estimate_minimum_distance_wind`` has no target distance: it uses the
mechaphlowers closest-point mode of ``estimate_wind``.

Common inputs:
    spanIndex: Index of the span (before manipulation) holding the obstacle.
    obstaclePoint: Obstacle coordinates ``[x, y, z]`` in meters (section
        frame). Ignored when ``obstacleUuid`` is given.
    obstacleUuid: Optional uuid of an obstacle registered in the study; its
        point ``pointIndex`` (required then) is used as obstacle point.
    bounds: Optional ``[lower, upper]`` search interval of the estimated
        variable. Defaults to the mechaphlowers defaults.
    temperature: Optional fixed cable temperature in °C.
    windPressure: Optional fixed wind pressure in Pa.
    iceThickness: Optional fixed ice thickness in cm.

Raises (each class name is a ``PythonErrorCode`` on the frontend side, except
``ConformityInputError`` which falls back to the caller's generic message):
    EstimationInputError: An input is missing or invalid.
    ObstacleNotFoundError: ``obstacleUuid`` is not registered in the study.
    ConformityInputError: ``pointIndex`` is out of the obstacle points (not
        reachable from the UI).
    EstimationNotConvergedError: The target is not reachable within bounds.
    EstimationTargetAboveBoundsError: ``EstimationNotConvergedError`` subclass
        raised by ``estimate_temperature`` (when ``bounds`` is given) if the
        search stopped at the upper bound: the target needs a larger value.
    EstimationTargetBelowBoundsError: Same, at the lower bound: the target
        needs a smaller value.
    InvalidManipulationIndex: ``spanIndex`` or ``supportIndex`` is out of
        range (mechaphlowers).
    EstimateOnSplitSupportError: ``spanIndex`` is split by a virtual
        support (mechaphlowers).
    SolverError: The balance solver fails for a trial value; its subclasses
        (``ConvergenceError``, ``SuspectedChainReversal``) are forwarded
        unchanged so the frontend shows the most specific message
        (mechaphlowers).

Warns (forwarded to the frontend through the captured Python warnings):
    BalanceEngineWarning: The study had not been adjusted yet; mechaphlowers
        then runs the adjustment on its internal copy (mechaphlowers).
"""

import logging
import math
from collections.abc import Callable
from typing import Literal

from mechaphlowers import SectionStudy, units
from mechaphlowers.core.numeric import EstimationResult
from mechaphlowers.entities.errors import (
    EstimateOnSplitSupportError,
)

from stellar_engine.core.estimation.robust import (
    RobustEstimation,
    is_state_solvable,
)
from stellar_engine.core.estimation.validation import (
    _bounds,
    _index,
    _non_negative_float,
    _obstacle_point,
    _optional_float,
    _required_float,
)
from stellar_engine.entities.errors import (
    EstimationInputError,
    EstimationNotConvergedError,
    EstimationTargetAboveBoundsError,
    EstimationTargetBelowBoundsError,
    _Errors,
)

logger = logging.getLogger("stellar_engine")

# Wind direction used by the mechaphlowers estimations: our default
WIND_DIRECTION: Literal["clockwise", "anticlockwise"] = "clockwise"
# Our default wind pressure search interval for mechaphlowers (Pa)
DEFAULT_WIND_BOUNDS = (-1000.0, 1000.0)

# ------ Robust estimation parameters ------
# Step (Pa) of the outward scan looking for the first unsolvable wind
WIND_SOLVABLE_STEP = 50.0
# Retries of the closest-point search after a chain reversal
WIND_REVERSAL_RETRIES = 3
# Fraction of each bound (from the reference wind) kept on each retry
WIND_REVERSAL_SHRINK = 0.75

# ------ Tolerances ------
# Precision (Pa) of the limit of the solvable wind pressures
WIND_SOLVABLE_TOLERANCE = 1.0
# Tolerance for the solvable temperature (degC)
TEMPERATURE_SOLVABLE_TOLERANCE = 1.0
# Tolerance for the solvable rope (m)
ROPE_SOLVABLE_TOLERANCE = 0.1
# Tolerance for the load (N)
LOAD_SOLVABLE_TOLERANCE = 1.0


def _ice_thickness_meters(inputs: dict) -> float | None:
    ice_thickness_cm = _optional_float(inputs, "iceThickness")
    if ice_thickness_cm is None:
        return None
    return float(units(ice_thickness_cm, "cm").to("m").magnitude)


def _engine_span_index(study: SectionStudy, span_index: int) -> int:
    """Map a span index before manipulation to the balance engine one.

    Raises:
        InvalidManipulationIndex: If ``span_index`` is out of range.
        EstimateOnSplitSupportError: If the span is split by a virtual support.
    """
    engine_span_index = study.manipulation.span_index_after_virtual_support(
        span_index
    )
    if engine_span_index is None:
        raise EstimateOnSplitSupportError(
            f"Span {span_index} is split by a virtual support: "
            "estimation is not possible on this span."
        )
    return engine_span_index


def _raise_if_stopped_at_bound(
    variable: str, value: float, bounds: tuple[float, float]
) -> None:
    """Raise the side-specific error when an unreached search ended on a bound.

    mechaphlowers returns the bound closest to the target when the objective
    does not change sign over the bounds.
    """
    lower, upper = bounds
    if math.isclose(value, upper):
        raise EstimationTargetAboveBoundsError(
            _Errors.estimation_target_beyond_bound(variable, "upper", upper)
        )
    if math.isclose(value, lower):
        raise EstimationTargetBelowBoundsError(
            _Errors.estimation_target_beyond_bound(variable, "lower", lower)
        )


def _solve(
    variable: str,
    solve: Callable[[dict], EstimationResult],
    bounds: tuple[float, float] | None,
    report_bound_side: bool = False,
) -> dict:
    """Run the estimation and convert mechaphlowers failures to Stellar errors.

    ``report_bound_side`` tells, when the search stops on a bound, on which
    side of the bounds the target lies. Only valid for a distance that varies
    monotonically with the estimated variable (the temperature).

    Raises:
        EstimationNotConvergedError: If the target is not reached, or if the
            objective is NaN at the bounds (plain ``ValueError``). Its
            subclasses tell on which side of the bounds the target lies, when
            ``report_bound_side`` is set and the search stopped at a bound.
        SolverError: Forwarded unchanged, like the typed ``ValueError``
            subclasses of mechaphlowers, to keep their own frontend code.
    """
    kwargs = {} if bounds is None else {"bounds": bounds}
    try:
        result = solve(kwargs)
    except ValueError as error:
        # mechaphlowers raises a plain ValueError when the distance is NaN at
        # the bounds; its typed errors (subclasses) must keep their own code.
        if type(error) is not ValueError:
            raise
        raise EstimationNotConvergedError(
            _Errors.estimation_distance_not_computable(variable)
        ) from error
    logger.debug("%s estimation result: %s", variable, result)
    if not result.converged:
        if report_bound_side and bounds is not None:
            _raise_if_stopped_at_bound(variable, result.value, bounds)
        raise EstimationNotConvergedError(
            _Errors.estimation_not_converged(
                variable, result.value, bounds or "default"
            )
        )
    return {
        "value": float(result.value),
        "residual": float(result.residual),
        "iterations": int(result.iterations),
        "converged": bool(result.converged),
        "extra": {name: float(value) for name, value in result.extra.items()},
    }


def estimate_temperature(inputs: dict, study: SectionStudy) -> dict:
    """Estimate the cable temperature (°C) giving ``targetDistance`` to the obstacle.

    Specific inputs: ``targetDistance`` (m), optional ``windPressure`` and
    ``iceThickness``.

    Raises:
        SolverError: If the balance solver fails for a trial temperature
            (``ConvergenceError``, ``SuspectedChainReversal``).
        EstimationNotConvergedError: If the target is not reachable within
            the bounds, or the distance is NaN at the bounds.

    Warns:
        BalanceEngineWarning: If the study has not been adjusted yet.
    """
    span_index = _engine_span_index(study, _index(inputs, "spanIndex"))
    obstacle_point = _obstacle_point(inputs, study)
    target_distance = _non_negative_float(inputs, "targetDistance")
    wind_pressure = _optional_float(inputs, "windPressure")
    ice_thickness = _ice_thickness_meters(inputs)
    return _solve(
        "Temperature",
        lambda kwargs: study.estimation_engine.estimate_temperature(
            span_index=span_index,
            obstacle_point=obstacle_point,
            target_distance=target_distance,
            wind_pressure=wind_pressure,
            ice_thickness=ice_thickness,
            tol=TEMPERATURE_SOLVABLE_TOLERANCE,
            **kwargs,
        ),
        _bounds(inputs),
        report_bound_side=True,
    )


def estimate_wind(inputs: dict, study: SectionStudy) -> dict:
    """Estimate the wind pressure (Pa) giving ``targetDistance`` to the obstacle.

    Specific inputs: ``targetDistance`` (m), optional ``temperature`` and
    ``iceThickness``.
    """
    span_index = _engine_span_index(study, _index(inputs, "spanIndex"))
    obstacle_point = _obstacle_point(inputs, study)
    target_distance = _non_negative_float(inputs, "targetDistance")
    new_temperature = _optional_float(inputs, "temperature")
    ice_thickness = _ice_thickness_meters(inputs)
    return _solve(
        "Wind",
        lambda kwargs: study.estimation_engine.estimate_wind(
            span_index=span_index,
            obstacle_point=obstacle_point,
            target_distance=target_distance,
            new_temperature=new_temperature,
            ice_thickness=ice_thickness,
            tol=WIND_SOLVABLE_TOLERANCE,
            **kwargs,
        ),
        _bounds(inputs),
    )


def estimate_minimum_distance_wind(inputs: dict, study: SectionStudy) -> dict:
    """Estimate the wind pressure (Pa) bringing the cable closest to the obstacle.

    Closest-point mode of mechaphlowers ``estimate_wind`` (no target
    distance): the 3D distance to the obstacle is minimized over the wind
    pressure ``bounds`` at the fixed ``temperature``. ``RobustEstimation``
    first reduces the bounds to the wind pressures the balance solver can
    solve, so a wind reversing the insulator chains at a
    bound does not fail the estimation. If the chains still reverse during
    the search (a wind between two scanned ones), the bounds are shrunk
    toward no wind and the search retried, up to ``WIND_REVERSAL_RETRIES``
    times.

    Specific inputs: ``temperature`` (°C), optional ``iceThickness``.

    Returns:
        ``value``: wind pressure (Pa) giving the minimum distance,
        ``distance``: that minimum oblique distance (m),
        ``iterations``: number of distance evaluations.

    Raises:
        EstimationNotConvergedError: If the minimum lies on a bound (possibly
            the solvable limit), or the distance is NaN at the bounds.
        SolverError: If the balance solver fails even without wind, or the
            chains still reverse after the retries.
    """
    span_index = _engine_span_index(study, _index(inputs, "spanIndex"))
    obstacle_point = _obstacle_point(inputs, study)
    new_temperature = _required_float(inputs, "temperature")
    ice_thickness = _ice_thickness_meters(inputs)
    robust_wind = RobustEstimation(
        variable="Wind",
        is_solvable=lambda wind: is_state_solvable(
            study,
            new_temperature=new_temperature,
            wind_pressure=wind,
            ice_thickness=ice_thickness,
            wind_direction=WIND_DIRECTION,
        ),
        tolerance=WIND_SOLVABLE_TOLERANCE,
        step=WIND_SOLVABLE_STEP,
        retries=WIND_REVERSAL_RETRIES,
        shrink=WIND_REVERSAL_SHRINK,
    )

    def solve(kwargs: dict) -> EstimationResult:
        return study.estimation_engine.estimate_wind(
            span_index=span_index,
            obstacle_point=obstacle_point,
            target_distance=None,
            new_temperature=new_temperature,
            ice_thickness=ice_thickness,
            wind_direction=WIND_DIRECTION,
            distance_type="distance_3d",
            tol=WIND_SOLVABLE_TOLERANCE,
            **kwargs,
        )

    result = robust_wind.run(
        lambda bounds: _solve("Wind", solve, bounds),
        _bounds(inputs) or DEFAULT_WIND_BOUNDS,
    )
    return {
        "value": result["value"],
        "distance": result["residual"],
        "iterations": result["iterations"],
    }


def estimate_load(inputs: dict, study: SectionStudy) -> dict:
    """Estimate the load mass (kg) on ``spanIndex`` giving ``targetDistance``.

    Specific inputs: ``targetDistance`` (m), ``loadPositionDistance`` (m from
    the left support of the span), optional ``temperature``, ``windPressure``
    and ``iceThickness``. Loads on other spans are kept.
    """
    span_index = _index(inputs, "spanIndex")
    obstacle_point = _obstacle_point(inputs, study)
    target_distance = _non_negative_float(inputs, "targetDistance")
    load_position_distance = _non_negative_float(
        inputs, "loadPositionDistance"
    )
    new_temperature = _optional_float(inputs, "temperature")
    wind_pressure = _optional_float(inputs, "windPressure")
    ice_thickness = _ice_thickness_meters(inputs)
    return _solve(
        "Load",
        lambda kwargs: study.estimation_engine.estimate_load(
            span_index=span_index,
            obstacle_point=obstacle_point,
            target_distance=target_distance,
            load_position_distance=load_position_distance,
            new_temperature=new_temperature,
            wind_pressure=wind_pressure,
            ice_thickness=ice_thickness,
            tol=LOAD_SOLVABLE_TOLERANCE,
            **kwargs,
        ),
        _bounds(inputs),
    )


def estimate_load_relative(inputs: dict, study: SectionStudy) -> dict:
    """Estimate the load mass (kg) on ``spanIndex`` giving an altitude change.

    No obstacle is involved: the cable altitude at ``loadPositionDistance`` is
    compared to its altitude before the load. A load lowers the cable, so
    ``targetDistance`` is usually negative.

    Specific inputs: ``targetDistance`` (m, signed altitude change of the
    cable at the load position), ``loadPositionDistance`` (m from the left
    support of the span), optional ``temperature``, ``windPressure`` and
    ``iceThickness``. Loads on other spans are kept.

    Returns:
        The usual estimation result, whose ``extra["x_shift"]`` is the shift
        (m) of the cable abscissa at the load point (initial minus final).
    """
    span_index = _index(inputs, "spanIndex")
    target_distance = _required_float(inputs, "targetDistance")
    load_position_distance = _non_negative_float(
        inputs, "loadPositionDistance"
    )
    new_temperature = _optional_float(inputs, "temperature")
    wind_pressure = _optional_float(inputs, "windPressure")
    ice_thickness = _ice_thickness_meters(inputs)
    return _solve(
        "Load",
        lambda kwargs: study.estimation_engine.estimate_load_relative(
            span_index=span_index,
            target_distance=target_distance,
            load_position_distance=load_position_distance,
            new_temperature=new_temperature,
            wind_pressure=wind_pressure,
            ice_thickness=ice_thickness,
            tol=LOAD_SOLVABLE_TOLERANCE,
            **kwargs,
        ),
        _bounds(inputs),
    )


def estimate_rope(inputs: dict, study: SectionStudy) -> dict:
    """Estimate the rope length (m) on ``supportIndex`` giving a vertical distance.

    Specific inputs: ``supportIndex`` (before manipulation),
    ``targetVerticalDistance`` (m, cable altitude minus obstacle altitude),
    optional ``ropeLineicMass`` (kg/m), ``temperature``, ``windPressure``
    and ``iceThickness``.
    """
    support_index = _index(inputs, "supportIndex")
    span_index = _index(inputs, "spanIndex")
    obstacle_point = _obstacle_point(inputs, study)
    target_vertical_distance = _required_float(
        inputs, "targetVerticalDistance"
    )
    rope_lineic_mass = _optional_float(inputs, "ropeLineicMass")
    if rope_lineic_mass is not None and rope_lineic_mass <= 0:
        raise EstimationInputError(
            _Errors.estimation_not_positive("ropeLineicMass", rope_lineic_mass)
        )
    new_temperature = _optional_float(inputs, "temperature")
    wind_pressure = _optional_float(inputs, "windPressure")
    ice_thickness = _ice_thickness_meters(inputs)
    return _solve(
        "Rope",
        lambda kwargs: study.estimation_engine.estimate_rope(
            support_index=support_index,
            span_index=span_index,
            obstacle_point=obstacle_point,
            target_vertical_distance=target_vertical_distance,
            rope_lineic_mass=rope_lineic_mass,
            new_temperature=new_temperature,
            wind_pressure=wind_pressure,
            ice_thickness=ice_thickness,
            tol=ROPE_SOLVABLE_TOLERANCE,
            **kwargs,
        ),
        _bounds(inputs),
    )
