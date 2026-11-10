# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Solves conformity scenarios on a copy of the study and projects the cable in the obstacle plane."""

import logging
from copy import deepcopy
from dataclasses import dataclass
from typing import Callable, Iterable

import numpy as np
from mechaphlowers import SectionStudy
from mechaphlowers.core.geometry.distances import DistanceEngine

from stellar_engine.core.conformity.plot_data import Point2D
from stellar_engine.core.conformity.scenarios import Scenario, TargetState
from stellar_engine.entities.errors import (
    ConformityInputError,
    ObstacleNotFoundError,
    SupportOutOfRangeError,
)

logger = logging.getLogger("stellar_engine")


def solve_state(study_copy: SectionStudy, state: TargetState) -> None:
    """Solve one climatic state with the conformity engine conventions."""
    study_copy.solve_change_state(
        wind_pressure=state.wind_pressure,
        new_temperature=state.new_temperature,
        ice_thickness=0.0,
        wind_direction="clockwise",
    )


def find_obstacle_point(
    study: SectionStudy, obstacle_uuid: str, point_index: int
) -> np.ndarray:
    """3D coordinates of an obstacle point of the study."""
    group_points = study.position_engine.get_group_points()
    obstacle_coords = (
        group_points.obstacles.dict_coords().get(obstacle_uuid)
        if group_points.obstacles is not None
        else None
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
        group_points = study.position_engine.get_group_points()
        ground_supports = group_points.supports.coords[:, 0, :].copy()
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
        """Solve the climatic state of a scenario, once per distinct state.

        Steps performed for each scenario:
        1. Build a cache key from the scenario target state
           (wind pressure and new temperature).
        2. Reuse a previously computed result when the same state was already solved.
        3. Apply the target climate to a deep copy of the study.
        4. Refresh the span geometry for the current support span.
        5. Compute the cable point closest to the obstacle in the obstacle plane.
        6. Project that point back into the plane coordinates and cache it.
        """
        state = scenario.target_state
        key = (state.wind_pressure, state.new_temperature)
        point = self._cache.get(key)
        if point is None:
            logger.debug("Solving scenario %s", scenario)
            solve_state(self._study, state)
            self._engine.add_curves(
                self._study.position_engine.get_group_points().spans.coords[
                    self._span_index
                ]
            )
            dist_result = self._engine.plane_distance(
                self._obstacle_point, frame="section"
            )
            point = self.project(dist_result.point_target)
            self._cache[key] = point
        return ScenarioOutcome(scenario, point)


class SpanPointsProjector:
    """Projects cable curves into the vertical plane of each ground point."""

    def __init__(
        self,
        ground_supports: np.ndarray,
        span_index: int,
        points: np.ndarray,
    ):
        if not 0 <= span_index < len(ground_supports) - 1:
            raise SupportOutOfRangeError(
                f"Support index {span_index} out of range for the section"
            )
        self._points = np.asarray(points, dtype=float)
        if self._points.ndim != 2 or self._points.shape[1] != 3:
            raise ConformityInputError(
                "points must be an array of 3D coordinates"
            )
        if len(self._points) == 0:
            raise ConformityInputError(
                "points must contain at least one point"
            )

        self._engine = DistanceEngine()
        self._engine.add_span_frame(
            ground_supports[span_index], ground_supports[span_index + 1]
        )
        self._origin = self._engine.axis_start
        self._planes = [
            self._engine.define_distance_plane(point) for point in self._points
        ]

    def _project(
        self, point: np.ndarray, plane: tuple[np.ndarray, np.ndarray]
    ) -> dict[str, float]:
        relative_point = point - self._origin
        u_plane, v_plane = plane
        return {
            "lateral": float(np.dot(relative_point, u_plane)),
            "altitude": float(np.dot(relative_point, v_plane)),
        }

    def _fallback_extremity(
        self,
        point: np.ndarray,
        span_curves: np.ndarray,
        plane: tuple[np.ndarray, np.ndarray],
    ) -> np.ndarray:
        endpoints = (span_curves[0], span_curves[-1])
        target_projection = self._project(point, plane)
        return min(
            endpoints,
            key=lambda endpoint: (
                (
                    (projected := self._project(endpoint, plane))["lateral"]
                    - target_projection["lateral"]
                )
                ** 2
                + (projected["altitude"] - target_projection["altitude"]) ** 2
            ),
        )

    def measure(self, span_curves: np.ndarray) -> list[dict[str, float]]:
        """Measure each point against the supplied curve for this span."""
        self._engine.add_curves(span_curves)
        results: list[dict[str, float]] = []
        for index, (point, plane) in enumerate(
            zip(self._points, self._planes)
        ):
            if index == 0:
                target = span_curves[0]
            elif index == len(self._points) - 1:
                target = span_curves[-1]
            else:
                try:
                    target = self._engine.plane_distance(
                        point, frame="section"
                    ).point_target
                except ValueError as error:
                    if "No intersection found" not in str(error):
                        raise
                    target = self._fallback_extremity(
                        point, span_curves, plane
                    )
            results.append(self._project(target, plane))
        return results


class MultiStateRunner:
    """Solves each unique climatic state once and measures all span points."""

    def __init__(
        self,
        study: SectionStudy,
        projectors: dict[int, SpanPointsProjector],
    ):
        self._study = deepcopy(study)
        self._projectors = projectors
        self.state_extras: dict[tuple[float, float], object] = {}

    def run(
        self,
        states: Iterable[TargetState],
        state_hook: Callable[[SectionStudy, TargetState], object]
        | None = None,
    ) -> dict[tuple[float, float], dict[int, list[dict[str, float]]]]:
        """Solve unique states, then project every configured span's points."""
        results: dict[
            tuple[float, float], dict[int, list[dict[str, float]]]
        ] = {}
        self.state_extras = {}
        for state in states:
            key = (state.wind_pressure, state.new_temperature)
            if key in results:
                continue
            solve_state(self._study, state)
            span_curves = (
                self._study.position_engine.get_group_points().spans.coords
            )
            results[key] = {
                span_index: projector.measure(span_curves[span_index])
                for span_index, projector in self._projectors.items()
            }
            if state_hook is not None:
                self.state_extras[key] = state_hook(self._study, state)
        return results
