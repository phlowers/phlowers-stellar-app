# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Estimation use cases on a section with an obstacle.

A target vertical distance of 1 m on the point 1 of the obstacle ``ppp`` needs
about 315 °C, beyond the 250 °C upper bound of the Conformity temperature
estimation: the error must tell on which side of the bounds the target lies.
"""

import numpy as np
import pytest
from mechaphlowers import SectionArray, SectionStudy, sample_cable_catalog
from mechaphlowers.entities.errors import SuspectedChainReversal

from stellar_engine.core.conformity.runner import find_obstacle_point
from stellar_engine.core.estimation import estimation
from stellar_engine.core.section import generate_section_array
from stellar_engine.entities.errors import (
    EstimationTargetAboveBoundsWarning,
    EstimationTargetBelowBoundsWarning,
)
from stellar_engine.entities.inputs import Support
from stellar_engine.plot.obstacles import add_bulk_obstacles

CABLE_NAME = "ASTER600"
OBSTACLE_NAME = "ppp"
OBSTACLE_UUID = "d6b76259-cc02-4456-80b0-448d4762f3b2"
SPAN_INDEX = 1
POINT_INDEX = 0  # "point 1" in the UI
TARGET_VERTICAL_DISTANCE = 1.0
# Search interval sent by the UI (CONFORMITY_TEMPERATURE_BOUNDS)
UI_BOUNDS = [-50.0, 250.0]
# Initial condition "IC 1 (Copy 1)": base parameters at 50 °C
SAGGING_PARAMETER = 1000
SAGGING_TEMPERATURE = 50

SUPPORTS = [
    Support(
        uuid="0bf38433-6b68-4cf7-ae18-9766db2967ed",
        spanLength=500,
        spanAngle=-20,
        attachmentHeight=500,
        armLength=35,
        chainLength=3,
        chainWeight=0,
        chainV=False,
        counterWeight=0,
        supportFootAltitude=470,
    ),
    Support(
        uuid="51130a9f-ef53-4359-86fc-ee4f258edf9c",
        spanLength=500,
        spanAngle=-35,
        attachmentHeight=450,
        armLength=10,
        chainLength=3,
        chainWeight=0,
        chainV=False,
        counterWeight=0,
        supportFootAltitude=420,
    ),
    Support(
        uuid="e1dc90ba-995c-40ed-8db8-5d0b04f92bd7",
        spanLength=None,
        spanAngle=45,
        attachmentHeight=560,
        armLength=-15,
        chainLength=3,
        chainWeight=0,
        chainV=False,
        counterWeight=0,
        supportFootAltitude=530,
    ),
]

OBSTACLE = {
    "uuid": OBSTACLE_UUID,
    "supportUuid": "51130a9f-ef53-4359-86fc-ee4f258edf9c",
    "supportIndex": SPAN_INDEX,
    "name": OBSTACLE_NAME,
    "type": "accessible_building",
    "altitudeType": "absolute",
    "lateralDistanceType": "SPAN_AXIS",
    "referenceSupport": "LEFT",
    "positions": [
        {"x": 121.2, "y": -6.1, "z": 446.7},
        {"x": 50, "y": -4.1, "z": 417},
        {"x": 19.5, "y": -5.5, "z": 449},
    ],
}


@pytest.fixture(scope="module")
def study_with_obstacle() -> SectionStudy:
    section_array = SectionArray(
        generate_section_array(SUPPORTS),
        sagging_parameter=SAGGING_PARAMETER,
        sagging_temperature=SAGGING_TEMPERATURE,
        bundle_number=1,
    )
    section_array.angle_direction = "clockwise"
    study = SectionStudy(
        cable_array=sample_cable_catalog.get_as_object([CABLE_NAME]),
        section_array=section_array,
    )
    study.solve_adjustment()
    study.solve_change_state()
    add_bulk_obstacles(inputs={"obstacles": [OBSTACLE]}, study=study)
    return study


def estimate_inputs(bounds: list[float]) -> dict:
    return {
        "spanIndex": SPAN_INDEX,
        "obstacleUuid": OBSTACLE_UUID,
        "pointIndex": POINT_INDEX,
        "targetDistance": TARGET_VERTICAL_DISTANCE,
        "bounds": bounds,
    }


def vertical_distance_at(study: SectionStudy, temperature: float) -> float:
    """Vertical distance cable - obstacle when the cable is at ``temperature``."""
    reference = study.copy()
    reference.solve_change_state(
        new_temperature=temperature, wind_direction="anticlockwise"
    )
    point = find_obstacle_point(study, OBSTACLE_UUID, POINT_INDEX)
    result = reference.position_engine.point_distance(
        SPAN_INDEX, np.array(point)
    )
    return result.point_target[2] - result.point_base[2]


def test_one_meter_needs_more_than_the_upper_bound(
    study_with_obstacle: SectionStudy,
):
    """The 1 m target is reached above 250 °C: the warning says so."""
    with pytest.warns(
        EstimationTargetAboveBoundsWarning, match="above the upper bound 250.0"
    ):
        result = estimation.estimate_temperature(
            estimate_inputs(UI_BOUNDS), study_with_obstacle
        )

    assert result["converged"] is False
    assert result["value"] == pytest.approx(UI_BOUNDS[1])


def test_target_above_the_cable_needs_less_than_the_lower_bound(
    study_with_obstacle: SectionStudy,
):
    with pytest.warns(
        EstimationTargetBelowBoundsWarning, match="below the lower bound -50.0"
    ):
        result = estimation.estimate_temperature(
            {**estimate_inputs(UI_BOUNDS), "targetDistance": 20},
            study_with_obstacle,
        )

    assert result["converged"] is False
    assert result["value"] == pytest.approx(UI_BOUNDS[0])


def test_target_is_beyond_the_upper_bound(study_with_obstacle: SectionStudy):
    """Root cause: even at the upper bound the cable stays above 1 m."""
    assert (
        vertical_distance_at(study_with_obstacle, UI_BOUNDS[1])
        > TARGET_VERTICAL_DISTANCE
    )
    result = estimation.estimate_temperature(
        estimate_inputs([UI_BOUNDS[0], 400.0]), study_with_obstacle
    )
    assert result["converged"] is True
    assert result["value"] > UI_BOUNDS[1]
    assert vertical_distance_at(
        study_with_obstacle, result["value"]
    ) == pytest.approx(TARGET_VERTICAL_DISTANCE, abs=0.01)


def test_minimum_distance_wind_with_chains_reversing_at_the_bounds(
    study_with_obstacle: SectionStudy,
):
    """The UI bounds (±1000 Pa) reverse the chains at 25 °C: still solvable."""
    for pressure in (-1000.0, 1000.0):
        with pytest.raises(SuspectedChainReversal):
            study_with_obstacle.copy().solve_change_state(
                new_temperature=25.0, wind_pressure=pressure
            )

    result = estimation.estimate_minimum_distance_wind(
        {
            "spanIndex": SPAN_INDEX,
            "obstacleUuid": OBSTACLE_UUID,
            "pointIndex": POINT_INDEX,
            "temperature": 25.0,
            "bounds": [-1000.0, 1000.0],
        },
        study_with_obstacle,
    )

    assert -1000.0 < result["value"] < 1000.0
    assert result["distance"] > 0
