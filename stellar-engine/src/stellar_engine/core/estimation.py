# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Inverse estimations on a section study (rope, temperature, load, wind).

Each function reads camelCase inputs coming from the frontend, delegates to
``SectionStudy.estimation_engine`` (mechaphlowers ``EstimationEngine``) and
returns a JSON-serializable dictionary. The study is left untouched.
``estimate_minimum_distance_wind`` has no target distance: it minimizes the
distance to the obstacle over the wind pressure.

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
from typing import NamedTuple

import numpy as np
from mechaphlowers import SectionStudy, units
from mechaphlowers.core.numeric import EstimationResult
from mechaphlowers.entities.errors import (
    EstimateOnSplitSupportError,
    SolverError,
)

from stellar_engine.core.conformity.runner import find_obstacle_point
from stellar_engine.entities.errors import (
    EstimationInputError,
    EstimationNotConvergedError,
    _Errors,
)

logger = logging.getLogger("stellar_engine")

# Minimum distance wind: step (Pa) of the scan bracketing the minimum, then
# tolerance (Pa) and maximum iterations of its refinement.
MINIMUM_DISTANCE_WIND_STEP = 250.0
MINIMUM_DISTANCE_WIND_TOLERANCE = 0.5
MINIMUM_DISTANCE_WIND_MAX_ITERATIONS = 50
DEFAULT_MINIMUM_DISTANCE_WIND_BOUNDS = (-1000.0, 1000.0)
# Golden section ratio (3 - sqrt(5)) / 2 of Brent's minimization
_GOLDEN_SECTION = (3.0 - math.sqrt(5.0)) / 2.0


def _to_finite_float(value: object, key: str) -> float:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError) as error:
        raise EstimationInputError(
            _Errors.estimation_not_finite(key)
        ) from error
    if not math.isfinite(number):
        raise EstimationInputError(_Errors.estimation_not_finite(key))
    return number


def _required_float(inputs: dict, key: str) -> float:
    if inputs.get(key) is None:
        raise EstimationInputError(_Errors.estimation_missing_input(key))
    return _to_finite_float(inputs[key], key)


def _optional_float(inputs: dict, key: str) -> float | None:
    value = inputs.get(key)
    return None if value is None else _to_finite_float(value, key)


def _non_negative_float(inputs: dict, key: str) -> float:
    value = _required_float(inputs, key)
    if value < 0:
        raise EstimationInputError(
            _Errors.estimation_not_positive(key, value, allow_zero=True)
        )
    return value


def _index(inputs: dict, key: str) -> int:
    value = _required_float(inputs, key)
    if value != int(value) or value < 0:
        raise EstimationInputError(
            _Errors.estimation_invalid_index(key, value)
        )
    return int(value)


def _obstacle_point(inputs: dict, study: SectionStudy) -> np.ndarray:
    obstacle_uuid = inputs.get("obstacleUuid")
    if obstacle_uuid is not None:
        return find_obstacle_point(
            study, str(obstacle_uuid), _index(inputs, "pointIndex")
        )
    point = inputs.get("obstaclePoint")
    if point is None:
        raise EstimationInputError(
            _Errors.estimation_missing_input("obstaclePoint")
        )
    try:
        array = np.asarray(point, dtype=float)
    except (TypeError, ValueError) as error:
        raise EstimationInputError(
            _Errors.estimation_invalid_obstacle_point(point)
        ) from error
    if array.shape != (3,) or not np.all(np.isfinite(array)):
        raise EstimationInputError(
            _Errors.estimation_invalid_obstacle_point(point)
        )
    return array


def _bounds(inputs: dict) -> tuple[float, float] | None:
    bounds = inputs.get("bounds")
    if bounds is None:
        return None
    try:
        lower, upper = (float(bound) for bound in bounds)
    except (TypeError, ValueError) as error:
        raise EstimationInputError(
            _Errors.estimation_invalid_bounds(bounds)
        ) from error
    if not (math.isfinite(lower) and math.isfinite(upper) and lower < upper):
        raise EstimationInputError(_Errors.estimation_invalid_bounds(bounds))
    return lower, upper


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


def _solve(
    variable: str,
    solve: Callable[[dict], EstimationResult],
    bounds: tuple[float, float] | None,
) -> dict:
    """Run the estimation and convert mechaphlowers failures to Stellar errors.

    Raises:
        EstimationNotConvergedError: If the target is not reached, or if the
            objective is NaN at the bounds (plain ``ValueError``).
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
            **kwargs,
        ),
        _bounds(inputs),
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
            **kwargs,
        ),
        _bounds(inputs),
    )


class _WindScan(NamedTuple):
    """Distances computed by ``_scan_wind``, as ``(pressure, distance)``."""

    points: list[tuple[float, float]]
    # whether the scan stopped because the distance increased or at the bound
    complete: bool
    # balance solver failure that stopped the scan (None for a NaN distance)
    failure: SolverError | None
    # distance function of the scan, its engine copy holding the last state
    distance: Callable[[float], float]


def _scan_wind(
    distance: Callable[[float], float], start: float, stop: float
) -> _WindScan:
    """Distances every ``MINIMUM_DISTANCE_WIND_STEP`` Pa from start to stop.

    The scan stops at the first increasing distance (the minimum is then
    bracketed by the last three points), at ``stop``, or at the first
    pressure whose distance cannot be computed (e.g. the chains reverse).
    Small steps keep each balance solve close to the previous one.
    """
    span = abs(stop - start)
    direction = 1.0 if stop >= start else -1.0
    points: list[tuple[float, float]] = []
    for step in range(math.ceil(span / MINIMUM_DISTANCE_WIND_STEP) + 1):
        pressure = start + direction * min(
            step * MINIMUM_DISTANCE_WIND_STEP, span
        )
        try:
            value = distance(pressure)
        except SolverError as error:
            return _WindScan(points, False, error, distance)
        if not math.isfinite(value):
            return _WindScan(points, False, None, distance)
        points.append((pressure, value))
        if len(points) > 1 and value > points[-2][1]:
            break
    return _WindScan(points, True, None, distance)


def _scan_failure(scan: _WindScan) -> Exception:
    """Error explaining why the minimum distance cannot be reached."""
    if scan.failure is not None:
        return scan.failure
    if not scan.points:
        return EstimationNotConvergedError(
            _Errors.estimation_distance_not_computable("Wind")
        )
    return EstimationNotConvergedError(
        _Errors.estimation_minimum_not_reached("Wind", scan.points[-1][0])
    )


def _brent_minimum(
    distance: Callable[[float], float],
    lower: float,
    upper: float,
    best: tuple[float, float],
) -> tuple[float, float]:
    """Brent's minimization of ``distance`` on [lower, upper].

    ``best`` is an already computed ``(pressure, distance)`` inside the
    interval, lower than the distance at its ends. Parabolic interpolation
    steps are taken when they are reliable, golden section steps otherwise.

    Returns:
        The pressure of the minimum distance found, with that distance.
    """
    x = w = v = best[0]
    fx = fw = fv = best[1]
    step = previous_step = 0.0
    half_tolerance = MINIMUM_DISTANCE_WIND_TOLERANCE / 2.0
    for _ in range(MINIMUM_DISTANCE_WIND_MAX_ITERATIONS):
        middle = (lower + upper) / 2.0
        if (
            abs(x - middle)
            <= MINIMUM_DISTANCE_WIND_TOLERANCE - (upper - lower) / 2.0
        ):
            break
        parabolic = False
        if abs(previous_step) > half_tolerance:
            r = (x - w) * (fx - fv)
            q = (x - v) * (fx - fw)
            p = (x - v) * q - (x - w) * r
            q = 2.0 * (q - r)
            if q > 0.0:
                p = -p
            q = abs(q)
            if abs(p) < abs(0.5 * q * previous_step) and q * (
                lower - x
            ) < p < q * (upper - x):
                previous_step, step = step, p / q
                parabolic = True
                # never evaluate too close to the interval ends
                if (
                    x + step - lower < MINIMUM_DISTANCE_WIND_TOLERANCE
                    or upper - x - step < MINIMUM_DISTANCE_WIND_TOLERANCE
                ):
                    step = math.copysign(half_tolerance, middle - x)
        if not parabolic:
            previous_step = (lower - x) if x >= middle else (upper - x)
            step = _GOLDEN_SECTION * previous_step
        u = x + (
            step
            if abs(step) >= half_tolerance
            else math.copysign(half_tolerance, step)
        )
        fu = distance(u)
        if fu <= fx:
            if u >= x:
                lower = x
            else:
                upper = x
            v, w, x = w, x, u
            fv, fw, fx = fw, fx, fu
        else:
            if u < x:
                lower = u
            else:
                upper = u
            if fu <= fw or w == x:
                v, w = w, u
                fv, fw = fw, fu
            elif fu <= fv or v in (x, w):
                v, fv = u, fu
    return x, fx


def estimate_minimum_distance_wind(inputs: dict, study: SectionStudy) -> dict:
    """Estimate the wind pressure (Pa) bringing the cable closest to the obstacle.

    Unlike the other estimations there is no target distance: the 3D distance
    to the obstacle is minimized over the wind pressure ``bounds`` (default
    ``DEFAULT_MINIMUM_DISTANCE_WIND_BOUNDS``), at the fixed ``temperature``.
    The distance is assumed unimodal in the wind pressure: it is scanned
    every ``MINIMUM_DISTANCE_WIND_STEP`` Pa from 0 Pa (or the bound closest to
    it) in the decreasing direction until it increases, then the bracketed
    minimum is refined with Brent's method.

    Specific inputs: ``temperature`` (°C), optional ``iceThickness``.

    Returns:
        ``value``: wind pressure (Pa) giving the minimum distance,
        ``distance``: that minimum oblique distance (m),
        ``iterations``: number of distance evaluations.

    Raises:
        SolverError: If the balance solver fails at the starting pressure, or
            while the distance is still decreasing (``SuspectedChainReversal``
            when the chains reverse).
        EstimationNotConvergedError: In the same cases, when the distance is
            NaN instead.

    Warns:
        BalanceEngineWarning: If the study has not been adjusted yet.
    """
    span_index = _engine_span_index(study, _index(inputs, "spanIndex"))
    obstacle_point = _obstacle_point(inputs, study)
    fixed_conditions = {
        "new_temperature": _required_float(inputs, "temperature"),
        "ice_thickness": _ice_thickness_meters(inputs),
    }
    lower, upper = _bounds(inputs) or DEFAULT_MINIMUM_DISTANCE_WIND_BOUNDS
    start = min(max(0.0, lower), upper)
    evaluations = 0

    def new_distance() -> Callable[[float], float]:
        # A failed balance solve breaks every next solve of the engine copy:
        # each scan runs on its own copy. With a zero target, the
        # mechaphlowers objective is the distance itself.
        objective = (
            study.estimation_engine._build_distance_objective__climatic_case(
                span_index,
                obstacle_point,
                0.0,
                "wind_pressure",
                fixed_conditions,
            )
        )

        def distance(pressure: float) -> float:
            nonlocal evaluations
            evaluations += 1
            return float(objective(pressure))

        return distance

    up = _scan_wind(new_distance(), start, upper)
    if not up.points:
        raise _scan_failure(up)
    down = _WindScan(up.points[:1], True, None, up.distance)
    descends_up = len(up.points) > 1 and up.points[1][1] < up.points[0][1]
    if start > lower and not descends_up:
        down = _scan_wind(new_distance(), start, lower)
    # increasing pressures, the start point shared by both scans
    points = down.points[:0:-1] + up.points
    closest = min(range(len(points)), key=lambda index: points[index][1])
    # the distance still decreases where it stops being computable
    if closest == 0 and not down.complete:
        raise _scan_failure(down)
    if closest == len(points) - 1 and not up.complete:
        raise _scan_failure(up)

    best = points[closest]
    # an end point is a search bound: the distance decreases up to it
    if 0 < closest < len(points) - 1:
        scan = up if best[0] >= start else down
        try:
            refined = _brent_minimum(
                scan.distance if scan.complete else new_distance(),
                points[closest - 1][0],
                points[closest + 1][0],
                best,
            )
        except SolverError as error:
            logger.warning(
                "Wind refinement failed, scan result kept: %s", error
            )
        else:
            if refined[1] < best[1]:
                best = refined
    logger.debug(
        "Minimum distance wind: %s Pa, %s m (%s evaluations)",
        best[0],
        best[1],
        evaluations,
    )
    return {
        "value": float(best[0]),
        "distance": float(best[1]),
        "iterations": evaluations,
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
            **kwargs,
        ),
        _bounds(inputs),
    )
