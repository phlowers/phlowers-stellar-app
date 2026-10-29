# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Serializes conformity results to the dictionary expected by the API."""

from typing import Optional

from stellar_engine.core.conformity.compute import (
    ConformityResult,
    ConformityTableResult,
)


def _optional_float(value: Optional[float]) -> Optional[float]:
    return None if value is None else float(value)


class TableResultWriter:
    """Writes conformity table results to a structured format."""

    @staticmethod
    def write(result: ConformityTableResult) -> dict:
        """Convert ConformityTableResult to dictionary format."""
        return {
            "overhangCableAltitude": _optional_float(
                result.overhang_cable_altitude
            ),
            "lateralCableAltitude": _optional_float(
                result.lateral_cable_altitude
            ),
            "overhangTemperature": _optional_float(
                result.overhang_temperature
            ),
            "lateralTemperature": _optional_float(result.lateral_temperature),
            "overhangWindPressure": _optional_float(
                result.overhang_wind_pressure
            ),
            "lateralWindPressure": _optional_float(
                result.lateral_wind_pressure
            ),
            "lateralCableLineAxisDistance": _optional_float(
                result.lateral_cable_line_axis_distance
            ),
            "overhangCableLineAxisDistance": _optional_float(
                result.overhang_cable_line_axis_distance
            ),
            "overhangDistanceToComply": _optional_float(
                result.overhang_distance_to_comply
            ),
            "lateralDistanceToComply": _optional_float(
                result.lateral_distance_to_comply
            ),
            "overhangComplianceAltitude": _optional_float(
                result.overhang_compliance_altitude
            ),
            "lateralComplianceLineAxisDistance": _optional_float(
                result.lateral_compliance_line_axis_distance
            ),
            "conformityCompliance": None
            if result.conformity_compliance_status is None
            else bool(result.conformity_compliance_status),
            "overhangMinimalDistance": _optional_float(
                result.overhang_minimal_distance
            ),
            "lateralMinimalDistance": _optional_float(
                result.lateral_minimal_distance
            ),
        }


class ConformityWriter:
    """Writes conformity results to a structured format."""

    @staticmethod
    def write(result: ConformityResult) -> dict:
        """Convert ConformityResult to dictionary format."""
        return {
            "obstacle": result.obstacle.to_dict(),
            "conformity": {
                rule_type: zone.to_dict()
                for rule_type, zone in result.conformity.items()
            },
            "results": {
                rule_type: TableResultWriter.write(table_result)
                for rule_type, table_result in result.table_results.items()
            },
        }
