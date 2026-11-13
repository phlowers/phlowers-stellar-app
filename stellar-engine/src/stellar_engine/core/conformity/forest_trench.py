# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Multi-point conformity simulation for forest trenches."""

import logging
from copy import deepcopy

import numpy as np
from mechaphlowers import SectionStudy

from stellar_engine.core.conformity.request import ForestTrenchRequest
from stellar_engine.core.conformity.runner import (
    MultiStateRunner,
    SpanPointsProjector,
    find_obstacle_point,
)
from stellar_engine.core.conformity.scenarios import (
    Scenario,
    ScenarioBuilder,
    TargetState,
)
from stellar_engine.core.conformity.strategies import get_strategy
from stellar_engine.entities.conformity import ConformityPlot, ScenarioPoint
from stellar_engine.entities.errors import ConformityInputError
from stellar_engine.plot.obstacles import add_single_obstacle

logger = logging.getLogger("stellar_engine")


def _point_at_state(
    results: dict,
    state: TargetState,
    span_index: int,
    point_index: int,
) -> dict[str, float]:
    state_key = (state.wind_pressure, state.new_temperature)
    try:
        return results[state_key][span_index][point_index]
    except (KeyError, IndexError) as error:
        raise ConformityInputError(
            f"Missing forest-trenches results for state {state_key}, "
            f"span {span_index}, point {point_index}"
        ) from error


def _plan_point(distance: float, lateral: float) -> dict[str, float]:
    return {"x": float(distance), "y": float(lateral)}


def _scenario_lookup(
    scenarios_by_rule: dict[str, list[Scenario]],
) -> dict[tuple[str, ScenarioPoint], Scenario]:
    return {
        (scenario.rule_type, scenario.conformity_point): scenario
        for scenarios in scenarios_by_rule.values()
        for scenario in scenarios
    }


def run(python_inputs: dict, study: SectionStudy) -> dict:
    """Compute forest-trenches conformity on every requested span point."""
    request = ForestTrenchRequest.from_dict(python_inputs)
    if request.parameters.conformity_plot != ConformityPlot.FOREST_TRENCHES:
        raise ConformityInputError("conformityPlot must be 'forest_trenches'")

    working_study = deepcopy(study)
    group_points = working_study.position_engine.get_group_points()
    ground_supports = group_points.supports.coords[:, 0, :].copy()
    for span in request.spans:
        if not 0 <= span.span_index < len(ground_supports) - 1:
            raise ConformityInputError(
                f"spanIndex {span.span_index} is out of range"
            )

    projectors: dict[int, SpanPointsProjector] = {}
    for span in request.spans:
        obstacle_uuid = f"forest-trench-{span.span_index}"
        obstacle = {
            "uuid": obstacle_uuid,
            "supportIndex": span.span_index,
            "name": obstacle_uuid,
            "type": "floor",
            "altitudeType": "absolute",
            "lateralDistanceType": "SPAN_AXIS",
            "referenceSupport": "LEFT",
            "positions": [
                {"x": distance, "y": 0.0, "z": altitude}
                for distance, altitude in zip(span.distances, span.altitudes)
            ],
        }
        add_single_obstacle(
            {"obstacles": [obstacle]},
            working_study,
            support_index=span.span_index,
        )
        points = np.array(
            [
                find_obstacle_point(working_study, obstacle_uuid, point_index)
                for point_index in range(len(span.distances))
            ]
        )
        projectors[span.span_index] = SpanPointsProjector(
            ground_supports, span.span_index, points
        )

    scenarios_by_rule = ScenarioBuilder(
        request.parameters, get_strategy(request.parameters.conformity_plot)
    ).build_all(list(request.rules), request.tension_rules)
    scenarios = _scenario_lookup(scenarios_by_rule)

    selected_scenarios: list[Scenario] = []
    for rule_type in request.lateral_rules:
        for point in (ScenarioPoint.LATERAL, ScenarioPoint.LATERAL_INVERSE):
            scenario = scenarios.get((rule_type, point))
            if scenario is None:
                raise ConformityInputError(
                    f"Missing {point.value} scenario for rule {rule_type}"
                )
            selected_scenarios.append(scenario)
    for rule_type in request.overhang_rules:
        scenario = scenarios.get((rule_type, ScenarioPoint.OVERHANG))
        if scenario is None:
            raise ConformityInputError(
                f"Missing overhang scenario for rule {rule_type}"
            )
        selected_scenarios.append(scenario)

    # Every overhang scenario shares the repartition temperature without wind,
    # so the first one gives the median F1 of the span.
    median_state = next(
        (
            scenario.target_state
            for scenario in selected_scenarios
            if scenario.conformity_point == ScenarioPoint.OVERHANG
        ),
        None,
    )

    def collect_sag(
        solved_study: SectionStudy, _state: TargetState
    ) -> dict[int, float]:
        sag_by_span = solved_study.balance_engine.get_data_spans()["sag"]
        return {
            span.span_index: float(sag_by_span[span.span_index])
            for span in request.spans
        }

    state_runner = MultiStateRunner(working_study, projectors)
    results = state_runner.run(
        [scenario.target_state for scenario in selected_scenarios],
        state_hook=collect_sag,
    )
    median_f1_by_span = (
        None
        if median_state is None
        else state_runner.state_extras[
            (median_state.wind_pressure, median_state.new_temperature)
        ]
    )

    output_spans = []
    for span in request.spans:
        span_index = span.span_index
        length = float(
            np.linalg.norm(
                ground_supports[span_index + 1, :2]
                - ground_supports[span_index, :2]
            )
        )
        lateral_plot = {
            rule_type: {"cable": [], "limit": []}
            for rule_type in request.lateral_rules
        }
        lateral_inverse_plot = {
            rule_type: {"cable": [], "limit": []}
            for rule_type in request.lateral_rules
        }
        overhang_plot = {
            rule_type: {"cable": []} for rule_type in request.overhang_rules
        }
        points_output = []

        for point_index, (distance, ground_elevation) in enumerate(
            zip(span.distances, span.altitudes)
        ):
            point_output = {
                "distanceToLeftSupport": float(distance),
                "groundElevation": float(ground_elevation),
                "lateral": {},
                "lateralInverse": {},
                "overhang": {},
            }

            for rule_type in request.lateral_rules:
                lateral_scenario = scenarios[
                    (rule_type, ScenarioPoint.LATERAL)
                ]
                inverse_scenario = scenarios[
                    (rule_type, ScenarioPoint.LATERAL_INVERSE)
                ]
                lateral_distance = request.tension_rules[rule_type].lateral
                if lateral_distance is None:
                    raise ConformityInputError(
                        f"Missing lateral distance for rule {rule_type}"
                    )

                for scenario, target, plot_data, direction in (
                    (
                        lateral_scenario,
                        point_output["lateral"],
                        lateral_plot[rule_type],
                        -1.0,
                    ),
                    (
                        inverse_scenario,
                        point_output["lateralInverse"],
                        lateral_inverse_plot[rule_type],
                        1.0,
                    ),
                ):
                    cable_point = _point_at_state(
                        results, scenario.target_state, span_index, point_index
                    )
                    axis_distance = cable_point["lateral"]
                    limit_axis_distance = (
                        axis_distance + direction * lateral_distance
                    )
                    target[rule_type] = {
                        "axisDistance": axis_distance,
                        "elevation": cable_point["altitude"],
                        "limitAxisDistance": limit_axis_distance,
                    }
                    plot_data["cable"].append(
                        _plan_point(distance, axis_distance)
                    )
                    plot_data["limit"].append(
                        _plan_point(distance, limit_axis_distance)
                    )

            for rule_type in request.overhang_rules:
                scenario = scenarios[(rule_type, ScenarioPoint.OVERHANG)]
                overhang_distance = request.tension_rules[rule_type].overhang
                if overhang_distance is None:
                    raise ConformityInputError(
                        f"Missing overhang distance for rule {rule_type}"
                    )
                cable_point = _point_at_state(
                    results, scenario.target_state, span_index, point_index
                )
                height_above_ground = (
                    cable_point["altitude"] - ground_elevation
                )
                point_output["overhang"][rule_type] = {
                    "elevation": cable_point["altitude"],
                    "heightAboveGround": height_above_ground,
                    "complianceLimitHeightAboveGround": (
                        height_above_ground - overhang_distance
                    ),
                }
                overhang_plot[rule_type]["cable"].append(
                    _plan_point(distance, cable_point["lateral"])
                )

            points_output.append(point_output)

        output_spans.append(
            {
                "spanIndex": span_index,
                "length": length,
                "medianF1": (
                    None
                    if median_f1_by_span is None
                    else median_f1_by_span[span_index]
                ),
                "axis": [
                    {"x": 0.0, "y": 0.0},
                    {"x": length, "y": 0.0},
                ],
                "plot": {
                    "lateral": lateral_plot,
                    "lateralInverse": lateral_inverse_plot,
                    "overhang": overhang_plot,
                },
                "points": points_output,
            }
        )

    logger.debug(
        "Forest-trenches simulation completed for %s spans", len(output_spans)
    )
    return {"spans": output_spans}
