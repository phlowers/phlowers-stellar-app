# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import numpy as np
import pandas as pd
import pytest
from mechaphlowers import CableArray, SectionArray, SectionStudy
from mechaphlowers.entities.errors import (
    EstimateOnSplitSupportError,
    EstimationWarning,
    InvalidManipulationIndex,
)

from stellar_engine.core import estimation
from stellar_engine.entities.errors import (
    EstimationInputError,
    EstimationNotConvergedError,
)

N_SPANS = 4
SPAN_LENGTH = 500.0
SPAN_INDEX = 0
OBSTACLE = [250.0, 10.0, 20.0]
RESULT_KEYS = {"value", "residual", "iterations", "converged"}


@pytest.fixture
def study(cable_array_AM600: CableArray) -> SectionStudy:
    section_array = SectionArray(
        pd.DataFrame(
            {
                "name": ["1", "2", "3", "4", "5"],
                "suspension": [False, True, True, True, False],
                "conductor_attachment_altitude": [50, 100, 50, 60, 50],
                "crossarm_length": [10, 10, 10, 10, 10],
                "line_angle": [0, 0, 0, 0, 0],
                "insulator_length": [3, 3, 3, 3, 3],
                "span_length": [SPAN_LENGTH] * N_SPANS + [np.nan],
                "insulator_mass": [100.0, 50.0, 50.0, 50.0, 100.0],
            }
        ),
        sagging_parameter=2000,
        sagging_temperature=15,
    )
    section_array.add_units({"line_angle": "grad"})
    section_study = SectionStudy(
        cable_array=cable_array_AM600, section_array=section_array
    )
    section_study.solve_adjustment()
    return section_study


def reference_distance(study: SectionStudy, **conditions) -> float:
    reference = study.copy()
    reference.solve_change_state(**conditions)
    return reference.position_engine.point_distance(
        SPAN_INDEX, np.array(OBSTACLE)
    ).distance_3d


def assert_study_untouched(study: SectionStudy, dxdydz_before: np.ndarray):
    np.testing.assert_array_equal(
        study.balance_engine.balance_model.nodes.dxdydz, dxdydz_before
    )


def test_estimate_temperature(study: SectionStudy):
    target = reference_distance(study, new_temperature=60.0)
    dxdydz_before = study.balance_engine.balance_model.nodes.dxdydz.copy()

    result = estimation.estimate_temperature(
        {
            "spanIndex": SPAN_INDEX,
            "obstaclePoint": OBSTACLE,
            "targetDistance": target,
            "bounds": [0.0, 120.0],
        },
        study,
    )

    assert set(result) == RESULT_KEYS
    assert result["converged"] is True
    assert result["value"] == pytest.approx(60.0, abs=0.5)
    assert_study_untouched(study, dxdydz_before)


def test_estimate_temperature_with_fixed_ice_in_cm(study: SectionStudy):
    target = reference_distance(
        study, new_temperature=60.0, ice_thickness=0.01
    )

    result = estimation.estimate_temperature(
        {
            "spanIndex": SPAN_INDEX,
            "obstaclePoint": OBSTACLE,
            "targetDistance": target,
            "bounds": [0.0, 120.0],
            "iceThickness": 1.0,
        },
        study,
    )

    assert result["converged"] is True
    assert result["value"] == pytest.approx(60.0, abs=0.5)


def test_estimate_wind(study: SectionStudy):
    target = reference_distance(study, wind_pressure=200.0)
    dxdydz_before = study.balance_engine.balance_model.nodes.dxdydz.copy()

    result = estimation.estimate_wind(
        {
            "spanIndex": SPAN_INDEX,
            "obstaclePoint": OBSTACLE,
            "targetDistance": target,
            "bounds": [0.0, 500.0],
            "temperature": None,
        },
        study,
    )

    assert set(result) == RESULT_KEYS
    assert result["converged"] is True
    assert result["value"] == pytest.approx(200.0, abs=5.0)
    assert_study_untouched(study, dxdydz_before)


def test_estimate_load(study: SectionStudy):
    positions = np.zeros(N_SPANS)
    masses = np.zeros(N_SPANS)
    positions[SPAN_INDEX] = 100.0
    masses[SPAN_INDEX] = 50.0
    reference = study.copy()
    reference.set_loads(positions, masses)
    target = reference_distance(reference)
    masses_before = study.balance_engine.span_loads.load_mass.copy()

    result = estimation.estimate_load(
        {
            "spanIndex": SPAN_INDEX,
            "obstaclePoint": OBSTACLE,
            "targetDistance": target,
            "loadPositionDistance": 100.0,
            "bounds": [0.0, 100.0],
        },
        study,
    )

    assert set(result) == RESULT_KEYS
    assert result["converged"] is True
    assert result["value"] == pytest.approx(50.0, abs=1.0)
    np.testing.assert_array_equal(
        study.balance_engine.span_loads.load_mass, masses_before
    )


def test_estimate_rope(study: SectionStudy):
    support_index = SPAN_INDEX + 1
    reference = study.copy()
    reference.set_rope_or_chain(
        {support_index: {"type": "rope", "length": 5.0}}
    )
    reference.solve_change_state()
    distance = reference.position_engine.point_distance(
        SPAN_INDEX, np.array(OBSTACLE)
    )
    target = float(distance.point_target[2] - OBSTACLE[2])
    dxdydz_before = study.balance_engine.balance_model.nodes.dxdydz.copy()

    result = estimation.estimate_rope(
        {
            "supportIndex": support_index,
            "spanIndex": SPAN_INDEX,
            "obstaclePoint": OBSTACLE,
            "targetVerticalDistance": target,
            "bounds": [1.0, 10.0],
        },
        study,
    )

    assert set(result) == RESULT_KEYS
    assert result["converged"] is True
    assert result["value"] == pytest.approx(5.0, abs=0.05)
    assert len(study.manipulation._rope_or_chain_overlay) == 0
    assert_study_untouched(study, dxdydz_before)


def test_estimate_without_bounds_uses_engine_defaults(study: SectionStudy):
    target = reference_distance(study, new_temperature=60.0)

    result = estimation.estimate_temperature(
        {
            "spanIndex": SPAN_INDEX,
            "obstaclePoint": OBSTACLE,
            "targetDistance": target,
        },
        study,
    )

    assert result["converged"] is True
    assert result["value"] == pytest.approx(60.0, abs=0.5)


def test_result_values_are_native_python_types(study: SectionStudy):
    result = estimation.estimate_temperature(
        {
            "spanIndex": SPAN_INDEX,
            "obstaclePoint": OBSTACLE,
            "targetDistance": reference_distance(study, new_temperature=60.0),
            "bounds": [0.0, 120.0],
        },
        study,
    )

    assert type(result["value"]) is float
    assert type(result["residual"]) is float
    assert type(result["iterations"]) is int
    assert type(result["converged"]) is bool


# ---------------------------errors----------------

VIRTUAL_SUPPORT_ON_FIRST_SPAN = {
    0: {
        "x": 100.0,
        "y": 0.0,
        "z": 60.0,
        "insulator_length": 3.0,
        "insulator_mass": 500.0,
        "hanging_cable_point_from_left_support": 100.0,
    },
}
VALID_TEMPERATURE_INPUTS = {
    "spanIndex": SPAN_INDEX,
    "obstaclePoint": OBSTACLE,
    "targetDistance": 30.0,
}


@pytest.mark.parametrize(
    "overrides, message",
    [
        ({"targetDistance": None}, "Missing estimation input: targetDistance"),
        ({"spanIndex": None}, "Missing estimation input: spanIndex"),
        ({"obstaclePoint": None}, "Missing estimation input: obstaclePoint"),
        ({"targetDistance": float("nan")}, "targetDistance must be a finite"),
        ({"targetDistance": "abc"}, "targetDistance must be a finite"),
        ({"targetDistance": 0.0}, "targetDistance must be strictly positive"),
        ({"spanIndex": -1}, "spanIndex must be a non-negative integer"),
        ({"spanIndex": 0.5}, "spanIndex must be a non-negative integer"),
        ({"obstaclePoint": [1.0, 2.0]}, "obstaclePoint must contain 3"),
        ({"obstaclePoint": [1.0, 2.0, np.nan]}, "obstaclePoint must contain"),
        ({"bounds": [120.0, 0.0]}, "bounds must be \\[lower, upper\\]"),
        ({"bounds": [0.0]}, "bounds must be \\[lower, upper\\]"),
        ({"windPressure": float("inf")}, "windPressure must be a finite"),
    ],
)
def test_estimate_invalid_inputs_raise_estimation_input_error(
    study: SectionStudy, overrides: dict, message: str
):
    with pytest.raises(EstimationInputError, match=message):
        estimation.estimate_temperature(
            {**VALID_TEMPERATURE_INPUTS, **overrides}, study
        )


@pytest.mark.parametrize(
    "estimate, inputs, message",
    [
        (
            estimation.estimate_load,
            {"targetDistance": 30.0, "loadPositionDistance": -1.0},
            "loadPositionDistance must be strictly positive",
        ),
        (
            estimation.estimate_rope,
            {"targetVerticalDistance": 30.0},
            "Missing estimation input: supportIndex",
        ),
        (
            estimation.estimate_rope,
            {
                "supportIndex": 1,
                "targetVerticalDistance": 30.0,
                "ropeLineicMass": 0.0,
            },
            "ropeLineicMass must be strictly positive",
        ),
    ],
)
def test_estimate_load_and_rope_invalid_inputs(
    study: SectionStudy, estimate, inputs: dict, message: str
):
    with pytest.raises(EstimationInputError, match=message):
        estimate(
            {"spanIndex": SPAN_INDEX, "obstaclePoint": OBSTACLE, **inputs},
            study,
        )


def test_estimate_unreachable_target_raises_not_converged(
    study: SectionStudy,
):
    with pytest.raises(
        EstimationNotConvergedError,
        match="Temperature estimation did not converge",
    ):
        estimation.estimate_temperature(
            {
                **VALID_TEMPERATURE_INPUTS,
                "targetDistance": 1000.0,
                "bounds": [0.0, 120.0],
            },
            study,
        )


def test_estimate_nan_distance_raises_not_converged(
    study: SectionStudy, monkeypatch: pytest.MonkeyPatch
):
    def raise_nan(**_kwargs):
        raise ValueError("objective returned NaN at bounds")

    monkeypatch.setattr(study.estimation_engine, "estimate_wind", raise_nan)

    with pytest.raises(
        EstimationNotConvergedError, match="distance to the obstacle"
    ):
        estimation.estimate_wind(VALID_TEMPERATURE_INPUTS, study)


def test_estimate_span_out_of_range_raises_invalid_manipulation_index(
    study: SectionStudy,
):
    with pytest.raises(InvalidManipulationIndex, match="out of range"):
        estimation.estimate_temperature(
            {**VALID_TEMPERATURE_INPUTS, "spanIndex": N_SPANS}, study
        )


@pytest.mark.parametrize(
    "estimate, inputs",
    [
        (estimation.estimate_temperature, {"targetDistance": 30.0}),
        (estimation.estimate_wind, {"targetDistance": 30.0}),
        (
            estimation.estimate_load,
            {"targetDistance": 30.0, "loadPositionDistance": 50.0},
        ),
        (
            estimation.estimate_rope,
            {"supportIndex": 1, "targetVerticalDistance": 30.0},
        ),
    ],
)
def test_estimate_on_split_span_raises_estimate_on_split_support_error(
    study: SectionStudy, estimate, inputs: dict
):
    study.set_virtual_support(VIRTUAL_SUPPORT_ON_FIRST_SPAN)

    with pytest.raises(EstimateOnSplitSupportError, match="split"):
        estimate(
            {"spanIndex": SPAN_INDEX, "obstaclePoint": OBSTACLE, **inputs},
            study,
        )


def test_estimate_temperature_maps_span_index_before_manipulation(
    study: SectionStudy,
):
    study.set_virtual_support(VIRTUAL_SUPPORT_ON_FIRST_SPAN)
    obstacle = [750.0, 10.0, 20.0]
    reference = study.copy()
    reference.solve_change_state(new_temperature=60.0)
    # Span 1 before manipulation is span 2 once the virtual support is added
    target = reference.position_engine.point_distance(
        2, np.array(obstacle)
    ).distance_3d

    result = estimation.estimate_temperature(
        {
            "spanIndex": 1,
            "obstaclePoint": obstacle,
            "targetDistance": target,
            "bounds": [0.0, 120.0],
        },
        study,
    )

    assert result["value"] == pytest.approx(60.0, abs=0.5)


def test_estimate_load_on_span_with_existing_load_warns(study: SectionStudy):
    positions = np.zeros(N_SPANS)
    masses = np.zeros(N_SPANS)
    positions[SPAN_INDEX] = 100.0
    masses[SPAN_INDEX] = 50.0
    study.set_loads(positions, masses)
    target = reference_distance(study)

    with pytest.warns(EstimationWarning, match="load is ignored"):
        result = estimation.estimate_load(
            {
                "spanIndex": SPAN_INDEX,
                "obstaclePoint": OBSTACLE,
                "targetDistance": target,
                "loadPositionDistance": 100.0,
                "bounds": [0.0, 100.0],
            },
            study,
        )

    assert result["value"] == pytest.approx(50.0, abs=1.0)
