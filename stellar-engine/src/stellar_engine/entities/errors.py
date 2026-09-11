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
        return (
            f"Cut strands count must be finite " f"at layer {layer_index + 1}"
        )

    @staticmethod
    def cut_strands_not_integer(layer_index: int) -> str:
        return (
            f"Cut strands count must be an integer "
            f"at layer {layer_index + 1}"
        )

    @staticmethod
    def cut_strands_negative(layer_index: int) -> str:
        return (
            f"Cut strands count cannot be negative "
            f"at layer {layer_index + 1}"
        )

    @staticmethod
    def cut_strands_exceeds_layer(
        layer_index: int, cut_count: int, layer_total: int
    ) -> str:
        return (
            f"Cut strands count ({cut_count}) exceeds "
            f"number of strands ({layer_total}) in layer {layer_index + 1}"
        )


class GeneratedPointsNoneError(ValueError):
    """Raised when generated points (spans, supports, insulators, others) are None."""


class SupportOutOfRangeError(ValueError):
    """Raised when a support index is out of range for the number of spans."""


class ObstacleNotFoundError(ValueError):
    """Raised when an obstacle with a given UUID is not found in the study."""


class NightTimeError(ValueError):
    """Raised when input time is night time but computation requires to be during day time."""
