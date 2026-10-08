# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Per-plot conformity rules: radius, compliance values, status and zone geometry."""

import math
from abc import ABC, abstractmethod
from typing import ClassVar, Sequence

from stellar_engine.core.conformity.plot_data import (
    Point2D,
    ZoneCorner,
    ZonePlot,
)
from stellar_engine.entities.conformity import ConformityPlot, TensionRules

DEFAULT_RADIUS = 1.0
DEFAULT_ZONE_WIDTH = 10.0


class PlotStrategy(ABC):
    """Behavior of a conformity plot type."""

    uses_intermediate_points: ClassVar[bool] = False

    def radius(self, security_distance: float) -> float:
        """Disk radius drawn around a cable point."""
        return DEFAULT_RADIUS

    @abstractmethod
    def overhang_gap(self, obstacle: Point2D, cable: Point2D) -> float:
        """Gap between the obstacle and the overhang cable point."""

    def lateral_gap(
        self, obstacle: Point2D, cables: Sequence[Point2D]
    ) -> float | None:
        """Gap between the obstacle and the lateral cable points, None if not judged."""
        return None

    @abstractmethod
    def is_compliant(
        self,
        overhang: float | None,
        lateral: float | None,
        obstacle: Point2D,
        lateral_cables: Sequence[Point2D],
    ) -> bool | None:
        """Compliance judged on the compliance values, None without value."""

    def zone(
        self,
        points: Sequence[Point2D],
        distances: TensionRules,
        width: float = DEFAULT_ZONE_WIDTH,
    ) -> ZonePlot:
        """Zone drawn around the cable points, empty when the plot has none."""
        return ZonePlot([], [])


class CableTrackStrategy(PlotStrategy):
    uses_intermediate_points = True

    def radius(self, security_distance: float) -> float:
        return security_distance

    def overhang_gap(self, obstacle: Point2D, cable: Point2D) -> float:
        return math.hypot(obstacle.x - cable.x, obstacle.y - cable.y)

    def lateral_gap(
        self, obstacle: Point2D, cables: Sequence[Point2D]
    ) -> float | None:
        return min(
            (
                math.hypot(obstacle.x - cable.x, obstacle.y - cable.y)
                for cable in cables
            ),
            default=None,
        )

    def is_compliant(
        self,
        overhang: float | None,
        lateral: float | None,
        obstacle: Point2D,
        lateral_cables: Sequence[Point2D],
    ) -> bool | None:
        values = [value for value in (overhang, lateral) if value is not None]
        if not values:
            return None
        return all(value >= 0 for value in values)


class _BoxZoneStrategy(PlotStrategy):
    """Plots drawn as a box around the cable points."""

    # Flat box: a single line below the lowest point.
    flat: ClassVar[bool] = False
    # Corner names in border drawing order.
    border: ClassVar[tuple[str, ...]]

    def overhang_gap(self, obstacle: Point2D, cable: Point2D) -> float:
        # negative when the obstacle is above the cable
        return cable.y - obstacle.y

    def zone(
        self,
        points: Sequence[Point2D],
        distances: TensionRules,
        width: float = DEFAULT_ZONE_WIDTH,
    ) -> ZonePlot:
        if not points:
            return ZonePlot([], [])

        lateral = distances.lateral if distances.lateral is not None else 0
        overhang = distances.overhang if distances.overhang is not None else 0

        max_x = max(p.x for p in points) + lateral
        min_x = min(p.x for p in points) - lateral
        if math.isclose(max_x, min_x, abs_tol=1e-9):
            center_x = min_x
            min_x = center_x - width / 2
            max_x = center_x + width / 2

        min_y = min(p.y for p in points) - overhang
        max_y = min_y if self.flat else max(p.y for p in points) + overhang

        coordinates = {
            "LowerLeft": (min_x, min_y),
            "LowerRight": (max_x, min_y),
            "UpperRight": (max_x, max_y),
            "UpperLeft": (min_x, max_y),
        }
        corners = [
            ZoneCorner(name, float(x), float(y))
            for name, (x, y) in coordinates.items()
        ]
        zone_border = [
            {
                "x": float(coordinates[name][0]),
                "y": float(coordinates[name][1]),
            }
            for name in self.border
        ]
        return ZonePlot(zone_points=corners, zone_border=zone_border)


class VegetationStrategy(_BoxZoneStrategy):
    border = ("UpperLeft", "LowerLeft", "LowerRight", "UpperRight")

    def lateral_gap(
        self, obstacle: Point2D, cables: Sequence[Point2D]
    ) -> float | None:
        return min(
            (abs(obstacle.x - cable.x) for cable in cables), default=None
        )

    def is_compliant(
        self,
        overhang: float | None,
        lateral: float | None,
        obstacle: Point2D,
        lateral_cables: Sequence[Point2D],
    ) -> bool | None:
        if overhang is None and lateral is None:
            return None
        return not self._is_inside_u(
            overhang, lateral, obstacle, lateral_cables
        )

    @staticmethod
    def _is_inside_u(
        overhang: float | None,
        lateral: float | None,
        obstacle: Point2D,
        lateral_cables: Sequence[Point2D],
    ) -> bool:
        """Inside the U: too close vertically and laterally within the lateral band."""
        if overhang is None or overhang >= 0:
            # Without overhang value, only the lateral side can be judged.
            return overhang is None and lateral is not None and lateral < 0
        if lateral is None or lateral < 0:
            return True
        # The absolute lateral gap is positive between the lateral points.
        lateral_xs = [cable.x for cable in lateral_cables]
        return min(lateral_xs) <= obstacle.x <= max(lateral_xs)


class OverhangStrategy(_BoxZoneStrategy):
    flat = True
    border = ("LowerLeft", "LowerRight", "UpperRight", "UpperLeft")

    def is_compliant(
        self,
        overhang: float | None,
        lateral: float | None,
        obstacle: Point2D,
        lateral_cables: Sequence[Point2D],
    ) -> bool | None:
        return None if overhang is None else overhang >= 0


STRATEGIES: dict[ConformityPlot, PlotStrategy] = {
    ConformityPlot.CABLE_TRACK: CableTrackStrategy(),
    ConformityPlot.VEGETATION: VegetationStrategy(),
    ConformityPlot.OVERHANG: OverhangStrategy(),
}


def get_strategy(plot: str) -> PlotStrategy:
    """Strategy of a conformity plot type, ValueError if unknown."""
    return STRATEGIES[ConformityPlot(plot)]
