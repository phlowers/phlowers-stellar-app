# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


class _Errors:
    NO_INITIAL_CONDITIONS = "No initial conditions provided"
    NO_INITIAL_CONDITION_SELECTED = "No initial condition selected"
    NO_SUPPORTS = "No supports data provided"

    @staticmethod
    def unsupported_symmetry_type(symmetry_type: str) -> str:
        return f"Unsupported symmetryType: {symmetry_type}. Expected 'dis_symmetric' or 'symmetric'"

    @staticmethod
    def cut_strands_layer_count_mismatch(
        input_count: int, layer_count: int
    ) -> str:
        return (
            f"Cut strands input has {input_count} layers, "
            f"but cable has {layer_count} layers"
        )

    @staticmethod
    def cut_strands_not_finite(layer_index: int) -> str:
        return f"Cut strands count must be finite at layer {layer_index + 1}"

    @staticmethod
    def cut_strands_not_integer(layer_index: int) -> str:
        return (
            f"Cut strands count must be an integer at layer {layer_index + 1}"
        )

    @staticmethod
    def cut_strands_negative(layer_index: int) -> str:
        return (
            f"Cut strands count cannot be negative at layer {layer_index + 1}"
        )

    @staticmethod
    def cut_strands_exceeds_layer(
        layer_index: int, cut_count: int, layer_total: int
    ) -> str:
        return (
            f"Cut strands count ({cut_count}) exceeds "
            f"number of strands ({layer_total}) in layer {layer_index + 1}"
        )

    @staticmethod
    def estimation_missing_input(key: str) -> str:
        return f"Missing estimation input: {key}"

    @staticmethod
    def estimation_not_finite(key: str) -> str:
        return f"Estimation input {key} must be a finite number"

    @staticmethod
    def estimation_invalid_index(key: str, value: float) -> str:
        return f"Estimation input {key} must be a non-negative integer, got {value}"

    @staticmethod
    def estimation_negative(key: str, value: float) -> str:
        return f"Estimation input {key} must be positive or zero, got {value}"

    @staticmethod
    def estimation_not_positive(key: str, value: float) -> str:
        return f"Estimation input {key} must be strictly positive, got {value}"

    @staticmethod
    def estimation_invalid_obstacle_point(point: object) -> str:
        return (
            f"Estimation input obstaclePoint must contain 3 finite "
            f"coordinates [x, y, z], got {point}"
        )

    @staticmethod
    def estimation_invalid_bounds(bounds: object) -> str:
        return (
            f"Estimation input bounds must be [lower, upper] with finite "
            f"values and lower < upper, got {bounds}"
        )

    @staticmethod
    def estimation_not_converged(
        variable: str, value: float, bounds: object
    ) -> str:
        return (
            f"{variable} estimation did not converge within bounds "
            f"{bounds} (last value: {value}): target is not reachable"
        )

    @staticmethod
    def estimation_distance_not_computable(variable: str) -> str:
        return (
            f"{variable} estimation failed: distance to the obstacle "
            "cannot be computed at the search bounds"
        )

    @staticmethod
    def estimation_minimum_not_reached(variable: str, value: float) -> str:
        return (
            f"{variable} estimation did not converge: the distance to the "
            f"obstacle cannot be computed beyond {value}, before reaching "
            "its minimum"
        )


class GeneratedPointsNoneError(ValueError):
    """Raised when generated points (spans, supports, insulators, others) are None."""


class SupportOutOfRangeError(ValueError):
    """Raised when a support index is out of range for the number of spans."""


class ObstacleNotFoundError(ValueError):
    """Raised when an obstacle with a given UUID is not found in the study."""


class NightTimeError(ValueError):
    """Raised when input time is night time but computation requires to be during day time."""


class ConformityInputError(ValueError):
    """Raised when a conformity input is missing or invalid."""


class SelectorInputError(ValueError):
    """Raised when a invalid value comes out of a selector."""


class EstimationInputError(ValueError):
    """Raised when an estimation input is missing or invalid."""


class EstimationNotConvergedError(ValueError):
    """Raised when an estimation cannot reach the target within its bounds."""
