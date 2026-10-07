# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from types import SimpleNamespace

import pytest

from stellar_engine.core.conformity.compute import (
    ConformityPlotRules,
    ConformityTableResult,
    Point2D,
)
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


def _distance(u=2.0, v=2.0):
    return SimpleNamespace(distance_projection_u=u, distance_projection_v=v)


def test_compliance_true_when_all_scenarios_comply():
    table = ConformityTableResult()
    table.add_scenario_compliance(_distance(u=2.0), "lateral", 1.0)
    table.add_scenario_compliance(_distance(u=2.0), "lateral_inverse", 1.0)
    table.add_scenario_compliance(_distance(v=2.0), "overhang", 1.5)

    assert table.conformity_compliance_status is True


def test_compliance_false_when_lateral_inverse_does_not_comply():
    table = ConformityTableResult()
    table.add_scenario_compliance(_distance(u=2.0), "lateral", 1.0)
    table.add_scenario_compliance(_distance(u=0.5), "lateral_inverse", 1.0)
    table.add_scenario_compliance(_distance(v=2.0), "overhang", 1.5)

    assert table.conformity_compliance_status is False


def test_compliance_false_when_intermediate_does_not_comply():
    table = ConformityTableResult()
    table.add_scenario_compliance(_distance(u=2.0), "lateral", 1.0)
    table.add_scenario_compliance(_distance(u=0.5), "intermediate", 1.0)

    assert table.conformity_compliance_status is False


def test_compliance_true_for_overhang_only_rule():
    table = ConformityTableResult()
    table.add_scenario_compliance(_distance(v=2.0), "overhang", 1.5)

    assert table.conformity_compliance_status is True


def test_compliance_none_without_scenario():
    assert ConformityTableResult().conformity_compliance_status is None


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
