# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import json
import logging
import math
import uuid
from dataclasses import dataclass
from functools import wraps
from pathlib import Path
from typing import Any

STELLAR_SECTION_FORMAT = "stellar-section"
STELLAR_SECTION_VERSION = 1
SECTION_CRS_VALUES = ("LAMBERT93", "WGS84")

# Support defaults of the TypeScript ``createEmptySupport``.
EMPTY_SUPPORT: dict[str, Any] = {
    "number": None,
    "name": None,
    "spanLength": None,
    "spanAngle": 0,
    "attachmentSet": None,
    "attachmentHeight": None,
    "heightBelowConsole": None,
    "towerModel": None,
    "cableType": None,
    "armLength": 0,
    "chainName": None,
    "chainLength": 0,
    "chainWeight": 0,
    "chainV": False,
    "counterWeight": 0,
    "supportFootAltitude": None,
    "attachmentPosition": None,
    "chainSurface": 0,
    "spanAzimut": None,
    "footLongitude": None,
    "footLatitude": None,
}

# Section defaults of the TypeScript ``createEmptySection`` (without the
# generated fields: uuid, supports, dates).
EMPTY_SECTION: dict[str, Any] = {
    "name": "",
    "type": "phase",
    "electric_phase_number": 0,
    "cables_amount": 1,
    "obstacles": [],
    "floors": [],
    "initial_conditions": [],
    "charges": [],
    "selected_charge_uuid": None,
    "field_measures": [],
    "cable_modifications": [],
    "selected_cable_modification_uuid": None,
    "cable_span_manipulations": [],
    "selected_cable_span_manipulation_uuid": None,
    "cable_support_manipulations": [],
    "selected_cable_support_manipulation_uuid": None,
    "start_azimuth": None,
}


class StsecImportError(ValueError):
    """The ``.stsec`` content is not a valid Stellar section file."""


@dataclass
class StsecImport:
    """Content of a ``.stsec`` file, as read by ``import_stsec``."""

    section: dict[str, Any]
    coordinates: dict[str, Any] | None = None


def get_section_middle_span(start_support: int, end_support: int):
    return (start_support + end_support) // 2


def make_debug_log(log: logging.Logger, prefix: str = ""):
    """Create a debug_log decorator bound to a specific logger and prefix."""
    tag = f"[{prefix}] " if prefix else ""

    def debug_log(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            func_name = func.__name__
            log.debug(f">>{tag}| {func_name} triggered")
            result = func(*args, **kwargs)
            log.debug(f">>{tag}| {func_name} completed")
            return result

        return wrapper

    return debug_log


def _is_plain_object(value: object) -> bool:
    return isinstance(value, dict)


def _is_coordinate_array(value: object, supports_count: int) -> bool:
    return (
        isinstance(value, list)
        and len(value) == supports_count
        and all(
            item is None
            or (
                isinstance(item, (int, float))
                and not isinstance(item, bool)
                and math.isfinite(item)
            )
            for item in value
        )
    )


def _parse_envelope_coordinates(
    raw: object, supports_count: int
) -> dict[str, Any] | None:
    """Validate the optional ``coordinates`` block of an envelope.

    Raises:
        StsecImportError: If the block is present but malformed.
    """
    if raw is None:
        return None
    if (
        not isinstance(raw, dict)
        or raw.get("crs") not in SECTION_CRS_VALUES
        or not _is_coordinate_array(raw.get("x"), supports_count)
        or not _is_coordinate_array(raw.get("y"), supports_count)
    ):
        raise StsecImportError("Invalid coordinates block.")
    return {"crs": raw["crs"], "x": raw["x"], "y": raw["y"]}


def _map_raw_supports(raw_supports: object) -> list[dict[str, Any]]:
    if not isinstance(raw_supports, list):
        return []
    return [
        {"uuid": str(uuid.uuid4()), **EMPTY_SUPPORT, **support}
        for support in raw_supports
        if _is_plain_object(support)
    ]


def _map_raw_section(raw: dict[str, Any]) -> dict[str, Any]:
    """Merge a raw section onto the defaults so missing fields are filled."""
    raw_uuid = raw.get("uuid")
    section_uuid = (
        raw_uuid.strip() if isinstance(raw_uuid, str) else ""
    ) or str(uuid.uuid4())
    return {
        **EMPTY_SECTION,
        **raw,
        "uuid": section_uuid,
        "supports": _map_raw_supports(raw.get("supports")),
        "field_measures": [
            measure
            for measure in raw.get("field_measures") or []
            if _is_plain_object(measure)
        ],
    }


def import_stsec(source: str | Path | dict[str, Any]) -> StsecImport:
    """Read a Stellar section file (``.stsec``, or a raw section ``.json``).

    Python counterpart of the TypeScript ``StellarJsonAdapter``: a versioned
    envelope ``{format, version, section, coordinates?}`` or, for backward
    compatibility, a raw serialized section. The section is merged onto the
    defaults of an empty section and its supports onto the defaults of an
    empty support.

    Args:
        source: Path of the file, JSON text, or already parsed JSON.

    Raises:
        StsecImportError: If the content is not a valid section file or its
            version is not supported.
    """
    json_content: Any = source
    if isinstance(source, Path) or (
        isinstance(source, str) and not source.lstrip().startswith("{")
    ):
        json_content = json.loads(Path(source).read_text(encoding="utf-8"))
    elif isinstance(source, str):
        json_content = json.loads(source)

    if not _is_plain_object(json_content):
        raise StsecImportError("The file is not a JSON object.")

    if json_content.get("format") == STELLAR_SECTION_FORMAT:
        version = json_content.get("version")
        if (
            isinstance(version, bool)
            or not isinstance(version, int)
            or not 1 <= version <= STELLAR_SECTION_VERSION
        ):
            raise StsecImportError(
                f"Unsupported version {version!r} "
                f"(maximum: {STELLAR_SECTION_VERSION})."
            )
        raw_section = json_content.get("section")
        if not _is_plain_object(raw_section):
            raise StsecImportError("The envelope has no section object.")
        section = _map_raw_section(raw_section)
        coordinates = _parse_envelope_coordinates(
            json_content.get("coordinates"), len(section["supports"])
        )
        return StsecImport(section=section, coordinates=coordinates)

    if (
        "cantons" in json_content
        or "format" in json_content
        or not (
            isinstance(json_content.get("uuid"), str)
            or isinstance(json_content.get("supports"), list)
        )
    ):
        raise StsecImportError("The file is not a Stellar section.")
    return StsecImport(section=_map_raw_section(json_content))


def stsec_to_study_inputs(
    section_import: StsecImport, cable: dict[str, Any]
) -> dict[str, Any]:
    """Inputs of ``initialize_study`` for an imported section.

    The cable comes from the catalog (the file only stores its name).
    """
    section = section_import.section
    return {
        "section": section,
        "cable": cable,
        "obstacles": section["obstacles"],
    }
