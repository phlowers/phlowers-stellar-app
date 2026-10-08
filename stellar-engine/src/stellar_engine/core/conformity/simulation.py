# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Orchestrates a conformity computation: request, scenarios, solves, tables and output."""

import logging
from dataclasses import replace

from mechaphlowers import SectionStudy

from stellar_engine.core.conformity.compute import (
    ConformityResult,
    ConformityTableResult,
)
from stellar_engine.core.conformity.plot_data import (
    ObstacleOutput,
    ZoneConformity,
)
from stellar_engine.core.conformity.request import ConformityRequest
from stellar_engine.core.conformity.runner import (
    ScenarioRunner,
    find_obstacle_point,
)
from stellar_engine.core.conformity.scenarios import ScenarioBuilder
from stellar_engine.core.conformity.strategies import get_strategy
from stellar_engine.core.conformity.writer import ConformityWriter

logger = logging.getLogger("stellar_engine")


def get_conformity(python_inputs: dict, study: SectionStudy) -> dict:
    """Compute conformity for an obstacle against regulatory rules.

    Args:
        python_inputs: Input dictionary containing obstacle, rules, and parameters
        study: SectionStudy instance with the current study state

    Returns:
        Dictionary representation of ConformityResult
    """
    request = ConformityRequest.from_dict(python_inputs)
    logger.debug("Conformity request: %s", request)
    strategy = get_strategy(request.parameters.conformity_plot)

    obstacle_point = find_obstacle_point(
        study, request.obstacle_uuid, request.point_index
    )
    runner = ScenarioRunner(study, request.span_index, obstacle_point)
    scenarios_by_rule = ScenarioBuilder(
        request.parameters, strategy
    ).build_all(list(request.rules), request.tension_rules)

    conformity: dict[str, ZoneConformity] = {}
    table_results: dict[str, ConformityTableResult] = {}
    # tension_rules follows the rulesDistances order, the stacking priority of the front
    for rule_type, distances in request.tension_rules.items():
        outcomes = [
            runner.run(scenario)
            for scenario in scenarios_by_rule.get(rule_type, [])
        ]
        points = [
            replace(
                outcome.point,
                radius=strategy.radius(outcome.scenario.security_distance),
            )
            for outcome in outcomes
        ]
        zone_width = request.parameters.zone_width
        zone = (
            strategy.zone(points, distances)
            if zone_width is None
            else strategy.zone(points, distances, zone_width)
        )
        conformity[rule_type] = ZoneConformity(zone, points)
        table_results[rule_type] = ConformityTableResult.from_outcomes(
            outcomes, runner.obstacle, strategy
        )

    result = ConformityResult(
        obstacle=ObstacleOutput(
            name=f"{request.obstacle_name} point {request.point_index + 1}",
            points=[runner.obstacle],
        ),
        conformity=conformity,
        table_results=table_results,
    )
    return ConformityWriter.write(result)
