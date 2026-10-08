# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Conformity table rules per conformity plot type.

Table columns:
- overhang column: only ``overhangComplianceAltitude`` is filled.
- lateral column: only ``lateralComplianceLineAxisDistance`` is filled.

"Lateral points" are the lateral, lateral_inverse and intermediate scenario
points. Without intermediate points, the conformity points are ordered as
lateral, lateral_inverse, overhang, then intermediate points.
"""

import math

import pytest

from stellar_engine.core.conformity.scenarios import LATERAL_SIDE_POINTS

LATERAL_D = 1.0
OVERHANG_D = 1.5
TINY_D = 0.01
HUGE_D = 100.0

OBSTACLE_TYPES = {
    "cable_track": "accessible_building",
    "vegetation": "vegetation",
    "overhang": "traffic_lane",
}

OBSTACLE_POSITIONS = [
    pytest.param({"x": 10, "y": 5, "z": 65}, id="above-cable"),
    pytest.param({"x": 10, "y": 20, "z": 30}, id="below-cable-side"),
    # Closest lateral point to this obstacle is an intermediate one.
    pytest.param({"x": 10, "y": 10, "z": 30}, id="below-cable-axis"),
]


@pytest.fixture
def compute_conformity(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    def _compute(
        conformity_plot,
        lateral_d=LATERAL_D,
        overhang_d=OVERHANG_D,
        intermediate_points=(),
        obstacle_position=None,
    ):
        python_inputs = make_python_inputs(
            OBSTACLE_TYPES[conformity_plot],
            make_form(
                conformityPlot=conformity_plot,
                intermediatePoints=list(intermediate_points),
            ),
            [make_rule("AT")],
            [
                make_distances(
                    "AT",
                    lateral=None if lateral_d is None else {"400": lateral_d},
                    overhang={"400": overhang_d},
                )
            ],
            obstacle_position=obstacle_position,
        )
        result_dict = run_conformity(python_inputs)
        obstacle = result_dict["obstacle"]["points"][0]
        points = result_dict["conformity"]["AT"]["points"]
        if lateral_d is None:
            lateral_points, overhang = [], points[0]
        else:
            lateral, lateral_inverse, overhang, *intermediate = points
            lateral_points = [lateral, lateral_inverse, *intermediate]
        return obstacle, overhang, lateral_points, result_dict["results"]["AT"]

    return _compute


@pytest.fixture
def compute_scenario_points(
    run_conformity,
    build_scenarios,
    make_python_inputs,
    make_form,
    make_rule,
    make_distances,
):
    """Return the obstacle, each plotted point paired with its scenario, and the table."""

    def _compute(
        conformity_plot, intermediate_points=(), obstacle_position=None
    ):
        form = make_form(
            conformityPlot=conformity_plot,
            intermediatePoints=list(intermediate_points),
        )
        rules = [make_rule("AT")]
        distances = [
            make_distances(
                "AT",
                lateral={"400": LATERAL_D},
                overhang={"400": OVERHANG_D},
            )
        ]
        result_dict = run_conformity(
            make_python_inputs(
                OBSTACLE_TYPES[conformity_plot],
                form,
                rules,
                distances,
                obstacle_position=obstacle_position,
            )
        )
        scenarios = build_scenarios(rules, form, distances)["AT"]
        points = result_dict["conformity"]["AT"]["points"]
        assert len(points) == len(scenarios)
        return (
            result_dict["obstacle"]["points"][0],
            list(zip(points, scenarios)),
            result_dict["results"]["AT"],
        )

    return _compute


def _euclidean(a, b):
    return math.hypot(a["x"] - b["x"], a["y"] - b["y"])


def _closest(obstacle, scenario_points, conformity_points):
    return min(
        (
            (point, scenario)
            for point, scenario in scenario_points
            if scenario.conformity_point in conformity_points
        ),
        key=lambda point_scenario: _euclidean(obstacle, point_scenario[0]),
    )


# ============================================================================
# CABLE TRACK
# ============================================================================


@pytest.mark.parametrize("obstacle_position", OBSTACLE_POSITIONS)
def test_cable_track_overhang_compliance_altitude_is_euclidean_distance_minus_distance_to_comply(
    compute_conformity, obstacle_position
):
    obstacle, overhang, _, table = compute_conformity(
        "cable_track",
        intermediate_points=[0.5],
        obstacle_position=obstacle_position,
    )

    assert table["overhangComplianceAltitude"] == pytest.approx(
        _euclidean(obstacle, overhang) - OVERHANG_D
    )


def test_cable_track_overhang_compliance_line_axis_distance_is_not_filled(
    compute_conformity,
):
    *_, table = compute_conformity("cable_track", intermediate_points=[0.5])

    assert table.get("overhangComplianceLineAxisDistance") is None


def test_cable_track_lateral_compliance_altitude_is_not_filled(
    compute_conformity,
):
    *_, table = compute_conformity("cable_track", intermediate_points=[0.5])

    assert table.get("lateralComplianceAltitude") is None


@pytest.mark.parametrize("obstacle_position", OBSTACLE_POSITIONS)
@pytest.mark.parametrize("intermediate_points", [[], [0.5], [0.33, 0.66]])
def test_cable_track_lateral_compliance_line_axis_distance_uses_closest_lateral_point(
    compute_conformity, obstacle_position, intermediate_points
):
    obstacle, _, lateral_points, table = compute_conformity(
        "cable_track",
        intermediate_points=intermediate_points,
        obstacle_position=obstacle_position,
    )

    closest = min(_euclidean(obstacle, p) for p in lateral_points)
    assert table["lateralComplianceLineAxisDistance"] == pytest.approx(
        closest - LATERAL_D
    )


@pytest.mark.parametrize(
    ("lateral_d", "overhang_d", "expected"),
    [
        pytest.param(TINY_D, TINY_D, True, id="both-positive"),
        pytest.param(HUGE_D, TINY_D, False, id="lateral-negative"),
        pytest.param(TINY_D, HUGE_D, False, id="overhang-negative"),
        pytest.param(HUGE_D, HUGE_D, False, id="both-negative"),
    ],
)
def test_cable_track_compliance_false_when_any_side_is_negative(
    compute_conformity, lateral_d, overhang_d, expected
):
    *_, table = compute_conformity(
        "cable_track",
        lateral_d=lateral_d,
        overhang_d=overhang_d,
        intermediate_points=[0.5],
    )

    assert (table["overhangComplianceAltitude"] < 0) is (overhang_d == HUGE_D)
    assert (table["lateralComplianceLineAxisDistance"] < 0) is (
        lateral_d == HUGE_D
    )
    assert table["conformityCompliance"] is expected


# ============================================================================
# VEGETATION
# ============================================================================


@pytest.mark.parametrize("obstacle_position", OBSTACLE_POSITIONS)
def test_vegetation_overhang_compliance_altitude_is_altitude_gap_minus_distance_to_comply(
    compute_conformity, obstacle_position
):
    obstacle, overhang, _, table = compute_conformity(
        "vegetation", obstacle_position=obstacle_position
    )

    assert table["overhangComplianceAltitude"] == pytest.approx(
        abs(obstacle["y"] - overhang["y"]) - OVERHANG_D
    )


@pytest.mark.parametrize("obstacle_position", OBSTACLE_POSITIONS)
def test_vegetation_lateral_compliance_line_axis_distance_is_closest_x_gap_minus_distance_to_comply(
    compute_conformity, obstacle_position
):
    obstacle, _, lateral_points, table = compute_conformity(
        "vegetation", obstacle_position=obstacle_position
    )

    closest_gap = min(abs(obstacle["x"] - p["x"]) for p in lateral_points)
    assert table["lateralComplianceLineAxisDistance"] == pytest.approx(
        closest_gap - LATERAL_D
    )


def test_vegetation_only_fills_overhang_altitude_and_lateral_line_axis_distance(
    compute_conformity,
):
    *_, table = compute_conformity("vegetation")

    assert table.get("overhangComplianceLineAxisDistance") is None
    assert table.get("lateralComplianceAltitude") is None


@pytest.mark.parametrize(
    ("lateral_d", "overhang_d", "expected"),
    [
        pytest.param(TINY_D, TINY_D, True, id="both-positive"),
        pytest.param(HUGE_D, TINY_D, True, id="lateral-negative-only"),
        pytest.param(TINY_D, HUGE_D, True, id="overhang-negative-only"),
        pytest.param(HUGE_D, HUGE_D, False, id="both-negative-inside-u"),
    ],
)
def test_vegetation_compliance_false_only_when_both_sides_are_negative(
    compute_conformity, lateral_d, overhang_d, expected
):
    *_, table = compute_conformity(
        "vegetation", lateral_d=lateral_d, overhang_d=overhang_d
    )

    assert (table["overhangComplianceAltitude"] < 0) is (overhang_d == HUGE_D)
    assert (table["lateralComplianceLineAxisDistance"] < 0) is (
        lateral_d == HUGE_D
    )
    assert table["conformityCompliance"] is expected


def test_vegetation_compliance_false_when_obstacle_between_lateral_points_and_overhang_negative(
    compute_conformity,
):
    obstacle, _, lateral_points, table = compute_conformity(
        "vegetation",
        lateral_d=TINY_D,
        overhang_d=HUGE_D,
        obstacle_position={"x": 10, "y": 10, "z": 30},
    )

    lateral_xs = [p["x"] for p in lateral_points]
    assert min(lateral_xs) < obstacle["x"] < max(lateral_xs)
    assert table["lateralComplianceLineAxisDistance"] > 0
    assert table["overhangComplianceAltitude"] < 0
    assert table["conformityCompliance"] is False


def test_vegetation_u_shape_compliance_is_judged_per_rule(
    run_conformity, make_python_inputs, make_form, make_rule, make_distances
):
    python_inputs = make_python_inputs(
        "vegetation",
        make_form(conformityPlot="vegetation"),
        [make_rule("RULE_1"), make_rule("RULE_2"), make_rule("RULE_3")],
        [
            make_distances(
                "RULE_1", lateral={"400": 1.0}, overhang={"400": 1.5}
            ),
            make_distances(
                "RULE_2", lateral={"400": 2.0}, overhang={"400": HUGE_D}
            ),
            make_distances(
                "RULE_3", lateral={"400": TINY_D}, overhang={"400": HUGE_D}
            ),
        ],
        obstacle_position={"x": 10, "y": 10, "z": 30},
    )

    results = run_conformity(python_inputs)["results"]

    assert results["RULE_1"]["conformityCompliance"] is True
    assert results["RULE_2"]["conformityCompliance"] is False
    assert results["RULE_3"]["conformityCompliance"] is False


# ============================================================================
# OVERHANG
# ============================================================================


@pytest.mark.parametrize("obstacle_position", OBSTACLE_POSITIONS)
@pytest.mark.parametrize("lateral_d", [None, LATERAL_D])
def test_overhang_compliance_altitude_is_altitude_gap_minus_distance_to_comply(
    compute_conformity, obstacle_position, lateral_d
):
    obstacle, overhang, _, table = compute_conformity(
        "overhang", lateral_d=lateral_d, obstacle_position=obstacle_position
    )

    assert table["overhangComplianceAltitude"] == pytest.approx(
        abs(obstacle["y"] - overhang["y"]) - OVERHANG_D
    )


@pytest.mark.parametrize("lateral_d", [None, LATERAL_D])
def test_overhang_only_fills_compliance_altitude(
    compute_conformity, lateral_d
):
    *_, table = compute_conformity("overhang", lateral_d=lateral_d)

    assert table["overhangComplianceAltitude"] is not None
    assert table.get("overhangComplianceLineAxisDistance") is None
    assert table.get("lateralComplianceAltitude") is None
    assert table.get("lateralComplianceLineAxisDistance") is None


@pytest.mark.parametrize(
    ("lateral_d", "overhang_d", "expected"),
    [
        pytest.param(None, TINY_D, True, id="no-lateral-positive"),
        pytest.param(None, HUGE_D, False, id="no-lateral-negative"),
        pytest.param(HUGE_D, TINY_D, True, id="lateral-ignored-positive"),
        pytest.param(TINY_D, HUGE_D, False, id="lateral-ignored-negative"),
    ],
)
def test_overhang_compliance_false_only_when_compliance_altitude_is_negative(
    compute_conformity, lateral_d, overhang_d, expected
):
    *_, table = compute_conformity(
        "overhang", lateral_d=lateral_d, overhang_d=overhang_d
    )

    assert (table["overhangComplianceAltitude"] < 0) is (overhang_d == HUGE_D)
    assert table["conformityCompliance"] is expected


# ============================================================================
# CLOSEST POINT: TEMPERATURE, WIND PRESSURE, MINIMAL DISTANCE
# ============================================================================

CLOSEST_POINT_CASES = [
    pytest.param("cable_track", [], id="cable_track"),
    pytest.param("cable_track", [0.5], id="cable_track-1-intermediate"),
    pytest.param(
        "cable_track", [0.33, 0.66], id="cable_track-2-intermediates"
    ),
    pytest.param("vegetation", [], id="vegetation"),
    pytest.param("overhang", [], id="overhang"),
]


@pytest.mark.parametrize("obstacle_position", OBSTACLE_POSITIONS)
@pytest.mark.parametrize(
    ("conformity_plot", "intermediate_points"), CLOSEST_POINT_CASES
)
def test_overhang_climatic_conditions_and_distance_come_from_closest_overhang_point(
    compute_scenario_points,
    conformity_plot,
    intermediate_points,
    obstacle_position,
):
    obstacle, scenario_points, table = compute_scenario_points(
        conformity_plot,
        intermediate_points=intermediate_points,
        obstacle_position=obstacle_position,
    )

    point, scenario = _closest(obstacle, scenario_points, ("overhang",))
    assert table["overhangMinimalDistance"] == pytest.approx(
        _euclidean(obstacle, point)
    )
    assert table["overhangTemperature"] == pytest.approx(
        scenario.target_state.new_temperature
    )
    assert table["overhangWindPressure"] == pytest.approx(
        scenario.target_state.wind_pressure
    )


@pytest.mark.parametrize("obstacle_position", OBSTACLE_POSITIONS)
@pytest.mark.parametrize(
    ("conformity_plot", "intermediate_points"), CLOSEST_POINT_CASES
)
def test_lateral_climatic_conditions_and_distance_come_from_closest_lateral_side_point(
    compute_scenario_points,
    conformity_plot,
    intermediate_points,
    obstacle_position,
):
    obstacle, scenario_points, table = compute_scenario_points(
        conformity_plot,
        intermediate_points=intermediate_points,
        obstacle_position=obstacle_position,
    )

    point, scenario = _closest(obstacle, scenario_points, LATERAL_SIDE_POINTS)
    assert table["lateralMinimalDistance"] == pytest.approx(
        _euclidean(obstacle, point)
    )
    assert table["lateralTemperature"] == pytest.approx(
        scenario.target_state.new_temperature
    )
    assert table["lateralWindPressure"] == pytest.approx(
        scenario.target_state.wind_pressure
    )


@pytest.mark.parametrize(
    ("obstacle_position", "intermediate_points", "expected_conformity_point"),
    [
        pytest.param(
            {"x": 10, "y": -20, "z": 30},
            [],
            "lateral_inverse",
            id="lateral-inverse",
        ),
        pytest.param(
            {"x": 10, "y": 10, "z": 30},
            [0.5],
            "intermediate",
            id="intermediate",
        ),
    ],
)
def test_lateral_climatic_conditions_are_not_always_from_lateral_scenario(
    compute_scenario_points,
    obstacle_position,
    intermediate_points,
    expected_conformity_point,
):
    obstacle, scenario_points, table = compute_scenario_points(
        "cable_track",
        intermediate_points=intermediate_points,
        obstacle_position=obstacle_position,
    )

    _, scenario = _closest(obstacle, scenario_points, LATERAL_SIDE_POINTS)
    lateral_scenario = next(
        s for _, s in scenario_points if s.conformity_point == "lateral"
    )
    assert scenario.conformity_point == expected_conformity_point
    assert (
        scenario.target_state.wind_pressure
        != lateral_scenario.target_state.wind_pressure
    )
    assert table["lateralWindPressure"] == pytest.approx(
        scenario.target_state.wind_pressure
    )
