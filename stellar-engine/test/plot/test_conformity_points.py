# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Test conformity points generation system.

This module tests the point generation system which is mastered by the
ConformityResult object. It verifies that:
1. When N rules are tested, result_dict.conformity has N entries with keys = rule names
2. result_dict.results also has N entries with keys = rule names
3. The "radius" field corresponds to the security distance for every point
"""

import pytest

# ============================================================================
# RULE ENTRY GENERATION TESTS
# ============================================================================
# These tests verify that the conformity result dictionary contains entries
# for all rules that were tested, with rule names as keys.


def test_single_rule_generates_single_conformity_entry(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Test that 1 rule generates 1 entry in result_dict.conformity and result_dict.results.

    Rule: When N=1 rule is tested:
    - result_dict.conformity should have 1 entry with key = rule type
    - result_dict.results should have 1 entry with key = rule type
    """
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(conformityPlot="vegetation", intermediatePoints=[0.33, 0.66]),
        [make_rule("AT")],
        [make_distances("AT")],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict is not None, "Result dictionary should not be None"
    assert "conformity" in result_dict, "Result dictionary should have 'conformity' key"
    assert "results" in result_dict, "Result dictionary should have 'results' key"

    assert len(result_dict["conformity"]) == 1, (
        f"Expected 1 conformity entry, but got {len(result_dict['conformity'])}. "
        f"Keys: {list(result_dict['conformity'].keys())}"
    )
    assert len(result_dict["results"]) == 1, (
        f"Expected 1 results entry, but got {len(result_dict['results'])}. "
        f"Keys: {list(result_dict['results'].keys())}"
    )

    assert "AT" in result_dict["conformity"], (
        f"Expected 'AT' key in conformity, but got {list(result_dict['conformity'].keys())}"
    )
    assert "AT" in result_dict["results"], (
        f"Expected 'AT' key in results, but got {list(result_dict['results'].keys())}"
    )


def test_two_rules_generate_two_conformity_entries(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Test that 2 rules generate 2 entries in result_dict.conformity and result_dict.results.

    Rule: When N=2 rules are tested:
    - result_dict.conformity should have 2 entries with keys = rule types
    - result_dict.results should have 2 entries with keys = rule types
    """
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(conformityPlot="vegetation", intermediatePoints=[0.33, 0.66]),
        [
            make_rule("AT"),
            make_rule("CCG-LA", lateral_temp=68, lateral_red_zone=True),
        ],
        [make_distances("AT"), make_distances("CCG-LA")],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict is not None, "Result dictionary should not be None"

    assert len(result_dict["conformity"]) == 2, (
        f"Expected 2 conformity entries, but got {len(result_dict['conformity'])}. "
        f"Keys: {list(result_dict['conformity'].keys())}"
    )
    assert len(result_dict["results"]) == 2, (
        f"Expected 2 results entries, but got {len(result_dict['results'])}. "
        f"Keys: {list(result_dict['results'].keys())}"
    )

    conformity_keys = set(result_dict["conformity"].keys())
    results_keys = set(result_dict["results"].keys())
    expected_keys = {"AT", "CCG-LA"}

    assert conformity_keys == expected_keys, (
        f"Expected conformity keys {expected_keys}, but got {conformity_keys}"
    )
    assert results_keys == expected_keys, (
        f"Expected results keys {expected_keys}, but got {results_keys}"
    )


def test_three_rules_generate_three_conformity_entries(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Test that 3 rules generate 3 entries in result_dict.conformity and result_dict.results.

    Rule: When N=3 rules are tested:
    - result_dict.conformity should have 3 entries with keys = rule types
    - result_dict.results should have 3 entries with keys = rule types
    """
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(conformityPlot="vegetation", intermediatePoints=[0.33, 0.66]),
        [
            make_rule("AT"),
            make_rule("CCG-LA", lateral_temp=68, lateral_red_zone=True),
            make_rule("ENV-NRM", lateral_temp=15),
        ],
        [
            make_distances("AT"),
            make_distances("CCG-LA"),
            make_distances(
                "ENV-NRM",
                lateral={"63": 0.5, "90": 0.6, "150": 0.7, "225": 0.8, "400": 0.9},
                overhang={"63": 1.0, "90": 1.1, "150": 1.2, "225": 1.3, "400": 1.4},
            ),
        ],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict is not None, "Result dictionary should not be None"

    assert len(result_dict["conformity"]) == 3, (
        f"Expected 3 conformity entries, but got {len(result_dict['conformity'])}. "
        f"Keys: {list(result_dict['conformity'].keys())}"
    )
    assert len(result_dict["results"]) == 3, (
        f"Expected 3 results entries, but got {len(result_dict['results'])}. "
        f"Keys: {list(result_dict['results'].keys())}"
    )

    conformity_keys = set(result_dict["conformity"].keys())
    results_keys = set(result_dict["results"].keys())
    expected_keys = {"AT", "CCG-LA", "ENV-NRM"}

    assert conformity_keys == expected_keys, (
        f"Expected conformity keys {expected_keys}, but got {conformity_keys}"
    )
    assert results_keys == expected_keys, (
        f"Expected results keys {expected_keys}, but got {results_keys}"
    )


# ============================================================================
# RADIUS AND SECURITY DISTANCE TESTS
# ============================================================================
# These tests verify that the radius field in points corresponds to the
# security distance from the scenarios.


def test_radius_equals_security_distance_vegetation_plot(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Test that radius field equals security distance for vegetation conformity plot.

    Rule: For conformity_plot="vegetation", radius is used and should equal
    the security distance of the corresponding scenario (which is a constant value).

    For vegetation: get_radius() returns default_radius = 1.0
    """
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(conformityPlot="vegetation", intermediatePoints=[]),
        [make_rule("AT")],
        [make_distances("AT")],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"

    points = result_dict["conformity"]["AT"].get("points", [])

    assert len(points) > 0, (
        f"Expected points with radius values for vegetation conformity plot, "
        f"but got {len(points)} points"
    )

    for point in points:
        assert "radius" in point, f"Point should have 'radius' field: {point}"
        assert point["radius"] == 1.0, (
            f"Expected radius=1.0 for vegetation plot, but got {point['radius']}"
        )


def test_radius_equals_security_distance_cable_track_plot(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Test that radius field equals security distance for cable_track conformity plot.

    Rule: For conformity_plot="cable_track", radius = get_radius(security_distance)
    which is the security_distance itself.

    For cable_track: get_radius(x) returns x (the security distance)
    """
    python_inputs = make_python_inputs(
        "accessible_building",
        make_form(conformityPlot="cable_track", intermediatePoints=[]),
        [make_rule("AT")],
        [make_distances("AT")],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"

    points = result_dict["conformity"]["AT"].get("points", [])

    assert len(points) > 0, (
        "Expected points with radius values for cable_track conformity plot"
    )

    # Lateral points use the lateral distance, overhang points the overhang one.
    for point in points:
        assert "radius" in point, f"Point should have 'radius' field: {point}"
        assert isinstance(point["radius"], (int, float)), (
            f"Expected radius to be numeric, but got {type(point['radius'])}: {point['radius']}"
        )
        assert point["radius"] > 0, (
            f"Expected positive radius value, but got {point['radius']}"
        )


def test_radius_equals_security_distance_overhang_plot(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Test that radius field equals security distance for overhang conformity plot.

    Rule: For conformity_plot="overhang", radius is used and should equal
    the overhang security distance for all points.

    For overhang: get_radius() returns default_radius = 1.0
    """
    python_inputs = make_python_inputs(
        "traffic_lane",
        make_form(conformityPlot="overhang", intermediatePoints=[]),
        [make_rule("AT")],
        [make_distances("AT", lateral=None)],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"

    points = result_dict["conformity"]["AT"].get("points", [])

    assert len(points) > 0, (
        "Expected points with radius values for overhang conformity plot"
    )

    for point in points:
        assert "radius" in point, f"Point should have 'radius' field: {point}"
        assert point["radius"] == 1.0, (
            f"Expected radius=1.0 for overhang plot, but got {point['radius']}"
        )


def test_points_structure_has_coordinates_and_radius(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Test that each point in conformity has x, y coordinates and radius.

    Rule: Each point in result_dict.conformity[rule_type].points should have:
    - "x": float coordinate
    - "y": float coordinate
    - "radius": float security distance
    """
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(conformityPlot="vegetation", intermediatePoints=[0.33, 0.66]),
        [make_rule("AT")],
        [make_distances("AT")],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"

    points = result_dict["conformity"]["AT"].get("points", [])

    assert len(points) > 0, "Expected at least one point in conformity"

    for idx, point in enumerate(points):
        assert isinstance(point, dict), (
            f"Point {idx} should be a dictionary, but got {type(point)}"
        )
        assert "x" in point, f"Point {idx} should have 'x' coordinate: {point}"
        assert "y" in point, f"Point {idx} should have 'y' coordinate: {point}"
        assert "radius" in point, f"Point {idx} should have 'radius': {point}"

        assert isinstance(point["x"], (int, float)), (
            f"Point {idx} x coordinate should be numeric, got {type(point['x'])}"
        )
        assert isinstance(point["y"], (int, float)), (
            f"Point {idx} y coordinate should be numeric, got {type(point['y'])}"
        )
        assert isinstance(point["radius"], (int, float)), (
            f"Point {idx} radius should be numeric, got {type(point['radius'])}"
        )


def test_multiple_rules_have_independent_points(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Test that different rules can have different numbers of points and radii.

    Rule: Each rule should independently generate points based on its scenarios
    and conformity plot settings. Points from different rules should not interfere.
    """
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(conformityPlot="vegetation", intermediatePoints=[0.33, 0.66]),
        [
            make_rule("AT"),
            make_rule("CCG-LA", lateral_temp=68, lateral_red_zone=True),
        ],
        [make_distances("AT"), make_distances("CCG-LA")],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict is not None, "Result dictionary should not be None"

    assert "AT" in result_dict["conformity"], "Result should have AT rule"
    assert "CCG-LA" in result_dict["conformity"], "Result should have CCG-LA rule"

    at_points = result_dict["conformity"]["AT"].get("points", [])
    ccg_la_points = result_dict["conformity"]["CCG-LA"].get("points", [])

    assert len(at_points) > 0, "AT rule should have points"
    assert len(ccg_la_points) > 0, "CCG-LA rule should have points"

    for at_point in at_points:
        assert at_point["radius"] == 1.0, (
            f"AT point should have radius=1.0, got {at_point['radius']}"
        )

    for ccg_la_point in ccg_la_points:
        assert ccg_la_point["radius"] == 1.0, (
            f"CCG-LA point should have radius=1.0, got {ccg_la_point['radius']}"
        )


# ============================================================================
# CONFORMITY PLOT TYPE RULES TESTS
# ============================================================================
# These tests verify the new rules for point counts and zonePlot structure
# based on conformity plot type (cable_track, vegetation, overhang).


def test_cable_track_point_count_with_intermediate_points(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Test that cable_track conformity plot generates correct number of points.

    Rule: For conformity_plot="cable_track":
    - conformity.points = overhang (1) + lateral (2) + intermediate (2N)
    - where N = length of inputs.form.intermediatePoints

    With intermediatePoints = [0.33, 0.66], total = 1 + 2 + 4 = 7 points
    """
    intermediate_points = [0.33, 0.66]
    expected_point_count = 1 + 2 + 2 * len(intermediate_points)  # 7 points

    python_inputs = make_python_inputs(
        "accessible_building",
        make_form(
            conformityPlot="cable_track", intermediatePoints=intermediate_points
        ),
        [make_rule("AT")],
        [make_distances("AT")],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"

    points = result_dict["conformity"]["AT"].get("points", [])

    assert len(points) == expected_point_count, (
        f"For cable_track with {len(intermediate_points)} intermediate points, "
        f"expected {expected_point_count} points (1 overhang + 2 lateral + {2 * len(intermediate_points)} intermediate), "
        f"but got {len(points)} points"
    )


def test_non_cable_track_point_count_without_intermediate_points(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Test that non-cable_track conformity plots generate correct number of points.

    Rule: For conformity_plot != "cable_track":
    - conformity.points = overhang (1) + lateral (2)
    - intermediatePoints are ignored
    - Total = 3 points
    """
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(
            conformityPlot="vegetation", intermediatePoints=[0.25, 0.5, 0.75]
        ),
        [make_rule("AT")],
        [make_distances("AT")],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"

    points = result_dict["conformity"]["AT"].get("points", [])

    expected_point_count = 3  # 1 overhang + 2 lateral
    assert len(points) == expected_point_count, (
        f"For vegetation conformity plot (non-cable_track), "
        f"expected {expected_point_count} points (1 overhang + 2 lateral), "
        f"but got {len(points)} points. "
        f"IntermediatePoints should be ignored for non-cable_track plots."
    )


def test_overhang_conformity_plot_zone_structure(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Test that overhang conformity plot has correct zonePlot structure.

    Rule: For conformity_plot="overhang":
    - zonePlot should have 4 points (LowerLeft, LowerRight, UpperRight, UpperLeft)
    - All corners share the same y coordinate (flat rectangle: lower_y == upper_y)
    - zoneBorder is a 4-vertex polyline: LowerLeft -> LowerRight -> UpperRight -> UpperLeft
    - A zero-width zone gets a minimum width of 10
    """
    python_inputs = make_python_inputs(
        "traffic_lane",
        make_form(conformityPlot="overhang", intermediatePoints=[]),
        [make_rule("AT")],
        [make_distances("AT", lateral=None)],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"

    zone_plot = result_dict["conformity"]["AT"].get("zonePlot", {})
    zone_points = zone_plot.get("zonePoints", [])
    zone_border = zone_plot.get("zoneBorder", [])

    assert len(zone_points) == 4, (
        f"For overhang conformity plot, zonePlot should have 4 points, "
        f"but got {len(zone_points)}: {[p for p in zone_points]}"
    )

    assert len(zone_border) == 4, (
        f"For overhang conformity plot, zoneBorder should have 4 vertices, "
        f"but got {len(zone_border)}: {zone_border}"
    )
    assert len({vertex["y"] for vertex in zone_border}) == 1, (
        f"Overhang zone border should be flat: {zone_border}"
    )
    xs = [vertex["x"] for vertex in zone_border]
    assert max(xs) - min(xs) == pytest.approx(10)


def test_vegetation_conformity_plot_zone_structure(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Test that vegetation conformity plot has correct zonePlot structure.

    Rule: For conformity_plot="vegetation":
    - zonePlot should have 4 different points (rectangle)
    - zoneBorder should be a 4-vertex polyline:
      UpperLeft -> LowerLeft -> LowerRight -> UpperRight
    """
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(conformityPlot="vegetation", intermediatePoints=[]),
        [make_rule("AT")],
        [make_distances("AT")],
    )

    result_dict = run_conformity(python_inputs)

    assert result_dict is not None, "Result dictionary should not be None"
    assert "AT" in result_dict["conformity"], "Result should have AT rule"

    zone_plot = result_dict["conformity"]["AT"].get("zonePlot", {})
    zone_points = zone_plot.get("zonePoints", [])
    zone_border = zone_plot.get("zoneBorder", [])

    assert len(zone_points) == 4, (
        f"For vegetation conformity plot, zonePlot should have 4 points, "
        f"but got {len(zone_points)}: {[p for p in zone_points]}"
    )

    zone_coords = [
        (
            p.get("LowerLeft")
            or p.get("LowerRight")
            or p.get("UpperRight")
            or p.get("UpperLeft")
        )
        for p in zone_points
    ]
    assert len(zone_coords) == 4, "Zone should have 4 distinct corner points"

    assert len(zone_border) == 4, (
        f"For vegetation conformity plot, zoneBorder should have 4 vertices, "
        f"but got {len(zone_border)}: {zone_border}"
    )

    for idx, segment in enumerate(zone_border):
        assert isinstance(segment, dict), (
            f"Zone border segment {idx} should be a dict, but got {type(segment)}"
        )
        assert "x" in segment and "y" in segment, (
            f"Zone border segment {idx} should have 'x' and 'y': {segment}"
        )


@pytest.mark.parametrize(
    "obstacle_type,conformity_plot,lateral",
    [
        ("vegetation", "vegetation", "default"),
        ("traffic_lane", "overhang", None),
        ("accessible_building", "cable_track", "default"),
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
    """conformityCompliance is judged on all scenarios and is a bool for every plot type."""
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

    assert isinstance(result_dict["results"]["AT"]["conformityCompliance"], bool)


def test_table_results_match_lateral_and_overhang_points_of_each_rule(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    """Table values come from the rule's own lateral and overhang points."""
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(conformityPlot="vegetation", intermediatePoints=[]),
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
