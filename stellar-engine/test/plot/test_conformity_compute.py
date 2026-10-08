# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import pytest

from stellar_engine.core.conformity.compute import (
    ConformityPlotRules,
    ConformityTableResult,
    Point2D,
)
from stellar_engine.core.conformity.scenarios import TargetState
from stellar_engine.entities.conformity import TensionRules


def _plot_rules(conformity_plot, lateral=1.0, overhang=1.5):
    return ConformityPlotRules(
        conformity_plot,
        tension_rules={"AT": TensionRules(lateral=lateral, overhang=overhang)},
    )


def _corners(zone_plot):
    return {
        name: corner
        for point in zone_plot.to_dict()["zonePoints"]
        for name, corner in point.items()
    }


# ============================================================================
# ZONE GEOMETRY
# ============================================================================


def test_vegetation_zone_border_is_four_vertex_polyline():
    zone = _plot_rules("vegetation").get_zone(
        [Point2D(0, 0), Point2D(4, 3)], rule_type="AT"
    )

    assert zone.zone_border == [
        {"x": -1.0, "y": 4.5},  # UpperLeft
        {"x": -1.0, "y": -1.5},  # LowerLeft
        {"x": 5.0, "y": -1.5},  # LowerRight
        {"x": 5.0, "y": 4.5},  # UpperRight
    ]
    assert list(_corners(zone)) == [
        "LowerLeft",
        "LowerRight",
        "UpperRight",
        "UpperLeft",
    ]


@pytest.mark.parametrize("lateral", [None, 1.0])
def test_overhang_zone_is_flat_rectangle_below_lowest_point(lateral):
    zone = _plot_rules("overhang", lateral=lateral).get_zone(
        [Point2D(0, 2), Point2D(4, 3)], rule_type="AT"
    )

    corners = _corners(zone)
    expected_y = 2 - 1.5
    assert corners["LowerLeft"]["y"] == expected_y
    assert corners["LowerRight"]["y"] == expected_y
    assert corners["UpperRight"]["y"] == expected_y
    assert corners["UpperLeft"]["y"] == expected_y
    assert zone.zone_border == [
        corners["LowerLeft"],
        corners["LowerRight"],
        corners["UpperRight"],
        corners["UpperLeft"],
    ]


@pytest.mark.parametrize("conformity_plot", ["vegetation", "overhang"])
def test_zero_width_zone_gets_minimum_width_centered_on_point(
    conformity_plot,
):
    zone = _plot_rules(conformity_plot, lateral=None).get_zone(
        [Point2D(2.0, 3.0)], rule_type="AT"
    )

    corners = _corners(zone)
    assert corners["UpperRight"]["x"] - corners["UpperLeft"]["x"] == 10
    assert corners["LowerLeft"]["x"] == pytest.approx(2.0 - 5)
    assert corners["LowerRight"]["x"] == pytest.approx(2.0 + 5)


def test_cable_track_zone_has_empty_border():
    zone = _plot_rules("cable_track").get_zone(
        [Point2D(0, 0), Point2D(4, 3)], rule_type="AT"
    )

    assert zone.zone_border == []


# ============================================================================
# COMPLIANCE
# ============================================================================


def _table(
    conformity_plot,
    overhang_point=(0.0, 10.0),
    lateral_side_points=((5.0, 10.0), (-5.0, 10.0)),
    lateral_d=1.0,
    overhang_d=1.5,
):
    return ConformityTableResult(
        conformity_plot=conformity_plot,
        obstacle_point=(0.0, 0.0),
        overhang_point=overhang_point,
        lateral_side_points=list(lateral_side_points),
        lateral_distance_to_comply=lateral_d,
        overhang_distance_to_comply=overhang_d,
    )


@pytest.mark.parametrize(
    ("lateral_d", "overhang_d", "expected"),
    [
        (1.0, 1.5, True),
        (100.0, 1.5, False),
        (1.0, 100.0, False),
        (100.0, 100.0, False),
    ],
)
def test_cable_track_compliance_false_when_any_side_negative(
    lateral_d, overhang_d, expected
):
    table = _table("cable_track", lateral_d=lateral_d, overhang_d=overhang_d)

    assert table.conformity_compliance_status is expected


@pytest.mark.parametrize(
    ("lateral_d", "overhang_d", "expected"),
    [
        (1.0, 1.5, True),
        (100.0, 1.5, True),
        (1.0, 100.0, True),
        (100.0, 100.0, False),
    ],
)
def test_vegetation_compliance_false_only_when_both_sides_negative(
    lateral_d, overhang_d, expected
):
    # Both lateral points on the same side: the obstacle is outside the U.
    table = _table(
        "vegetation",
        lateral_side_points=((5.0, 10.0), (3.0, 10.0)),
        lateral_d=lateral_d,
        overhang_d=overhang_d,
    )

    assert table.conformity_compliance_status is expected


@pytest.mark.parametrize(
    ("overhang_d", "expected"), [(1.5, True), (100.0, False)]
)
def test_vegetation_obstacle_between_lateral_points_is_inside_u(
    overhang_d, expected
):
    table = _table("vegetation", overhang_d=overhang_d)

    assert table.lateral_compliance_line_axis_distance > 0
    assert table.conformity_compliance_status is expected


@pytest.mark.parametrize(
    ("lateral_d", "overhang_d", "expected"),
    [(100.0, 1.5, True), (1.0, 100.0, False)],
)
def test_overhang_compliance_ignores_lateral_side_points(
    lateral_d, overhang_d, expected
):
    table = _table("overhang", lateral_d=lateral_d, overhang_d=overhang_d)

    assert table.lateral_compliance_line_axis_distance is None
    assert table.conformity_compliance_status is expected


@pytest.mark.parametrize("conformity_plot", ["cable_track", "vegetation"])
def test_compliance_value_of_zero_is_compliant(conformity_plot):
    table = _table(
        conformity_plot,
        lateral_side_points=[(5.0, 0.0)],
        lateral_d=5.0,
        overhang_d=10.0,
    )

    assert table.overhang_compliance_altitude == pytest.approx(0.0)
    assert table.lateral_compliance_line_axis_distance == pytest.approx(0.0)
    assert table.conformity_compliance_status is True


def test_compliance_none_without_point():
    assert ConformityTableResult().conformity_compliance_status is None


# ============================================================================
# CLOSEST POINT: TEMPERATURE, WIND PRESSURE, MINIMAL DISTANCE
# ============================================================================

# (conformity_point, projected point, temperature, wind pressure); obstacle at (0, 0)
SCENARIO_POINTS = [
    ("lateral", (6.0, 8.0), 17.0, 200.0),  # distance 10
    ("lateral_inverse", (-3.0, 4.0), 18.0, -200.0),  # distance 5
    ("intermediate", (0.0, 7.0), 19.0, 50.0),  # distance 7
    ("overhang", (0.0, 2.0), 70.0, 0.0),  # distance 2
    ("overhang", (0.0, 3.0), 71.0, 10.0),  # distance 3
]


def _fill_closest_points(scenario_points):
    table = ConformityTableResult(obstacle_point=(0.0, 0.0))
    for conformity_point, point, temperature, wind_pressure in scenario_points:
        table.set_closest_point(
            point,
            TargetState(
                new_temperature=temperature, wind_pressure=wind_pressure
            ),
            conformity_point,
        )
    return table


@pytest.mark.parametrize(
    "scenario_points",
    [SCENARIO_POINTS, SCENARIO_POINTS[::-1]],
    ids=["forward", "reversed"],
)
def test_lateral_values_come_from_closest_lateral_side_point(scenario_points):
    table = _fill_closest_points(scenario_points)

    assert table.lateral_minimal_distance == pytest.approx(5.0)
    assert table.lateral_temperature == 18.0
    assert table.lateral_wind_pressure == -200.0


@pytest.mark.parametrize(
    "scenario_points",
    [SCENARIO_POINTS, SCENARIO_POINTS[::-1]],
    ids=["forward", "reversed"],
)
def test_overhang_values_come_from_closest_overhang_point(scenario_points):
    table = _fill_closest_points(scenario_points)

    assert table.overhang_minimal_distance == pytest.approx(2.0)
    assert table.overhang_temperature == 70.0
    assert table.overhang_wind_pressure == 0.0


def test_minimal_distance_is_euclidean_distance_to_obstacle():
    table = ConformityTableResult(obstacle_point=(1.0, 1.0))
    table.set_closest_point((4.0, 5.0), TargetState(17.0, 200.0), "lateral")
    table.set_closest_point((1.0, -2.0), TargetState(70.0, 0.0), "overhang")

    assert table.lateral_minimal_distance == pytest.approx(5.0)
    assert table.overhang_minimal_distance == pytest.approx(3.0)


@pytest.mark.parametrize(
    "conformity_point", ["lateral", "lateral_inverse", "intermediate"]
)
def test_lateral_side_point_does_not_fill_overhang_values(conformity_point):
    table = _fill_closest_points([(conformity_point, (3.0, 4.0), 17.0, 200.0)])

    assert table.lateral_minimal_distance == pytest.approx(5.0)
    assert table.overhang_minimal_distance is None
    assert table.overhang_temperature is None
    assert table.overhang_wind_pressure is None


def test_overhang_point_does_not_fill_lateral_values():
    table = _fill_closest_points([("overhang", (3.0, 4.0), 70.0, 0.0)])

    assert table.overhang_minimal_distance == pytest.approx(5.0)
    assert table.lateral_minimal_distance is None
    assert table.lateral_temperature is None
    assert table.lateral_wind_pressure is None


@pytest.mark.parametrize(
    ("conformity_point", "altitude_field", "axis_distance_field"),
    [
        (
            "lateral",
            "lateral_cable_altitude",
            "lateral_cable_line_axis_distance",
        ),
        (
            "overhang",
            "overhang_cable_altitude",
            "overhang_cable_line_axis_distance",
        ),
    ],
)
def test_table_result_uses_point_coordinates_for_cable_values(
    conformity_point, altitude_field, axis_distance_field
):
    table = ConformityTableResult()
    table.set_projected_point((12.0, 7.5), conformity_point)

    assert getattr(table, altitude_field) == pytest.approx(7.5)
    assert getattr(table, axis_distance_field) == pytest.approx(12.0)


@pytest.mark.parametrize("other_point", ["lateral_inverse", "intermediate"])
def test_table_result_lateral_values_ignore_other_lateral_scenarios(
    other_point,
):
    table = ConformityTableResult()
    table.set_projected_point((12.0, 7.5), "lateral")
    table.set_projected_point((-20.0, 3.0), other_point)

    assert table.lateral_cable_altitude == pytest.approx(7.5)
    assert table.lateral_cable_line_axis_distance == pytest.approx(12.0)


@pytest.mark.parametrize(
    ("conformity_point", "field_name"),
    [
        ("lateral", "lateral_distance_to_comply"),
        ("overhang", "overhang_distance_to_comply"),
    ],
)
def test_table_result_uses_security_distance_for_distance_to_comply(
    conformity_point, field_name
):
    table = ConformityTableResult()
    table.set_rule_distances(4.25, conformity_point)

    assert getattr(table, field_name) == pytest.approx(4.25)


def test_get_radius_raises_on_unknown_plot_type():
    with pytest.raises(ValueError):
        _plot_rules("unknown").get_radius(1.0)
