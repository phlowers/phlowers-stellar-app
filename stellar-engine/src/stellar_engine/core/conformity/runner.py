# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Solves conformity scenarios on a copy of the study and projects the cable in the obstacle plane."""

import logging
from copy import deepcopy
from dataclasses import dataclass

import numpy as np
from mechaphlowers import SectionStudy
from mechaphlowers.core.geometry.distances import DistanceEngine

from stellar_engine.core.conformity.plot_data import Point2D
from stellar_engine.core.conformity.scenarios import Scenario
from stellar_engine.entities.errors import (
    ConformityInputError,
    ObstacleNotFoundError,
    SupportOutOfRangeError,
)

logger = logging.getLogger("stellar_engine")


def find_obstacle_point(
    study: SectionStudy, obstacle_uuid: str, point_index: int
) -> np.ndarray:
    """3D coordinates of an obstacle point of the study."""
    obstacle_coords = study.position_engine.coords_calculator.obstacles_points.dict_coords().get(
        obstacle_uuid
    )
    if obstacle_coords is None:
        logger.error(
            f"Obstacle with uuid: {obstacle_uuid} not found in study."
        )
        raise ObstacleNotFoundError(
            f"Obstacle with uuid: {obstacle_uuid} not found in study."
        )
    if not 0 <= point_index < len(obstacle_coords):
        raise ConformityInputError(
            f"Point index {point_index} out of range for obstacle {obstacle_uuid}"
        )
    return obstacle_coords[point_index]


@dataclass(frozen=True)
class ScenarioOutcome:
    """A scenario with the cable point closest to the obstacle, in the obstacle plane."""

    scenario: Scenario
    point: Point2D


class ScenarioRunner:
    """Solves scenarios on a copy of the study, so the caller's study is untouched."""

    def __init__(
        self,
        study: SectionStudy,
        span_index: int,
        obstacle_point: np.ndarray,
    ):
        ground_supports = study.position_engine.coords_calculator.supports_ground_coords.copy()
        if not 0 <= span_index < len(ground_supports) - 1:
            raise SupportOutOfRangeError(
                f"Support index {span_index} out of range for the section"
            )
        self._study = deepcopy(study)
        self._span_index = span_index
        self._obstacle_point = obstacle_point
        self._engine = DistanceEngine()
        self._engine.add_span_frame(
            ground_supports[span_index], ground_supports[span_index + 1]
        )
        self._u_plane, self._v_plane = self._engine.define_distance_plane(
            obstacle_point
        )
        # axis_start has z = 0, so the plane y stays the absolute altitude
        self._origin = self._engine.axis_start
        self.obstacle = self.project(obstacle_point)
        self._cache: dict[tuple[float, float], Point2D] = {}

    def project(self, point: np.ndarray) -> Point2D:
        """Project a 3D point in the obstacle plane."""
        relative_point = point - self._origin
        return Point2D(
            x=float(np.dot(relative_point, self._u_plane)),
            y=float(np.dot(relative_point, self._v_plane)),
        )

    def run(self, scenario: Scenario) -> ScenarioOutcome:
        """Solve the climatic state of a scenario, once per distinct state."""
        state = scenario.target_state
        key = (state.wind_pressure, state.new_temperature)
        point = self._cache.get(key)
        if point is None:
            logger.debug("Solving scenario %s", scenario)
            self._study.solve_change_state(
                wind_pressure=state.wind_pressure,
                new_temperature=state.new_temperature,
                # no ice in regulatory scenarios
                ice_thickness=0.0,
                # same convention as study.apply_climate_to_engine
                wind_direction="clockwise",
            )
            self._engine.add_curves(
                self._study.position_engine.coords_calculator.get_spans(
                    frame="section"
                ).coords[self._span_index]
            )
            dist_result = self._engine.plane_distance(
                self._obstacle_point, frame="section"
            )
            point = self.project(dist_result.point_target)
            self._cache[key] = point
        return ScenarioOutcome(scenario, point)
