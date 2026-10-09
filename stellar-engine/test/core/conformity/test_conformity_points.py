# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Conformity points, radius and zone structure of the result dictionary."""

import pytest

LATERAL_D = 2.5
OVERHANG_D = 3.5


@pytest.mark.parametrize(
    "rule_types",
    [
        pytest.param(["AT"], id="one-rule"),
        pytest.param(["AT", "CCG-LA"], id="two-rules"),
        pytest.param(["CCG-LA", "ENV-NRM", "AT"], id="three-rules-reordered"),
    ],
)
def test_one_entry_per_rule_in_rules_distances_order(
    run_conformity,
    make_python_inputs,
    make_form,
    make_rule,
    make_distances,
    rule_types,
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(intermediatePoints=[0.33, 0.66]),
        [make_rule(rule_type) for rule_type in rule_types],
        [make_distances(rule_type) for rule_type in rule_types],
    )

    result_dict = run_conformity(python_inputs)

    assert list(result_dict["conformity"]) == rule_types
    assert list(result_dict["results"]) == rule_types


@pytest.mark.parametrize(
    ("obstacle_type", "conformity_plot", "lateral"),
    [
        pytest.param("vegetation", "vegetation", LATERAL_D, id="vegetation"),
        pytest.param("traffic_lane", "overhang", None, id="overhang"),
    ],
)
def test_box_plots_use_the_default_radius(
    run_conformity,
    make_python_inputs,
    make_form,
    make_rule,
    make_distances,
    obstacle_type,
    conformity_plot,
    lateral,
):
    python_inputs = make_python_inputs(
        obstacle_type,
        make_form(conformityPlot=conformity_plot, intermediatePoints=[]),
        [make_rule("AT")],
        [
            make_distances(
                "AT",
                lateral=None if lateral is None else {"400": lateral},
                overhang={"400": OVERHANG_D},
            )
        ],
    )

    points = run_conformity(python_inputs)["conformity"]["AT"]["points"]

    assert points
    assert {point["radius"] for point in points} == {1.0}


def test_cable_track_radius_is_the_security_distance_of_each_scenario(
    run_conformity,
    build_scenarios,
    make_python_inputs,
    make_form,
    make_rule,
    make_distances,
):
    form = make_form(conformityPlot="cable_track", intermediatePoints=[0.5])
    rules = [make_rule("AT")]
    distances = [
        make_distances(
            "AT", lateral={"400": LATERAL_D}, overhang={"400": OVERHANG_D}
        )
    ]
    python_inputs = make_python_inputs(
        "accessible_building", form, rules, distances
    )

    points = run_conformity(python_inputs)["conformity"]["AT"]["points"]

    scenarios = build_scenarios(rules, form, distances)["AT"]
    assert [point["radius"] for point in points] == [
        scenario.security_distance for scenario in scenarios
    ]
    assert {point["radius"] for point in points} == {LATERAL_D, OVERHANG_D}


def test_points_have_coordinates_and_radius(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(intermediatePoints=[0.33, 0.66]),
        [make_rule("AT")],
        [make_distances("AT")],
    )

    points = run_conformity(python_inputs)["conformity"]["AT"]["points"]

    assert points
    for point in points:
        assert set(point) == {"x", "y", "radius"}
        assert all(isinstance(value, float) for value in point.values())


def test_cable_track_point_count_with_intermediate_points(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    # overhang (1) + lateral (2) + intermediate (2 per fraction)
    intermediate_points = [0.33, 0.66]
    python_inputs = make_python_inputs(
        "accessible_building",
        make_form(
            conformityPlot="cable_track",
            intermediatePoints=intermediate_points,
        ),
        [make_rule("AT")],
        [make_distances("AT")],
    )

    points = run_conformity(python_inputs)["conformity"]["AT"]["points"]

    assert len(points) == 1 + 2 + 2 * len(intermediate_points)


def test_non_cable_track_plots_ignore_intermediate_points(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(intermediatePoints=[0.25, 0.5, 0.75]),
        [make_rule("AT")],
        [make_distances("AT")],
    )

    points = run_conformity(python_inputs)["conformity"]["AT"]["points"]

    assert len(points) == 3  # 1 overhang + 2 lateral


def test_overhang_zone_is_a_flat_polyline(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "traffic_lane",
        make_form(conformityPlot="overhang", intermediatePoints=[]),
        [make_rule("AT")],
        [make_distances("AT", lateral=None)],
    )

    zone_plot = run_conformity(python_inputs)["conformity"]["AT"]["zonePlot"]

    assert len(zone_plot["zonePoints"]) == 4
    zone_border = zone_plot["zoneBorder"]
    assert len(zone_border) == 4
    assert len({vertex["y"] for vertex in zone_border}) == 1
    xs = [vertex["x"] for vertex in zone_border]
    # A zero-width zone gets a minimum width of 10.
    assert max(xs) - min(xs) == pytest.approx(10)


def test_vegetation_zone_is_a_u_shaped_polyline(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(intermediatePoints=[]),
        [make_rule("AT")],
        [make_distances("AT")],
    )

    zone_plot = run_conformity(python_inputs)["conformity"]["AT"]["zonePlot"]

    corners = {
        name: xy
        for corner in zone_plot["zonePoints"]
        for name, xy in corner.items()
    }
    assert list(corners) == [
        "LowerLeft",
        "LowerRight",
        "UpperRight",
        "UpperLeft",
    ]
    assert zone_plot["zoneBorder"] == [
        corners[name]
        for name in ("UpperLeft", "LowerLeft", "LowerRight", "UpperRight")
    ]


def test_cable_track_has_no_zone_plot(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "accessible_building",
        make_form(conformityPlot="cable_track", intermediatePoints=[0.5]),
        [make_rule("AT")],
        [make_distances("AT")],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict["conformity"]["AT"]["zonePlot"] == {
        "zonePoints": [],
        "zoneBorder": [],
    }


@pytest.mark.parametrize(
    ("obstacle_type", "conformity_plot", "lateral"),
    [
        pytest.param("vegetation", "vegetation", "default", id="vegetation"),
        pytest.param("traffic_lane", "overhang", None, id="overhang"),
        pytest.param(
            "accessible_building", "cable_track", "default", id="cable_track"
        ),
    ],
)
def test_conformity_compliance_is_boolean(
    run_conformity,
    make_python_inputs,
    make_form,
    make_rule,
    make_distances,
    obstacle_type,
    conformity_plot,
    lateral,
):
    distances = (
        make_distances("AT", lateral=None)
        if lateral is None
        else make_distances("AT")
    )
    python_inputs = make_python_inputs(
        obstacle_type,
        make_form(
            conformityPlot=conformity_plot, intermediatePoints=[0.33, 0.66]
        ),
        [make_rule("AT")],
        [distances],
    )

    result_dict = run_conformity(python_inputs)

    assert isinstance(
        result_dict["results"]["AT"]["conformityCompliance"], bool
    )


def test_rule_without_climatic_condition_has_empty_result(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(),
        [make_rule("AT")],
        [make_distances("AT"), make_distances("NO_CONDITION")],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict["conformity"]["NO_CONDITION"]["points"] == []
    assert all(
        value is None
        for value in result_dict["results"]["NO_CONDITION"].values()
    )


def test_table_results_match_lateral_and_overhang_points_of_each_rule(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(intermediatePoints=[]),
        [
            make_rule("AT"),
            make_rule("RULE_2", lateral_temp=40, overhang_temp=50),
        ],
        [
            make_distances("AT"),
            make_distances(
                "RULE_2", lateral={"400": 2.5}, overhang={"400": 3.5}
            ),
        ],
    )

    result_dict = run_conformity(python_inputs)

    expected_distances = {"AT": (1.0, 1.5), "RULE_2": (2.5, 3.5)}
    for rule_type, (lateral_d, overhang_d) in expected_distances.items():
        # Scenario order without intermediate points:
        # lateral, lateral_inverse, overhang.
        lateral, lateral_inverse, overhang = result_dict["conformity"][
            rule_type
        ]["points"]
        table = result_dict["results"][rule_type]

        # Otherwise the test could not tell lateral from lateral_inverse.
        assert lateral["x"] != pytest.approx(lateral_inverse["x"])

        assert table["lateralCableAltitude"] == pytest.approx(lateral["y"])
        assert table["lateralCableLineAxisDistance"] == pytest.approx(
            lateral["x"]
        )
        assert table["overhangCableAltitude"] == pytest.approx(overhang["y"])
        assert table["overhangCableLineAxisDistance"] == pytest.approx(
            overhang["x"]
        )
        assert table["lateralDistanceToComply"] == pytest.approx(lateral_d)
        assert table["overhangDistanceToComply"] == pytest.approx(overhang_d)
