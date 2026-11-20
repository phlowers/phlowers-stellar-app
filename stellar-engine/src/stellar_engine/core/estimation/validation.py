# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Input validation for the inverse estimations.

Each helper reads one camelCase input from the frontend dictionary and
raises ``EstimationInputError`` when it is missing or invalid.
"""

import math

import numpy as np
from mechaphlowers import SectionStudy

from stellar_engine.core.conformity.runner import find_obstacle_point
from stellar_engine.entities.errors import (
    EstimationInputError,
    _Errors,
)


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
