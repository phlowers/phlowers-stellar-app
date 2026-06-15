# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import numpy as np
import pandas as pd
import pytest
from mechaphlowers import BalanceEngine, CableArray, PlotEngine, SectionArray
from mechaphlowers.data.catalog.catalog import (
    sample_cable_catalog,
)

from stellar_engine.plot.plot_2d import refresh_projection


@pytest.fixture
def cable_array_AM600() -> CableArray:
    return sample_cable_catalog.get_as_object(["ASTER600"])


@pytest.fixture
def section_array_arm() -> SectionArray:
    section_array = SectionArray(
        pd.DataFrame(
            {
                "name": ["1", "2", "3", "4"],
                "suspension": [False, True, True, False],
                "conductor_attachment_altitude": [30, 50, 60, 65],
                "crossarm_length": [0, 10, -10, 0],
                "line_angle": [0, 0, 0, 0],
                "insulator_length": [0, 3, 3, 0],
                "span_length": [500, 300, 400, np.nan],
                "insulator_mass": [1000, 500, 500, 1000],
                "load_mass": [0, 0, 0, 0],
                "load_position": [0, 0, 0, 0],
            }
        ),
        sagging_parameter=2000,
        sagging_temperature=15,
    )
    section_array.add_units({"line_angle": "grad"})
    return section_array


@pytest.fixture
def balance_engine_simple(cable_array_AM600: CableArray) -> BalanceEngine:
    section_array = SectionArray(
        pd.DataFrame(
            {
                "name": ["1", "2", "3"],
                "suspension": [False, True, False],
                "conductor_attachment_altitude": [1900, 1950, 1960],
                "crossarm_length": [0, 0, 0],
                "line_angle": [0, 0, 0],
                "insulator_length": [3, 3, 3],
                "span_length": [500, 300, np.nan],
                "insulator_mass": [1000, 500, 500],
                "load_mass": [0, 0, 0],
                "load_position": [0, 0, 0],
            }
        ),
        sagging_parameter=2000,
        sagging_temperature=15,
    )
    section_array.add_units({"line_angle": "grad"})
    return BalanceEngine(
        cable_array=cable_array_AM600, section_array=section_array
    )


@pytest.fixture
def plot_engine_base_test(
    balance_engine_simple: BalanceEngine,
) -> PlotEngine:
    return PlotEngine(engine=balance_engine_simple)


def test_refresh_projection(
    balance_engine_simple: BalanceEngine, plot_engine_base_test: PlotEngine
):
    inputs = {'startSupport': 1, 'endSupport': 2, 'view': '3d'}
    balance_engine_simple.solve_adjustment()
    refresh_projection(
        inputs,
        balance_engine_simple,
        plot_engine_base_test,
        plot_engine_base_test,
    )
