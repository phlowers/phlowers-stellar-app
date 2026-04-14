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


def _make_balance_engine(span_lengths, conductor_altitudes):
    """Create a mock BalanceEngine with given span_lengths and conductor_altitudes."""
    engine = MagicMock()
    engine.section_array.data.span_length = np.array(span_lengths)
    engine.section_array.data.conductor_attachment_altitude = np.array(conductor_altitudes)
    return engine


def _make_df(rows):
    """Build a DataFrame from a list of row dicts with the expected columns."""
    return pd.DataFrame(rows)


class TestChangeObstaclesCoordinates:
    """Tests for the change_obstacles_coordinates function."""

    def test_x_reversed_for_span_axis(self):
        """x should be reversed (span_length - x) when lateral_distance_type is span_axis."""
        df = _make_df([
            {"span_index": 0, "lateral_distance_type": "span_axis", "altitude_type": "absolute", "x": 30.0, "y": 0.0, "z": 10.0},
            {"span_index": 0, "lateral_distance_type": "span_axis", "altitude_type": "absolute", "x": 70.0, "y": 0.0, "z": 20.0},
        ])
        engine = _make_balance_engine(span_lengths=[100.0], conductor_altitudes=[5.0])

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["x"].values, [70.0, 30.0])

    def test_x_unchanged_for_non_span_axis(self):
        """x should remain unchanged when lateral_distance_type is not span_axis."""
        df = _make_df([
            {"span_index": 0, "lateral_distance_type": "other", "altitude_type": "absolute", "x": 30.0, "y": 0.0, "z": 10.0},
        ])
        engine = _make_balance_engine(span_lengths=[100.0], conductor_altitudes=[5.0])

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["x"].values, [30.0])

    def test_z_offset_for_support_foot_relative(self):
        """z should be offset by conductor_attachment_altitude when altitude_type is support_foot_relative."""
        df = _make_df([
            {"span_index": 1, "lateral_distance_type": "other", "altitude_type": "support_foot_relative", "x": 10.0, "y": 0.0, "z": 5.0},
        ])
        engine = _make_balance_engine(span_lengths=[100.0, 200.0], conductor_altitudes=[3.0, 7.0])

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["z"].values, [12.0])  # 5.0 + 7.0

    def test_z_unchanged_for_absolute(self):
        """z should remain unchanged when altitude_type is absolute."""
        df = _make_df([
            {"span_index": 0, "lateral_distance_type": "other", "altitude_type": "absolute", "x": 10.0, "y": 0.0, "z": 5.0},
        ])
        engine = _make_balance_engine(span_lengths=[100.0], conductor_altitudes=[99.0])

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["z"].values, [5.0])

    def test_mixed_rows(self):
        """Both x reversal and z offset should apply selectively based on type columns."""
        df = _make_df([
            {"span_index": 0, "lateral_distance_type": "span_axis", "altitude_type": "support_foot_relative", "x": 20.0, "y": 1.0, "z": 3.0},
            {"span_index": 0, "lateral_distance_type": "other", "altitude_type": "absolute", "x": 40.0, "y": 2.0, "z": 6.0},
            {"span_index": 0, "lateral_distance_type": "span_axis", "altitude_type": "absolute", "x": 60.0, "y": 3.0, "z": 9.0},
        ])
        engine = _make_balance_engine(span_lengths=[100.0], conductor_altitudes=[10.0])

        result = change_obstacles_coordinates(df, engine)

        # x: row0 reversed (100-20=80), row1 unchanged (40), row2 reversed (100-60=40)
        np.testing.assert_array_almost_equal(result["x"].values, [80.0, 40.0, 40.0])
        # z: row0 offset (3+10=13), row1 unchanged (6), row2 unchanged (9)
        np.testing.assert_array_almost_equal(result["z"].values, [13.0, 6.0, 9.0])

    def test_y_column_is_not_modified(self):
        """y values should never be modified."""
        df = _make_df([
            {"span_index": 0, "lateral_distance_type": "span_axis", "altitude_type": "support_foot_relative", "x": 10.0, "y": 42.0, "z": 5.0},
        ])
        engine = _make_balance_engine(span_lengths=[100.0], conductor_altitudes=[2.0])

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["y"].values, [42.0])

    def test_does_not_raise_on_read_only_array(self):
        """Regression: to_numpy() can return a read-only view — ensure no ValueError."""
        df = _make_df([
            {"span_index": 0, "lateral_distance_type": "span_axis", "altitude_type": "support_foot_relative", "x": 25.0, "y": 0.0, "z": 8.0},
        ])
        # Make the underlying numpy arrays read-only to reproduce the bug
        df["x"].values.flags.writeable = False
        df["z"].values.flags.writeable = False

        engine = _make_balance_engine(span_lengths=[100.0], conductor_altitudes=[4.0])

        # Should not raise ValueError: assignment destination is read-only
        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["x"].values, [75.0])
        np.testing.assert_array_almost_equal(result["z"].values, [12.0])

    def test_returns_dataframe(self):
        """The function should return a DataFrame."""
        df = _make_df([
            {"span_index": 0, "lateral_distance_type": "span_axis", "altitude_type": "absolute", "x": 10.0, "y": 0.0, "z": 5.0},
        ])
        engine = _make_balance_engine(span_lengths=[100.0], conductor_altitudes=[1.0])

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
    engine.section_array.data.conductor_attachment_altitude = np.array(conductor_altitude)
    return engine


class TestChangeObstaclesCoordinates:
    """Tests for change_obstacles_coordinates."""

    def _make_df(self, rows):
        return pd.DataFrame(rows)

    def test_reverses_x_for_span_axis(self):
        df = self._make_df([
            {"span_index": 0, "lateral_distance_type": "span_axis", "altitude_type": "absolute", "x": 30.0, "y": 0.0, "z": 10.0},
        ])
        engine = _make_balance_engine(span_length=[100.0], conductor_altitude=[5.0])

        result = change_obstacles_coordinates(df, engine)

        assert result["x"].iloc[0] == pytest.approx(70.0)

    def test_does_not_reverse_x_for_non_span_axis(self):
        df = self._make_df([
            {"span_index": 0, "lateral_distance_type": "other", "altitude_type": "absolute", "x": 30.0, "y": 0.0, "z": 10.0},
        ])
        engine = _make_balance_engine(span_length=[100.0], conductor_altitude=[5.0])

        result = change_obstacles_coordinates(df, engine)

        assert result["x"].iloc[0] == pytest.approx(30.0)

    def test_adds_altitude_for_support_foot_relative(self):
        df = self._make_df([
            {"span_index": 1, "lateral_distance_type": "other", "altitude_type": "support_foot_relative", "x": 10.0, "y": 0.0, "z": 5.0},
        ])
        engine = _make_balance_engine(span_length=[100.0, 200.0], conductor_altitude=[3.0, 7.0])

        result = change_obstacles_coordinates(df, engine)

        assert result["z"].iloc[0] == pytest.approx(12.0)

    def test_does_not_add_altitude_for_absolute(self):
        df = self._make_df([
            {"span_index": 0, "lateral_distance_type": "other", "altitude_type": "absolute", "x": 10.0, "y": 0.0, "z": 5.0},
        ])
        engine = _make_balance_engine(span_length=[100.0], conductor_altitude=[3.0])

        result = change_obstacles_coordinates(df, engine)

        assert result["z"].iloc[0] == pytest.approx(5.0)

    def test_combined_x_reversal_and_z_offset(self):
        df = self._make_df([
            {"span_index": 0, "lateral_distance_type": "span_axis", "altitude_type": "support_foot_relative", "x": 20.0, "y": 5.0, "z": 8.0},
        ])
        engine = _make_balance_engine(span_length=[150.0], conductor_altitude=[10.0])

        result = change_obstacles_coordinates(df, engine)

        assert result["x"].iloc[0] == pytest.approx(130.0)
        assert result["z"].iloc[0] == pytest.approx(18.0)
        assert result["y"].iloc[0] == pytest.approx(5.0)

    def test_multiple_rows_mixed(self):
        df = self._make_df([
            {"span_index": 0, "lateral_distance_type": "span_axis", "altitude_type": "absolute", "x": 10.0, "y": 0.0, "z": 5.0},
            {"span_index": 0, "lateral_distance_type": "other", "altitude_type": "support_foot_relative", "x": 40.0, "y": 1.0, "z": 3.0},
            {"span_index": 0, "lateral_distance_type": "span_axis", "altitude_type": "support_foot_relative", "x": 60.0, "y": 2.0, "z": 7.0},
        ])
        engine = _make_balance_engine(span_length=[200.0], conductor_altitude=[10.0])

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["x"].values, [190.0, 40.0, 140.0])
        np.testing.assert_array_almost_equal(result["z"].values, [5.0, 13.0, 17.0])

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

        df = pd.DataFrame({
            "span_index": [0, 0],
            "lateral_distance_type": ["span_axis", "span_axis"],
            "altitude_type": ["support_foot_relative", "absolute"],
            "x": x,
            "y": [0.0, 0.0],
            "z": z,
        })
        engine = _make_balance_engine(span_length=[100.0], conductor_altitude=[10.0])

        result = change_obstacles_coordinates(df, engine)

        np.testing.assert_array_almost_equal(result["x"].values, [70.0, 40.0])
        np.testing.assert_array_almost_equal(result["z"].values, [15.0, 8.0])
