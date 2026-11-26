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
    EstimationLoadPositionError,
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


def _load_position_in_span(
    inputs: dict, key: str, span_index: int, study: SectionStudy
) -> float:
    """Read a load position (m from the left support) strictly inside its span.

    mechaphlowers ignores a load at a support (0 or the span length) and then
    fails with an unclear error. An out of range ``span_index`` is left to
    mechaphlowers, which reports it.

    Raises:
        EstimationLoadPositionError: The position is not strictly between 0
            and the span length.
    """
    position = _non_negative_float(inputs, key)
    span_lengths = study._section_array.data["span_length"].to_numpy()
    if span_index >= len(span_lengths) - 1:
        return position
    span_length = float(span_lengths[span_index])
    if not 0 < position < span_length:
        raise EstimationLoadPositionError(
            _Errors.estimation_load_position_out_of_span(
                key, position, span_length
            )
        )
    return position


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
