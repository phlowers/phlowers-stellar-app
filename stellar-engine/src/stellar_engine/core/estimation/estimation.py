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
    EstimationLoadPositionError: ``loadPositionDistance`` is not strictly
        inside its span (mechaphlowers ignores a load at a support).
    ObstacleNotFoundError: ``obstacleUuid`` is not registered in the study.
    ConformityInputError: ``pointIndex`` is out of the obstacle points (not
        reachable from the UI).
    EstimationNotConvergedError: The distance to the obstacle cannot be
        computed at the search bounds (no result).
    InvalidManipulationIndex: ``spanIndex`` or ``supportIndex`` is out of
        range (mechaphlowers).
    EstimateOnSplitSupportError: ``spanIndex`` is split by a virtual
        support (mechaphlowers).
    SolverError: The balance solver fails for a trial value; its subclasses
        (``ConvergenceError``, ``SuspectedChainReversal``) are forwarded
        unchanged so the frontend shows the most specific message
        (mechaphlowers).

Warns (forwarded to the frontend through the captured Python warnings):
    EstimationNotConvergedWarning: The target is not reachable within bounds:
        the result is still returned, with ``converged`` false, and holds the
        closest value found.
    EstimationTargetAboveBoundsWarning: ``EstimationNotConvergedWarning``
        subclass warned by ``estimate_temperature`` (when ``bounds`` is
        given) if the search stopped at the upper bound: the target needs a
        larger value.
    EstimationTargetBelowBoundsWarning: Same, at the lower bound: the target
        needs a smaller value.
    BalanceEngineWarning: The study had not been adjusted yet; mechaphlowers
        then runs the adjustment on its internal copy (mechaphlowers).
"""

import logging
import math
import warnings
from collections.abc import Callable
from typing import Literal

from mechaphlowers import SectionStudy, units
from mechaphlowers.core.numeric import EstimationResult
from mechaphlowers.entities.errors import (
    EstimateOnSplitSupportError,
)

from stellar_engine.core.estimation.robust import (
    LoadSolvabilityProbe,
    RobustEstimation,
    is_state_solvable,
)
from stellar_engine.core.estimation.validation import (
    _bounds,
    _index,
    _load_position_in_span,
    _non_negative_float,
    _obstacle_point,
    _optional_float,
    _required_float,
)
from stellar_engine.entities.errors import (
    EstimationInputError,
    EstimationNotConvergedError,
    EstimationNotConvergedWarning,
    EstimationTargetAboveBoundsWarning,
    EstimationTargetBelowBoundsWarning,
    _Errors,
)

logger = logging.getLogger("stellar_engine")

# Wind direction used by the mechaphlowers estimations: our default
WIND_DIRECTION: Literal["clockwise", "anticlockwise"] = "clockwise"
# Our default wind pressure search interval for mechaphlowers (Pa)
DEFAULT_WIND_BOUNDS = (-500.0, 500.0)
# mechaphlowers default load mass search interval of estimate_load_relative
DEFAULT_LOAD_RELATIVE_BOUNDS = (0.0, 2000.0)
# mechaphlowers placeholder mass (kg) for no load: a zero mass drops the load
# point, so the altitude is then read elsewhere on the span
NO_LOAD_MASS = 0.01

# ------ Robust estimation parameters ------
# Step (Pa) of the outward scan looking for the first unsolvable wind
WIND_SOLVABLE_STEP = 50.0
# Retries of the closest-point search after a chain reversal
WIND_REVERSAL_RETRIES = 3
# Fraction of each bound (from the reference wind) kept on each retry
WIND_REVERSAL_SHRINK = 0.75
# Step (kg) of the outward scan looking for the first unsolvable load mass
LOAD_SOLVABLE_STEP = 250.0
# Retries of the relatie load search after a chain reversal
LOAD_REVERSAL_RETRIES = 3
# Fraction of each bound (from no load) kept on each retry
LOAD_REVERSAL_SHRINK = 0.75

# ------ Tolerances ------
# Precision (Pa) of the limit of the solvable wind pressures
WIND_SOLVABLE_TOLERANCE = 5.0
# Tolerance for the solvable temperature (degC)
TEMPERATURE_SOLVABLE_TOLERANCE = 1.0
# Tolerance for the solvable rope (m)
ROPE_SOLVABLE_TOLERANCE = 0.1
# Tolerance for the load (kg)
LOAD_SOLVABLE_TOLERANCE = 1.0
# Precision (kg) of the limit of the solvable load masses
LOAD_LIMIT_TOLERANCE = 10.0


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


def _warn_not_converged(
    variable: str,
    value: float,
    bounds: tuple[float, float] | None,
    report_bound_side: bool,
) -> None:
    """Warn that the target was not reached, on which side if known.

    mechaphlowers returns the bound closest to the target when the objective
    does not change sign over the bounds: with ``report_bound_side``, the
    warning then tells on which side of the bounds the target lies.
    """
    if report_bound_side and bounds is not None:
        lower, upper = bounds
        if math.isclose(value, upper):
            warnings.warn(
                _Errors.estimation_target_beyond_bound(
                    variable, "upper", upper
                ),
                EstimationTargetAboveBoundsWarning,
                stacklevel=2,
            )
            return
        if math.isclose(value, lower):
            warnings.warn(
                _Errors.estimation_target_beyond_bound(
                    variable, "lower", lower
                ),
                EstimationTargetBelowBoundsWarning,
                stacklevel=2,
            )
            return
    warnings.warn(
        _Errors.estimation_not_converged(variable, value, bounds or "default"),
        EstimationNotConvergedWarning,
        stacklevel=2,
    )


def _without_zero_mass(bounds: tuple[float, float]) -> tuple[float, float]:
    """Replace a zero mass bound by ``NO_LOAD_MASS`` inside the bounds."""
    lower, upper = bounds
    if upper == 0:
        upper = -NO_LOAD_MASS
    if lower == 0:
        lower = NO_LOAD_MASS
    return lower, upper


def _solve(
    variable: str,
    solve: Callable[[dict], EstimationResult],
    bounds: tuple[float, float] | None,
    report_bound_side: bool = False,
) -> dict:
    """Run the estimation and convert mechaphlowers failures to Stellar errors.

    A result that did not converge is returned with ``converged`` false and a
    warning: ``EstimationNotConvergedWarning``, or one of its subclasses
    telling on which side of the bounds the target lies, when
    ``report_bound_side`` is set and the search stopped at a bound. Only valid
    for a distance that varies monotonically with the estimated variable (the
    temperature).

    Raises:
        EstimationNotConvergedError: If the objective is NaN at the bounds
            (plain ``ValueError``).
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
        _warn_not_converged(variable, result.value, bounds, report_bound_side)
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
        EstimationNotConvergedError: If the distance is NaN at the bounds.

    Warns:
        EstimationNotConvergedWarning: If the target is not reachable within
            the bounds (or one of its bound-side subclasses).
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
        EstimationNotConvergedError: If the distance is NaN at the bounds.
        SolverError: If the balance solver fails even without wind, or the
            chains still reverse after the retries.

    Warns:
        EstimationNotConvergedWarning: If the minimum lies on a bound
            (possibly the solvable limit): the bound is returned.
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
    support of the span, strictly between 0 and the span length), optional ``temperature``, ``windPressure`` and
    ``iceThickness``. Loads on other spans are kept.

    ``RobustEstimation`` first reduces the mass ``bounds`` to the masses the
    balance solver can solve, scanning outward from no load: a large mass
    (traction especially) reverses the insulator chains, and the search
    evaluates both bounds first. The scan stops on the first mass moving the
    cable by at least ``targetDistance``. If the chains still reverse during the
    search, the bounds are shrunk toward no load and the search retried, up
    to ``LOAD_REVERSAL_RETRIES`` times.

    Returns:
        The usual estimation result, whose ``extra["x_shift"]`` is the shift
        (m) of the cable abscissa at the load point (initial minus final),
        plus ``effort``: the same load as ``value`` in daN (negative for a
        traction, positive for a weight).
    """
    span_index = _index(inputs, "spanIndex")
    target_distance = _required_float(inputs, "targetDistance")
    load_position_distance = _load_position_in_span(
        inputs, "loadPositionDistance", span_index, study
    )
    new_temperature = _optional_float(inputs, "temperature")
    wind_pressure = _optional_float(inputs, "windPressure")
    ice_thickness = _ice_thickness_meters(inputs)
    fixed_conditions = {
        "new_temperature": new_temperature,
        "wind_pressure": wind_pressure,
        "ice_thickness": ice_thickness,
    }
    probe = LoadSolvabilityProbe(
        study,
        span_index,
        load_position_distance,
        target_distance,
        fixed_conditions,
    )
    robust_load = RobustEstimation(
        variable="Load",
        is_solvable=probe,
        tolerance=LOAD_LIMIT_TOLERANCE,
        step=LOAD_SOLVABLE_STEP,
        retries=LOAD_REVERSAL_RETRIES,
        shrink=LOAD_REVERSAL_SHRINK,
        brackets=probe.brackets,
    )

    def solve(kwargs: dict) -> EstimationResult:
        return study.estimation_engine.estimate_load_relative(
            span_index=span_index,
            target_distance=target_distance,
            load_position_distance=load_position_distance,
            tol=LOAD_SOLVABLE_TOLERANCE,
            **fixed_conditions,
            **kwargs,
        )

    result = robust_load.run(
        lambda solvable_bounds: _solve("Load", solve, solvable_bounds),
        _without_zero_mass(_bounds(inputs) or DEFAULT_LOAD_RELATIVE_BOUNDS),
    )
    return {
        **result,
        "effort": float(units(result["value"], "kg").to("daN").magnitude),
    }


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
