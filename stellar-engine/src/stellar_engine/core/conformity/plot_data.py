# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Plot geometry entities of the conformity output."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Point2D:
    """Represents a 2D point with optional radius."""

    x: float
    y: float
    radius: Optional[float] = None

    def to_dict(self) -> dict:
        """Convert to dictionary format expected by the API."""
        if self.radius is None:
            return {"x": float(self.x), "y": float(self.y)}
        return {
            "x": float(self.x),
            "y": float(self.y),
            "radius": float(self.radius),
        }


@dataclass
class ZoneCorner:
    """Represents a corner of a zone (e.g., LowerLeft, UpperRight)."""

    name: str  # e.g., "LowerLeft", "UpperRight"
    x: float
    y: float

    def to_dict(self) -> dict:
        """Convert to dictionary format: {name: {x: ..., y: ...}}."""
        return {self.name: {"x": self.x, "y": self.y}}


@dataclass
class ZonePlot:
    """Represents the zone plot with zone points and border."""

    zone_points: list[ZoneCorner]
    zone_border: list[dict]  # List of {x, y} dicts

    def to_dict(self) -> dict:
        """Convert to dictionary format expected by the API."""
        return {
            "zonePoints": [corner.to_dict() for corner in self.zone_points],
            "zoneBorder": self.zone_border,
        }


@dataclass
class ObstacleOutput:
    """Represents the obstacle information in the output."""

    name: str
    points: list[Point2D]

    def to_dict(self) -> dict:
        """Convert to dictionary format expected by the API."""
        return {
            "name": self.name,
            "points": [p.to_dict() for p in self.points],
        }


@dataclass
class ZoneConformity:
    """Represents conformity data for a single zone/rule."""

    zone_plot: ZonePlot
    points: list[Point2D]

    def to_dict(self) -> dict:
        """Convert to dictionary format expected by the API."""
        return {
            "zonePlot": self.zone_plot.to_dict(),
            "points": [p.to_dict() for p in self.points],
        }
