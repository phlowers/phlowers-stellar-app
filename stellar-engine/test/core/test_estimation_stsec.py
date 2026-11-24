# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Estimations on a section imported from a ``.stsec`` file.

A target vertical distance of 1 m on the point 1 of the obstacle ``ppp`` needs
about 315 °C, beyond the 250 °C upper bound of the Conformity temperature
estimation: the error must tell on which side of the bounds the target lies.

Its chains weigh nothing: the 1000 kg bounds of the effort estimation (UI
``EFFORT_MAX_LOAD_MASS``) reverse them.
"""

from pathlib import Path

import numpy as np
import pytest
from mechaphlowers import SectionStudy
from mechaphlowers.core.models.estimation import (
    ComputeDistance,
)
from mechaphlowers.entities.errors import SuspectedChainReversal

from stellar_engine.core.conformity.runner import find_obstacle_point
from stellar_engine.core.estimation import estimation
from stellar_engine.core.estimation.robust import LoadSolvabilityProbe
from stellar_engine.core.study import initialize_study
from stellar_engine.entities.errors import (
    EstimationNotConvergedWarning,
    EstimationTargetAboveBoundsWarning,
    EstimationTargetBelowBoundsWarning,
)
from stellar_engine.utils import import_stsec, stsec_to_study_inputs

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures"
SECTION_FILE = FIXTURE / "estimation_obstacle.stsec"
OBSTACLE_NAME = "ppp"
SPAN_INDEX = 1
POINT_INDEX = 0  # "point 1" in the UI
TARGET_VERTICAL_DISTANCE = 1.0
# Search interval sent by the UI (CONFORMITY_TEMPERATURE_BOUNDS)
UI_BOUNDS = [-50.0, 250.0]
# Effort estimation: mass search intervals sent by the UI per direction (kg)
UP_BOUNDS = [-1000.0, 0.0]
DOWN_BOUNDS = [0.0, 1000.0]
EFFORT_TEMPERATURE = 15.0

# Fictive ASTER600 cable, in catalog units (the file only stores its name)
CABLE = {
    "id": None,
    "name": "ASTER600",
    "data_source": "fictive",
    "section": 600.4,
    "diameter": 31.86,
    "young_modulus": 60000,
    "linear_mass": 1.8,
    "dilatation_coefficient": 2.3e-05,
    "temperature_reference": 15,
    "stress_strain_a0": 0,
    "stress_strain_a1": 60000,
    "stress_strain_a2": 0,
    "stress_strain_a3": 0,
    "stress_strain_a4": 0,
    "stress_strain_b0": 0,
    "stress_strain_b1": 0,
    "stress_strain_b2": 0,
    "stress_strain_b3": 0,
    "stress_strain_b4": 0,
    "is_polynomial": False,
    "diameter_heart": 0,
    "section_conductor": 600.4,
    "section_heart": 0,
    "solar_absorption": 0.9,
    "emissivity": 0.8,
    "electric_resistance_20": 0.0554,
    "linear_resistance_temperature_coef": 0.0036,
    "radial_thermal_conductivity": 1,
    "has_magnetic_heart": False,
    "is_bimetallic": None,
    "rts_cable": 200000,
    "rts_layer_1": 3200,
    "nb_strand_layer_1": 24,
    "rts_layer_2": 3200,
    "nb_strand_layer_2": 18,
    "rts_layer_3": 3200,
    "nb_strand_layer_3": 12,
    "rts_layer_4": 3200,
    "nb_strand_layer_4": 6,
    "rts_layer_5": 3200,
    "nb_strand_layer_5": 1,
    "rts_layer_6": 0,
    "nb_strand_layer_6": 0,
    "rts_layer_7": 0,
    "nb_strand_layer_7": 0,
    "rts_layer_8": 0,
    "nb_strand_layer_8": 0,
    "safety_coefficient": 1.5,
}


@pytest.fixture(scope="module")
def study_and_obstacle_uuid() -> tuple[SectionStudy, str]:
    section_import = import_stsec(SECTION_FILE)
    study, _ = initialize_study(stsec_to_study_inputs(section_import, CABLE))
    obstacle = next(
        obstacle
        for obstacle in section_import.section["obstacles"]
        if obstacle["name"] == OBSTACLE_NAME
    )
    assert obstacle["supportIndex"] == SPAN_INDEX
    return study, obstacle["uuid"]


def estimate_inputs(obstacle_uuid: str, bounds: list[float]) -> dict:
    return {
        "spanIndex": SPAN_INDEX,
        "obstacleUuid": obstacle_uuid,
        "pointIndex": POINT_INDEX,
        "targetDistance": TARGET_VERTICAL_DISTANCE,
        "bounds": bounds,
    }


def vertical_distance_at(
    study: SectionStudy, obstacle_uuid: str, temperature: float
) -> float:
    """Vertical distance cable - obstacle when the cable is at ``temperature``."""
    reference = study.copy()
    reference.solve_change_state(
        new_temperature=temperature, wind_direction="anticlockwise"
    )
    point = find_obstacle_point(study, obstacle_uuid, POINT_INDEX)
    return ComputeDistance("vertical").select_distance(
        reference.position_engine.point_distance(SPAN_INDEX, np.array(point))
    )


def test_one_meter_needs_more_than_the_upper_bound(
    study_and_obstacle_uuid: tuple[SectionStudy, str],
):
    """The 1 m target is reached above 250 °C: the warning says so."""
    study, obstacle_uuid = study_and_obstacle_uuid

    with pytest.warns(
        EstimationTargetAboveBoundsWarning, match="above the upper bound 250.0"
    ):
        result = estimation.estimate_temperature(
            estimate_inputs(obstacle_uuid, UI_BOUNDS), study
        )

    assert result["converged"] is False
    assert result["value"] == pytest.approx(UI_BOUNDS[1])


def test_target_above_the_cable_needs_less_than_the_lower_bound(
    study_and_obstacle_uuid: tuple[SectionStudy, str],
):
    study, obstacle_uuid = study_and_obstacle_uuid

    with pytest.warns(
        EstimationTargetBelowBoundsWarning, match="below the lower bound -50.0"
    ):
        result = estimation.estimate_temperature(
            {
                **estimate_inputs(obstacle_uuid, UI_BOUNDS),
                "targetDistance": 20,
            },
            study,
        )

    assert result["converged"] is False
    assert result["value"] == pytest.approx(UI_BOUNDS[0])


def test_target_is_beyond_the_upper_bound(
    study_and_obstacle_uuid: tuple[SectionStudy, str],
):
    """Root cause: even at the upper bound the cable stays above 1 m."""
    study, obstacle_uuid = study_and_obstacle_uuid

    assert (
        vertical_distance_at(study, obstacle_uuid, UI_BOUNDS[1])
        > TARGET_VERTICAL_DISTANCE
    )
    result = estimation.estimate_temperature(
        estimate_inputs(obstacle_uuid, [UI_BOUNDS[0], 400.0]), study
    )
    assert result["converged"] is True
    assert result["value"] > UI_BOUNDS[1]
    assert vertical_distance_at(
        study, obstacle_uuid, result["value"]
    ) == pytest.approx(TARGET_VERTICAL_DISTANCE, abs=0.01)


def test_minimum_distance_wind_with_chains_reversing_at_the_bounds(
    study_and_obstacle_uuid: tuple[SectionStudy, str],
):
    """The UI bounds (±1000 Pa) reverse the chains at 25 °C: still solvable."""
    study, obstacle_uuid = study_and_obstacle_uuid
    for pressure in (-1000.0, 1000.0):
        with pytest.raises(SuspectedChainReversal):
            study.copy().solve_change_state(
                new_temperature=25.0, wind_pressure=pressure
            )

    result = estimation.estimate_minimum_distance_wind(
        {
            "spanIndex": SPAN_INDEX,
            "obstacleUuid": obstacle_uuid,
            "pointIndex": POINT_INDEX,
            "temperature": 25.0,
            "bounds": [-1000.0, 1000.0],
        },
        study,
    )

    assert -1000.0 < result["value"] < 1000.0
    assert result["distance"] > 0


def load_relative_inputs(
    span_index: int, position: float, target: float, bounds: list[float]
) -> dict:
    return {
        "spanIndex": span_index,
        "loadPositionDistance": position,
        "targetDistance": target,
        "temperature": EFFORT_TEMPERATURE,
        "bounds": bounds,
    }


@pytest.mark.parametrize(
    ("span_index", "position", "target", "bounds"),
    [(1, 300.0, 1.0, UP_BOUNDS), (0, 250.0, -1.0, DOWN_BOUNDS)],
    ids=["up", "down"],
)
def test_load_relative_with_chains_reversing_at_the_bound(
    study_and_obstacle_uuid: tuple[SectionStudy, str],
    span_index: int,
    position: float,
    target: float,
    bounds: list[float],
):
    """The mass search starts from no load: the reversing bound is not tried."""
    study, _ = study_and_obstacle_uuid
    far_bound = bounds[0] if target > 0 else bounds[1]
    probe = LoadSolvabilityProbe(
        study,
        span_index,
        position,
        target,
        {"new_temperature": EFFORT_TEMPERATURE},
    )
    assert probe(far_bound) is False

    result = estimation.estimate_load_relative(
        load_relative_inputs(span_index, position, target, bounds), study
    )

    assert result["converged"] is True
    assert bounds[0] < result["value"] < bounds[1]
    assert result["residual"] == pytest.approx(0.0, abs=0.01)


def test_load_relative_beyond_the_solvable_masses_stops_at_their_limit(
    study_and_obstacle_uuid: tuple[SectionStudy, str],
):
    study, _ = study_and_obstacle_uuid

    with pytest.warns(EstimationNotConvergedWarning):
        result = estimation.estimate_load_relative(
            load_relative_inputs(0, 250.0, 100.0, UP_BOUNDS), study
        )

    assert result["converged"] is False
    assert UP_BOUNDS[0] < result["value"] < UP_BOUNDS[1]
