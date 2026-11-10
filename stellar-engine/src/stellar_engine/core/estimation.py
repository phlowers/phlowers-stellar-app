# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Inverse estimations on a section study (rope, temperature, load, wind).

Each function reads camelCase inputs coming from the frontend, delegates to
``SectionStudy.estimation_engine`` (mechaphlowers ``EstimationEngine``) and
returns a JSON-serializable dictionary. The study is left untouched.

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

Raises (each class name is a ``PythonErrorCode`` on the frontend side):
    EstimationInputError: An input is missing or invalid.
    ObstacleNotFoundError: ``obstacleUuid`` is not registered in the study.
    ConformityInputError: ``pointIndex`` is out of the obstacle points.
    EstimationNotConvergedError: The target is not reachable within bounds.
    InvalidManipulationIndex: ``spanIndex`` or ``supportIndex`` is out of
        range (mechaphlowers).
    EstimateOnSplitSupportError: ``spanIndex`` is split by a virtual
        support (mechaphlowers).
"""

import logging
import math
from collections.abc import Callable

import numpy as np
from mechaphlowers import SectionStudy, units
from mechaphlowers.core.numeric import EstimationResult
from mechaphlowers.entities.errors import EstimateOnSplitSupportError

from stellar_engine.core.conformity.runner import find_obstacle_point
from stellar_engine.entities.errors import (
    EstimationInputError,
    EstimationNotConvergedError,
    _Errors,
)

logger = logging.getLogger("stellar_engine")


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


def _positive_float(inputs: dict, key: str) -> float:
    value = _required_float(inputs, key)
    if value <= 0:
        raise EstimationInputError(_Errors.estimation_not_positive(key, value))
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
    """Run the estimation and convert mechaphlowers failures to Stellar errors."""
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
    """
    span_index = _engine_span_index(study, _index(inputs, "spanIndex"))
    obstacle_point = _obstacle_point(inputs, study)
    target_distance = _positive_float(inputs, "targetDistance")
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
    target_distance = _positive_float(inputs, "targetDistance")
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


def estimate_load(inputs: dict, study: SectionStudy) -> dict:
    """Estimate the load mass (kg) on ``spanIndex`` giving ``targetDistance``.

    Specific inputs: ``targetDistance`` (m), ``loadPositionDistance`` (m from
    the left support of the span), optional ``temperature``, ``windPressure``
    and ``iceThickness``. Loads on other spans are kept.
    """
    span_index = _index(inputs, "spanIndex")
    obstacle_point = _obstacle_point(inputs, study)
    target_distance = _positive_float(inputs, "targetDistance")
    load_position_distance = _positive_float(inputs, "loadPositionDistance")
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
