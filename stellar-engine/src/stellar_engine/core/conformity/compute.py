# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Conformity table results built from scenario outcomes."""

import math
from dataclasses import dataclass
from typing import Optional, Sequence

from stellar_engine.core.conformity.plot_data import (
    ObstacleOutput,
    Point2D,
    ZoneConformity,
)
from stellar_engine.core.conformity.runner import ScenarioOutcome
from stellar_engine.core.conformity.strategies import PlotStrategy
from stellar_engine.entities.conformity import (
    LATERAL_SIDE_POINTS,
    ScenarioPoint,
)


@dataclass(frozen=True)
class ConformityTableResult:
    """Detailed numerical results for a single conformity rule (overhang and lateral sides)."""

    overhang_cable_altitude: Optional[float] = None
    lateral_cable_altitude: Optional[float] = None
    overhang_cable_line_axis_distance: Optional[float] = None
    lateral_cable_line_axis_distance: Optional[float] = None
    overhang_distance_to_comply: Optional[float] = None
    lateral_distance_to_comply: Optional[float] = None
    overhang_temperature: Optional[float] = None
    lateral_temperature: Optional[float] = None
    overhang_wind_pressure: Optional[float] = None
    lateral_wind_pressure: Optional[float] = None
    overhang_minimal_distance: Optional[float] = None
    lateral_minimal_distance: Optional[float] = None
    overhang_compliance_altitude: Optional[float] = None
    lateral_compliance_line_axis_distance: Optional[float] = None
    conformity_compliance_status: Optional[bool] = None

    @classmethod
    def from_outcomes(
        cls,
        outcomes: Sequence[ScenarioOutcome],
        obstacle: Point2D,
        strategy: PlotStrategy,
    ) -> 'ConformityTableResult':
        """Build the table of a rule from its solved scenarios."""

        def distance(outcome: ScenarioOutcome) -> float:
            return math.dist(
                (outcome.point.x, outcome.point.y), (obstacle.x, obstacle.y)
            )

        overhang = min(
            (
                o
                for o in outcomes
                if o.scenario.conformity_point == ScenarioPoint.OVERHANG
            ),
            key=distance,
            default=None,
        )
        lateral = next(
            (
                o
                for o in outcomes
                if o.scenario.conformity_point == ScenarioPoint.LATERAL
            ),
            None,
        )
        side = [
            o
            for o in outcomes
            if o.scenario.conformity_point in LATERAL_SIDE_POINTS
        ]
        closest_side = min(side, key=distance, default=None)
        side_points = [o.point for o in side]

        values: dict[str, float | bool | None] = {}
        overhang_compliance_altitude = None
        if overhang is not None:
            state = overhang.scenario.target_state
            values.update(
                overhang_cable_altitude=overhang.point.y,
                overhang_cable_line_axis_distance=overhang.point.x,
                overhang_distance_to_comply=overhang.scenario.security_distance,
                overhang_temperature=state.new_temperature,
                overhang_wind_pressure=state.wind_pressure,
                overhang_minimal_distance=distance(overhang),
            )
            overhang_compliance_altitude = (
                strategy.overhang_gap(obstacle, overhang.point)
                - overhang.scenario.security_distance
            )
        lateral_compliance_line_axis_distance = None
        if lateral is not None:
            values.update(
                lateral_cable_altitude=lateral.point.y,
                lateral_cable_line_axis_distance=lateral.point.x,
                lateral_distance_to_comply=lateral.scenario.security_distance,
            )
            lateral_gap = strategy.lateral_gap(obstacle, side_points)
            if lateral_gap is not None:
                lateral_compliance_line_axis_distance = (
                    lateral_gap - lateral.scenario.security_distance
                )
        if closest_side is not None:
            state = closest_side.scenario.target_state
            values.update(
                lateral_temperature=state.new_temperature,
                lateral_wind_pressure=state.wind_pressure,
                lateral_minimal_distance=distance(closest_side),
            )

        return cls(
            **values,
            overhang_compliance_altitude=overhang_compliance_altitude,
            lateral_compliance_line_axis_distance=lateral_compliance_line_axis_distance,
            conformity_compliance_status=strategy.is_compliant(
                overhang_compliance_altitude,
                lateral_compliance_line_axis_distance,
                obstacle,
                side_points,
            ),
        )


@dataclass
class ConformityResult:
    """Main conformity computation result."""

    obstacle: ObstacleOutput
    conformity: dict[str, ZoneConformity]  # rule_type -> ZoneConformity
    table_results: dict[
        str, ConformityTableResult
    ]  # rule_type -> table result
