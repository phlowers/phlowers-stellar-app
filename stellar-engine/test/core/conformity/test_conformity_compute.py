# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import dataclasses

import pytest

from stellar_engine.core.conformity.compute import ConformityTableResult
from stellar_engine.core.conformity.plot_data import Point2D
from stellar_engine.core.conformity.runner import ScenarioOutcome
from stellar_engine.core.conformity.scenarios import Scenario, TargetState
from stellar_engine.core.conformity.strategies import get_strategy
from stellar_engine.entities.conformity import (
    ConformityPlot,
    ScenarioPoint,
    TensionRules,
)


def _zone(conformity_plot, points, lateral=1.0, overhang=1.5):
    return get_strategy(conformity_plot).zone(
        points, TensionRules(lateral=lateral, overhang=overhang)
    )


def _outcome(
    conformity_point, xy, temperature=17.0, wind=200.0, distance=1.0
):
    return ScenarioOutcome(
        Scenario(
            rule_type="AT",
            conformity_plot=ConformityPlot.VEGETATION,
            conformity_point=ScenarioPoint(conformity_point),
            security_distance=distance,
            target_state=TargetState(
                new_temperature=temperature, wind_pressure=wind
            ),
        ),
        Point2D(*xy),
    )


def _from_outcomes(outcomes, conformity_plot="vegetation", obstacle=(0.0, 0.0)):
    return ConformityTableResult.from_outcomes(
        outcomes, Point2D(*obstacle), get_strategy(conformity_plot)
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
    zone = _zone("vegetation", [Point2D(0, 0), Point2D(4, 3)])

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
    zone = _zone(
        "overhang", [Point2D(0, 2), Point2D(4, 3)], lateral=lateral
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
    zone = _zone(conformity_plot, [Point2D(2.0, 3.0)], lateral=None)

    corners = _corners(zone)
    assert corners["UpperRight"]["x"] - corners["UpperLeft"]["x"] == 10
    assert corners["LowerLeft"]["x"] == pytest.approx(2.0 - 5)
    assert corners["LowerRight"]["x"] == pytest.approx(2.0 + 5)


def test_zero_width_zone_uses_given_width():
    zone = get_strategy("overhang").zone(
        [Point2D(2.0, 3.0)], TensionRules(lateral=None, overhang=1.5), 4.0
    )

    corners = _corners(zone)
    assert corners["LowerLeft"]["x"] == pytest.approx(0.0)
    assert corners["LowerRight"]["x"] == pytest.approx(4.0)


def test_cable_track_has_no_zone():
    zone = _zone("cable_track", [Point2D(0, 0), Point2D(4, 3)])

    assert zone.to_dict() == {"zonePoints": [], "zoneBorder": []}


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
    first_side, *other_sides = lateral_side_points
    outcomes = [
        _outcome("lateral", first_side, distance=lateral_d),
        *(
            _outcome("lateral_inverse", xy, distance=lateral_d)
            for xy in other_sides
        ),
        _outcome("overhang", overhang_point, distance=overhang_d),
    ]
    return _from_outcomes(outcomes, conformity_plot)


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


def test_overhang_obstacle_above_cable_is_not_compliant():
    table = _table("overhang", overhang_point=(0.0, -5.0))

    assert table.overhang_compliance_altitude == pytest.approx(-6.5)
    assert table.conformity_compliance_status is False


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
    table = _from_outcomes([])

    assert all(value is None for value in dataclasses.asdict(table).values())


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
    return _from_outcomes(
        [
            _outcome(conformity_point, point, temperature, wind_pressure)
            for conformity_point, point, temperature, wind_pressure in scenario_points
        ]
    )


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
    table = _from_outcomes(
        [
            _outcome("lateral", (4.0, 5.0), 17.0, 200.0),
            _outcome("overhang", (1.0, -2.0), 70.0, 0.0),
        ],
        obstacle=(1.0, 1.0),
    )

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
    table = _from_outcomes([_outcome(conformity_point, (12.0, 7.5))])

    assert getattr(table, altitude_field) == pytest.approx(7.5)
    assert getattr(table, axis_distance_field) == pytest.approx(12.0)


@pytest.mark.parametrize("other_point", ["lateral_inverse", "intermediate"])
def test_table_result_lateral_values_ignore_other_lateral_scenarios(
    other_point,
):
    table = _from_outcomes(
        [
            _outcome("lateral", (12.0, 7.5)),
            _outcome(other_point, (-20.0, 3.0)),
        ]
    )

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
    table = _from_outcomes(
        [_outcome(conformity_point, (0.0, 0.0), distance=4.25)]
    )

    assert getattr(table, field_name) == pytest.approx(4.25)


def test_get_strategy_raises_on_unknown_plot_type():
    with pytest.raises(ValueError):
        get_strategy("unknown")


@pytest.mark.parametrize(
    ("conformity_plot", "expected"),
    [("cable_track", 2.5), ("vegetation", 1.0), ("overhang", 1.0)],
)
def test_radius_per_plot(conformity_plot, expected):
    assert get_strategy(conformity_plot).radius(2.5) == expected
