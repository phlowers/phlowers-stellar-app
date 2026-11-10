# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import numpy as np
import pytest

from stellar_engine.core.conformity.ground import slice_ground
from stellar_engine.entities.errors import (
    ConformityInputError,
    SupportOutOfRangeError,
)


def _span_length(study, span_index=0):
    supports = study.position_engine.get_group_points().supports.coords[
        :, 0, :
    ]
    return float(
        np.linalg.norm(supports[span_index + 1, :2] - supports[span_index, :2])
    )


def test_slice_ground_interpolates_left_referenced_floor_points(solved_study):
    length = _span_length(solved_study)

    result = slice_ground(
        {
            "spanIndex": 0,
            "nPoints": 5,
            "referenceSupport": "LEFT",
            "floorPoints": [
                {"distance": 0, "altitude": 10},
                None,
                {"distance": length, "altitude": 18},
            ],
        },
        solved_study,
    )

    assert result["distances"] == pytest.approx(
        [0, length / 4, length / 2, 3 * length / 4, length]
    )
    assert result["altitudes"] == pytest.approx([10, 12, 14, 16, 18])
    assert result["length"] == pytest.approx(length)


def test_slice_ground_converts_right_referenced_floor_points(solved_study):
    length = _span_length(solved_study)

    result = slice_ground(
        {
            "spanIndex": 0,
            "nPoints": 3,
            "referenceSupport": "RIGHT",
            "floorPoints": [
                {"distance": 0, "altitude": 18},
                {"distance": length, "altitude": 10},
            ],
        },
        solved_study,
    )

    assert result["distances"] == pytest.approx([0, length / 2, length])
    assert result["altitudes"] == pytest.approx([10, 14, 18])


def test_slice_ground_falls_back_to_support_altitudes_when_floor_is_empty(
    solved_study,
):
    supports = solved_study.position_engine.get_group_points().supports.coords[
        :, 0, :
    ]

    result = slice_ground(
        {
            "spanIndex": 0,
            "nPoints": 5,
            "referenceSupport": "LEFT",
            "floorPoints": [],
        },
        solved_study,
    )

    assert result["altitudes"] == pytest.approx(
        np.linspace(supports[0, 2], supports[1, 2], 5)
    )


@pytest.mark.parametrize("n_points", [0, 1, 2.5, True])
def test_slice_ground_rejects_invalid_point_count(solved_study, n_points):
    with pytest.raises(ConformityInputError, match="nPoints"):
        slice_ground(
            {
                "spanIndex": 0,
                "nPoints": n_points,
                "referenceSupport": "LEFT",
                "floorPoints": [],
            },
            solved_study,
        )


def test_slice_ground_rejects_out_of_range_span(solved_study):
    with pytest.raises(SupportOutOfRangeError):
        slice_ground(
            {
                "spanIndex": 3,
                "nPoints": 5,
                "referenceSupport": "LEFT",
                "floorPoints": [],
            },
            solved_study,
        )
