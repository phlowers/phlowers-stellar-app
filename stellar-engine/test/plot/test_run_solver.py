# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Regression tests for stellar_engine.plot.run_solver.change_state.

These guard against a mechaphlowers 0.11.1 regression where successive
`change_state` calls silently ignored span-load changes (frozen warm-start
memento) or crashed when the number of loaded spans changed (stale load-merge
cache). Both issues are fixed upstream in mechaphlowers; these tests ensure
stellar_engine keeps working correctly against the fixed engine and would
catch a reintroduction of either bug.
"""

import numpy as np
import pandas as pd
import pytest
from mechaphlowers import CableArray, SectionArray, SectionStudy
from mechaphlowers.data.catalog.catalog import sample_cable_catalog

from stellar_engine.plot.run_solver import change_state


@pytest.fixture
def cable_array() -> CableArray:
    return sample_cable_catalog.get_as_object(["ASTER600"])


def build_section_array() -> SectionArray:
    section_array = SectionArray(
        pd.DataFrame(
            {
                "name": ["1", "2", "3", "4", "5"],
                "suspension": [False, True, True, True, False],
                "conductor_attachment_altitude": [50.0, 50.0, 50.0, 50.0, 50.0],
                "crossarm_length": [0.0, 5.0, 5.0, 5.0, 0.0],
                "line_angle": [0.0, 0.0, 0.0, 0.0, 0.0],
                "insulator_length": [3.0, 3.0, 3.0, 3.0, 3.0],
                "span_length": [400.0, 400.0, 400.0, 400.0, np.nan],
                "insulator_mass": [1000.0, 500.0, 500.0, 500.0, 1000.0],
                "load_mass": [0.0, 0.0, 0.0, 0.0, 0.0],
                "load_position": [0.0, 0.0, 0.0, 0.0, 0.0],
            }
        ),
        sagging_parameter=2000,
        sagging_temperature=15,
    )
    section_array.add_units({"line_angle": "grad"})
    return section_array


@pytest.fixture
def study(cable_array: CableArray) -> SectionStudy:
    study = SectionStudy(cable_array=cable_array, section_array=build_section_array())
    study.solve_adjustment()
    study.solve_change_state()
    return study


def climate_inputs(cable_temperature: float) -> dict:
    return {
        "climate": {
            "windPressure": 0,
            "cableTemperature": cable_temperature,
            "symmetryType": "symmetric",
            "iceThickness": 0,
            "frontierSupportNumber": 0,
            "iceThicknessBefore": 0,
            "iceThicknessAfter": 0,
        }
    }


def geometry(study: SectionStudy) -> np.ndarray:
    nodes = study.balance_engine.balance_model.nodes
    return np.column_stack([nodes.dx, nodes.dy, nodes.dz])


def test_climate_change_reflected_across_successive_calls(study: SectionStudy) -> None:
    """A repeated change_state with different climate values must move the geometry."""
    change_state(climate_inputs(15), study)
    geometry_15 = geometry(study).copy()

    change_state(climate_inputs(60), study)
    geometry_60 = geometry(study)

    assert not np.allclose(geometry_15, geometry_60)


def test_moving_a_load_between_spans_is_reflected(study: SectionStudy, cable_array: CableArray) -> None:
    """Changing which span carries a load must change the resulting geometry
    and match a freshly-built study with the same final load configuration
    (regression guard for the frozen warm-start memento bug)."""
    study.set_loads([200.0, 0.0, 0.0, 0.0], [500.0, 0.0, 0.0, 0.0])
    change_state(climate_inputs(60), study)
    geometry_span0 = geometry(study).copy()

    study.set_loads([0.0, 200.0, 0.0, 0.0], [0.0, 500.0, 0.0, 0.0])
    change_state(climate_inputs(60), study)
    geometry_span1 = geometry(study).copy()

    assert not np.allclose(geometry_span0, geometry_span1)

    reference = SectionStudy(cable_array=cable_array, section_array=build_section_array())
    reference.solve_adjustment()
    reference.solve_change_state()
    reference.set_loads([0.0, 200.0, 0.0, 0.0], [0.0, 500.0, 0.0, 0.0])
    change_state(climate_inputs(60), reference)

    np.testing.assert_allclose(geometry_span1, geometry(reference), atol=1e-6)


@pytest.mark.parametrize(
    ("first_loads", "second_loads"),
    [
        pytest.param(
            ([200.0, 0.0, 0.0, 0.0], [500.0, 0.0, 0.0, 0.0]),
            ([200.0, 200.0, 0.0, 0.0], [500.0, 300.0, 0.0, 0.0]),
            id="one_to_two_loaded_spans",
        ),
        pytest.param(
            ([200.0, 200.0, 0.0, 0.0], [500.0, 300.0, 0.0, 0.0]),
            ([200.0, 0.0, 0.0, 0.0], [500.0, 0.0, 0.0, 0.0]),
            id="two_to_one_loaded_spans",
        ),
    ],
)
def test_changing_number_of_loaded_spans_does_not_crash(
    study: SectionStudy,
    cable_array: CableArray,
    first_loads: tuple[list, list],
    second_loads: tuple[list, list],
) -> None:
    """Changing the number of loaded spans between calls must not crash
    (regression guard for the stale load-merge index cache bug) and must
    match a freshly-built study with the final load configuration."""
    study.set_loads(*first_loads)
    change_state(climate_inputs(60), study)

    study.set_loads(*second_loads)
    change_state(climate_inputs(60), study)
    result_geometry = geometry(study).copy()

    reference = SectionStudy(cable_array=cable_array, section_array=build_section_array())
    reference.solve_adjustment()
    reference.solve_change_state()
    reference.set_loads(*second_loads)
    change_state(climate_inputs(60), reference)

    np.testing.assert_allclose(result_geometry, geometry(reference), atol=1e-6)
