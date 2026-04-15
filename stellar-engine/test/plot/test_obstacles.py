# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from unittest.mock import MagicMock

from mechaphlowers import BalanceEngine, CableArray, SectionArray
import numpy as np
import pandas as pd
import pytest

from stellar_engine.plot.obstacles import change_obstacles_coordinates
from mechaphlowers.data.catalog.catalog import (
    sample_cable_catalog,
)


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

    np.testing.assert_array_almost_equal(
        result["x"].to_numpy(), np.array([100.0, 100.0, 10.0, 200.0])
    )
    np.testing.assert_array_almost_equal(
        result["z"].to_numpy(), np.array([1955.0, 1900.0, 1950.0, 2050.0])
    )


class TestChangeObstaclesCoordinates:
    """Tests for the change_obstacles_coordinates function."""

    def test_x_reversed_for_span_axis(self):
        """x should be reversed (span_length - x) when lateral_distance_type is span_axis."""
        df = _make_df(
            [
                {
                    "span_index": 0,
                    "lateral_distance_type": "span_axis",
                    "altitude_type": "absolute",
                    "x": 30.0,
                    "y": 0.0,
                    "z": 10.0,
                },
                {
                    "span_index": 0,
                    "lateral_distance_type": "span_axis",
                    "altitude_type": "absolute",
                    "x": 70.0,
                    "y": 0.0,
                    "z": 20.0,
                },
            ]
        )
        engine = _make_balance_engine(
            span_lengths=[100.0], conductor_altitudes=[5.0]
        )

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["x"].values, [70.0, 30.0])

    def test_x_unchanged_for_non_span_axis(self):
        """x should remain unchanged when lateral_distance_type is not span_axis."""
        df = _make_df(
            [
                {
                    "span_index": 0,
                    "lateral_distance_type": "other",
                    "altitude_type": "absolute",
                    "x": 30.0,
                    "y": 0.0,
                    "z": 10.0,
                },
            ]
        )
        engine = _make_balance_engine(
            span_lengths=[100.0], conductor_altitudes=[5.0]
        )

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["x"].values, [30.0])

    def test_z_offset_for_support_foot_relative(self):
        """z should be offset by conductor_attachment_altitude when altitude_type is support_foot_relative."""
        df = _make_df(
            [
                {
                    "span_index": 1,
                    "lateral_distance_type": "other",
                    "altitude_type": "support_foot_relative",
                    "x": 10.0,
                    "y": 0.0,
                    "z": 5.0,
                },
            ]
        )
        engine = _make_balance_engine(
            span_lengths=[100.0, 200.0], conductor_altitudes=[3.0, 7.0]
        )

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(
            result["z"].values, [12.0]
        )  # 5.0 + 7.0

    def test_z_unchanged_for_absolute(self):
        """z should remain unchanged when altitude_type is absolute."""
        df = _make_df(
            [
                {
                    "span_index": 0,
                    "lateral_distance_type": "other",
                    "altitude_type": "absolute",
                    "x": 10.0,
                    "y": 0.0,
                    "z": 5.0,
                },
            ]
        )
        engine = _make_balance_engine(
            span_lengths=[100.0], conductor_altitudes=[99.0]
        )

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["z"].values, [5.0])

    def test_mixed_rows(self):
        """Both x reversal and z offset should apply selectively based on type columns."""
        df = _make_df(
            [
                {
                    "span_index": 0,
                    "lateral_distance_type": "span_axis",
                    "altitude_type": "support_foot_relative",
                    "x": 20.0,
                    "y": 1.0,
                    "z": 3.0,
                },
                {
                    "span_index": 0,
                    "lateral_distance_type": "other",
                    "altitude_type": "absolute",
                    "x": 40.0,
                    "y": 2.0,
                    "z": 6.0,
                },
                {
                    "span_index": 0,
                    "lateral_distance_type": "span_axis",
                    "altitude_type": "absolute",
                    "x": 60.0,
                    "y": 3.0,
                    "z": 9.0,
                },
            ]
        )
        engine = _make_balance_engine(
            span_lengths=[100.0], conductor_altitudes=[10.0]
        )

        result = change_obstacles_coordinates(df, engine)

        # x: row0 reversed (100-20=80), row1 unchanged (40), row2 reversed (100-60=40)
        np.testing.assert_array_almost_equal(
            result["x"].values, [80.0, 40.0, 40.0]
        )
        # z: row0 offset (3+10=13), row1 unchanged (6), row2 unchanged (9)
        np.testing.assert_array_almost_equal(
            result["z"].values, [13.0, 6.0, 9.0]
        )

    def test_y_column_is_not_modified(self):
        """y values should never be modified."""
        df = _make_df(
            [
                {
                    "span_index": 0,
                    "lateral_distance_type": "span_axis",
                    "altitude_type": "support_foot_relative",
                    "x": 10.0,
                    "y": 42.0,
                    "z": 5.0,
                },
            ]
        )
        engine = _make_balance_engine(
            span_lengths=[100.0], conductor_altitudes=[2.0]
        )

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["y"].values, [42.0])

    def test_does_not_raise_on_read_only_array(self):
        """Regression: to_numpy() can return a read-only view — ensure no ValueError."""
        df = _make_df(
            [
                {
                    "span_index": 0,
                    "lateral_distance_type": "span_axis",
                    "altitude_type": "support_foot_relative",
                    "x": 25.0,
                    "y": 0.0,
                    "z": 8.0,
                },
            ]
        )
        # Make the underlying numpy arrays read-only to reproduce the bug
        df["x"].values.flags.writeable = False
        df["z"].values.flags.writeable = False

        engine = _make_balance_engine(
            span_lengths=[100.0], conductor_altitudes=[4.0]
        )

        # Should not raise ValueError: assignment destination is read-only
        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["x"].values, [75.0])
        np.testing.assert_array_almost_equal(result["z"].values, [12.0])

    def test_returns_dataframe(self):
        """The function should return a DataFrame."""
        df = _make_df(
            [
                {
                    "span_index": 0,
                    "lateral_distance_type": "span_axis",
                    "altitude_type": "absolute",
                    "x": 10.0,
                    "y": 0.0,
                    "z": 5.0,
                },
            ]
        )
        engine = _make_balance_engine(
            span_lengths=[100.0], conductor_altitudes=[1.0]
        )

        result = change_obstacles_coordinates(df, engine)

        assert isinstance(result, pd.DataFrame)


# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from unittest.mock import MagicMock

import numpy as np
import pandas as pd
import pytest

from stellar_engine.plot.obstacles import change_obstacles_coordinates


def _make_balance_engine(span_length, conductor_altitude):
    """Create a mock BalanceEngine with the given section_array data."""
    engine = MagicMock()
    engine.section_array.data.span_length = np.array(span_length)
    engine.section_array.data.conductor_attachment_altitude = np.array(
        conductor_altitude
    )
    return engine


class TestChangeObstaclesCoordinates:
    """Tests for change_obstacles_coordinates."""

    def _make_df(self, rows):
        return pd.DataFrame(rows)

    def test_reverses_x_for_span_axis(self):
        df = self._make_df(
            [
                {
                    "span_index": 0,
                    "lateral_distance_type": "span_axis",
                    "altitude_type": "absolute",
                    "x": 30.0,
                    "y": 0.0,
                    "z": 10.0,
                },
            ]
        )
        engine = _make_balance_engine(
            span_length=[100.0], conductor_altitude=[5.0]
        )

        result = change_obstacles_coordinates(df, engine)

        assert result["x"].iloc[0] == pytest.approx(70.0)

    def test_does_not_reverse_x_for_non_span_axis(self):
        df = self._make_df(
            [
                {
                    "span_index": 0,
                    "lateral_distance_type": "other",
                    "altitude_type": "absolute",
                    "x": 30.0,
                    "y": 0.0,
                    "z": 10.0,
                },
            ]
        )
        engine = _make_balance_engine(
            span_length=[100.0], conductor_altitude=[5.0]
        )

        result = change_obstacles_coordinates(df, engine)

        assert result["x"].iloc[0] == pytest.approx(30.0)

    def test_adds_altitude_for_support_foot_relative(self):
        df = self._make_df(
            [
                {
                    "span_index": 1,
                    "lateral_distance_type": "other",
                    "altitude_type": "support_foot_relative",
                    "x": 10.0,
                    "y": 0.0,
                    "z": 5.0,
                },
            ]
        )
        engine = _make_balance_engine(
            span_length=[100.0, 200.0], conductor_altitude=[3.0, 7.0]
        )

        result = change_obstacles_coordinates(df, engine)

        assert result["z"].iloc[0] == pytest.approx(12.0)

    def test_does_not_add_altitude_for_absolute(self):
        df = self._make_df(
            [
                {
                    "span_index": 0,
                    "lateral_distance_type": "other",
                    "altitude_type": "absolute",
                    "x": 10.0,
                    "y": 0.0,
                    "z": 5.0,
                },
            ]
        )
        engine = _make_balance_engine(
            span_length=[100.0], conductor_altitude=[3.0]
        )

        result = change_obstacles_coordinates(df, engine)

        assert result["z"].iloc[0] == pytest.approx(5.0)

    def test_combined_x_reversal_and_z_offset(self):
        df = self._make_df(
            [
                {
                    "span_index": 0,
                    "lateral_distance_type": "span_axis",
                    "altitude_type": "support_foot_relative",
                    "x": 20.0,
                    "y": 5.0,
                    "z": 8.0,
                },
            ]
        )
        engine = _make_balance_engine(
            span_length=[150.0], conductor_altitude=[10.0]
        )

        result = change_obstacles_coordinates(df, engine)

        assert result["x"].iloc[0] == pytest.approx(130.0)
        assert result["z"].iloc[0] == pytest.approx(18.0)
        assert result["y"].iloc[0] == pytest.approx(5.0)

    def test_multiple_rows_mixed(self):
        df = self._make_df(
            [
                {
                    "span_index": 0,
                    "lateral_distance_type": "span_axis",
                    "altitude_type": "absolute",
                    "x": 10.0,
                    "y": 0.0,
                    "z": 5.0,
                },
                {
                    "span_index": 0,
                    "lateral_distance_type": "other",
                    "altitude_type": "support_foot_relative",
                    "x": 40.0,
                    "y": 1.0,
                    "z": 3.0,
                },
                {
                    "span_index": 0,
                    "lateral_distance_type": "span_axis",
                    "altitude_type": "support_foot_relative",
                    "x": 60.0,
                    "y": 2.0,
                    "z": 7.0,
                },
            ]
        )
        engine = _make_balance_engine(
            span_length=[200.0], conductor_altitude=[10.0]
        )

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(
            result["x"].values, [190.0, 40.0, 140.0]
        )
        np.testing.assert_array_almost_equal(
            result["z"].values, [5.0, 13.0, 17.0]
        )

    def test_readonly_array_does_not_raise(self):
        """Reproduce ValueError: assignment destination is read-only.

        When the DataFrame backing arrays are read-only (e.g. from pandas CoW
        or from constructing via read-only numpy arrays), to_numpy() returns a
        non-writable view. The function must still work.
        """
        x = np.array([30.0, 60.0])
        x.flags.writeable = False
        z = np.array([5.0, 8.0])
        z.flags.writeable = False

        df = pd.DataFrame(
            {
                "span_index": [0, 0],
                "lateral_distance_type": ["span_axis", "span_axis"],
                "altitude_type": ["support_foot_relative", "absolute"],
                "x": x,
                "y": [0.0, 0.0],
                "z": z,
            }
        )
        engine = _make_balance_engine(
            span_length=[100.0], conductor_altitude=[10.0]
        )

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["x"].values, [70.0, 40.0])
        np.testing.assert_array_almost_equal(result["z"].values, [15.0, 8.0])
