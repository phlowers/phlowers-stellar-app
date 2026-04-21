# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from unittest.mock import MagicMock

import numpy as np
import pandas as pd
import pytest
from mechaphlowers import BalanceEngine, CableArray, SectionArray
from mechaphlowers.data.catalog.catalog import (
    sample_cable_catalog,
)

from stellar_engine.plot.obstacles import change_obstacles_coordinates


def _make_balance_engine(span_lengths, conductor_altitudes):
    """Create a mock BalanceEngine with given span_lengths and conductor_altitudes."""
    engine = MagicMock()
    engine.section_array.data.span_length = np.array(span_lengths)
    engine.section_array.data.conductor_attachment_altitude = np.array(
        conductor_altitudes
    )
    return engine


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
        )
    )
    section_array.add_units({"line_angle": "grad"})
    section_array.sagging_parameter = 2000
    section_array.sagging_temperature = 15
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


def _make_df(rows):
    """Build a DataFrame from a list of row dicts with the expected columns."""
    return pd.DataFrame(rows)


# js_inputs:  {'obstacles': [{'uuid': '4bbb2465-f175-47e9-b309-0cc2984eae0f', 'supportUuid': 'f5bc4a88-1ab9-4ca2-866b-079e1b831362', 'supportIndex': 3, 'name': 'mlm', 'type': 'accessible_building', 'altitudeType': 'absolute', 'lateralDistanceType': 'SPAN_AXIS', 'referenceSupport': 'LEFT', 'positions': [{'x': 100, 'y': 15, 'z': 2300}]}, {'uuid': 'd2bb46e1-7efd-4e8c-9144-5a6b4e514162', 'supportUuid': '91285b79-887d-4396-a0bd-9d6016c514e5', 'supportIndex': 1, 'name': '23_obs', 'type': 'agricultural_land', 'altitudeType': 'absolute', 'lateralDistanceType': 'SPAN_AXIS', 'referenceSupport': 'RIGHT', 'positions': [{'x': 100, 'y': 0, 'z': 2100}]}, {'uuid': '7dcf4ae2-efae-47e4-b6f0-9d18421f30e3', 'supportUuid': '91285b79-887d-4396-a0bd-9d6016c514e5', 'supportIndex': 1, 'name': '23_relative', 'type': 'agricultural_land', 'altitudeType': 'relative', 'lateralDistanceType': 'SPAN_AXIS', 'referenceSupport': 'LEFT', 'positions': [{'x': 100, 'y': 100, 'z': 100}]}, {'uuid': '73538328-3ae4-4d40-8f56-eaa202ad3eec', 'supportUuid': 'f1f5d0a7-bd73-4786-b2c6-f76bc1c80c57', 'supportIndex': 2, 'name': '11111', 'type': 'accessible_building', 'altitudeType': 'relative', 'lateralDistanceType': 'SPAN_AXIS', 'referenceSupport': 'RIGHT', 'positions': [{'x': 50, 'y': 50, 'z': -264}]}, {'uuid': '71d46e2f-9f42-4633-893b-4d3b4b078d35', 'supportUuid': '91285b79-887d-4396-a0bd-9d6016c514e5', 'supportIndex': 1, 'name': '23_abs', 'type': 'House', 'altitudeType': 'absolute', 'lateralDistanceType': 'SPAN_AXIS', 'referenceSupport': 'LEFT', 'positions': [{'x': 300, 'y': 100, 'z': 2200}, {'x': 100, 'y': 30, 'z': 2300}]}, {'uuid': '6299e3f4-a52a-48c8-80ea-8885ce07f6f2', 'supportUuid': 'ca090ced-57da-4dfa-970d-84b3a4386c20', 'supportIndex': 8, 'name': 'ppp', 'type': 'agricultural_land', 'altitudeType': 'relative', 'lateralDistanceType': 'SPAN_AXIS', 'referenceSupport': 'LEFT', 'positions': [{'x': 100, 'y': 100, 'z': -100}]}, {'uuid': '1bb9b294-47e5-40b0-b1b3-e5e535c0832e', 'supportUuid': '91285b79-887d-4396-a0bd-9d6016c514e5', 'supportIndex': 1, 'name': 'hhh', 'type': 'accessible_building', 'altitudeType': 'relative', 'lateralDistanceType': 'SPAN_AXIS', 'referenceSupport': 'LEFT', 'positions': [{'x': 10, 'y': 10, 'z': 10}]}, {'uuid': '08574225-a0fa-40ca-9738-1898da973d4b', 'supportUuid': 'f1f5d0a7-bd73-4786-b2c6-f76bc1c80c57', 'supportIndex': 2, 'name': 'RRRR', 'type': 'accessible_building', 'altitudeType': 'relative', 'lateralDistanceType': 'SPAN_AXIS', 'referenceSupport': 'LEFT', 'positions': [{'x': 10, 'y': 10, 'z': 10}]}], 'startSupport': 0, 'endSupport': 1, 'view': '3d'}


def test_standard_case(balance_engine_simple):
    df = pd.DataFrame(
        {
            "name": {
                "0": "30edf0ca-c4f6-4e65-b11a-1539db61ecaa",
                "1": "c115040c-2a60-4296-99fd-9a01e17211c9",
                "2": "9ad44862-6548-4b76-bbf2-05726715068c",
                "3": "4d8aafd7-04e9-49e4-8755-f207a8b48c7f",
            },
            "point_index": {"0": 0, "1": 0, "2": 0, "3": 0},
            "span_index": {"0": 0, "1": 0, "2": 1, "3": 1},
            "altitude_type": {
                "0": "absolute",
                "1": "relative",
                "2": "absolute",
                "3": "relative",
            },
            "lateral_distance_type": {
                "0": "SPAN_AXIS",
                "1": "SPAN_AXIS",
                "2": "SPAN_AXIS",
                "3": "SPAN_AXIS",
            },
            "x": {"0": 100, "1": 100, "2": 10, "3": 100},
            "y": {"0": 15, "1": 10, "2": 100, "3": 100},
            "z": {"0": 1955, "1": 0, "2": 1950, "3": 100},
            "object_type": {
                "0": "agricultural_land",
                "1": "accessible_building",
                "2": "agricultural_land",
                "3": "accessible_building",
            },
            "ref_support": {
                "0": "LEFT",
                "1": "LEFT",
                "2": "LEFT",
                "3": "RIGHT",
            },
        }
    )
    engine = balance_engine_simple

    result = change_obstacles_coordinates(df, engine)

    # np.testing.assert_array_almost_equal(
    #     result["x"].to_numpy(), np.array([100.0, 100.0, 10.0, np.nan])
    # )
    # np.testing.assert_array_almost_equal(
    #     result["z"].to_numpy(), np.array([1955.0, 1900.0, 1950.0, 2050.0])
    # )

