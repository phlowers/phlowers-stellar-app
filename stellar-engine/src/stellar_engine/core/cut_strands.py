# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Cut strands handling for the cable tensile-strength model."""

import logging

import numpy as np
from mechaphlowers import SectionStudy

from stellar_engine.entities.errors import _Errors

logger = logging.getLogger("stellar_engine")


def set_cut_strands(study: SectionStudy, cut_strands: list[float]) -> dict:
    """Set the number of cut strands per layer on the study cable.

    Args:
        study: The current section study.
        cut_strands: Number of cut strands for each layer.

    Returns:
        A dictionary indicating success.

    Raises:
        ValueError: If the input list length does not match the number of layers
            or if any layer count is negative or exceeds the available strands.
    """
    logger.debug("Setting cut strands: %s", cut_strands)

    nb_strands_per_layer = study.balance_engine.cable_array.nb_strand_per_layer
    if len(cut_strands) != len(nb_strands_per_layer):
        raise ValueError(
            _Errors.cut_strands_layer_count_mismatch(
                len(cut_strands), len(nb_strands_per_layer)
            )
        )

    for layer_index, cut_count in enumerate(cut_strands):
        if not np.isfinite(cut_count):
            raise ValueError(_Errors.cut_strands_not_finite(layer_index))
        if cut_count != int(cut_count):
            raise ValueError(_Errors.cut_strands_not_integer(layer_index))

    int_cut_strands = [int(c) for c in cut_strands]

    for layer_index, (cut_count, layer_total) in enumerate(
        zip(int_cut_strands, nb_strands_per_layer)
    ):
        if cut_count < 0:
            raise ValueError(_Errors.cut_strands_negative(layer_index))
        if cut_count > layer_total:
            raise ValueError(
                _Errors.cut_strands_exceeds_layer(
                    layer_index, cut_count, layer_total
                )
            )

    study.balance_engine.cable_array.cut_strands = np.array(
        int_cut_strands, dtype=int
    )
    return {"success": True}


def get_cut_strands(study: SectionStudy) -> dict[str, list[int]]:
    """Return the current number of cut strands per layer.

    Args:
        study: The current section study.

    Returns:
        A dictionary with the cut strands list under the ``cutStrands`` key.
    """
    return {
        "cutStrands": study.balance_engine.cable_array.cut_strands.tolist()
    }


def get_rrts(study: SectionStudy) -> dict:
    """Return the residual rated tensile strength of the cable.

    Args:
        study: The current section study.

    Returns:
        A dictionary with the residual RTS under the ``rrts`` key.
    """
    return {"rrts": study.balance_engine.cable_array.rrts}


def get_utilization_rate(study: SectionStudy) -> dict:
    """Return the cable utilization rate per span.

    Uses the maximum tension at each span from the balance engine span model.

    Args:
        study: The current section study.

    Returns:
        A dictionary with the utilization rate list under the
        ``utilizationRate`` key.
    """
    tension_max, _ = study.balance_engine.span_model.tensions_sup_inf()
    utilization_rate = study.balance_engine.cable_array.utilization_rate(
        tension_max
    )
    return {"utilizationRate": utilization_rate.tolist()}


def set_high_safety(study: SectionStudy, high_safety: bool) -> dict:
    """Set the high-safety flag on the cable tensile-strength model.

    Args:
        study: The current section study.
        high_safety: Value to assign to the high-safety flag.

    Returns:
        A dictionary indicating success.
    """
    study.balance_engine.cable_array.high_safety = high_safety
    return {"success": True}
