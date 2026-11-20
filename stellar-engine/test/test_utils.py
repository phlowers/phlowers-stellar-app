# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import json
from pathlib import Path

import pytest

from stellar_engine.utils import (
    STELLAR_SECTION_FORMAT,
    STELLAR_SECTION_VERSION,
    StsecImportError,
    import_stsec,
    stsec_to_study_inputs,
)

SECTION_FILE = Path(__file__).parent / "fixtures" / "estimation_obstacle.stsec"


def envelope(section: dict | None = None, **extra) -> dict:
    return {
        "format": STELLAR_SECTION_FORMAT,
        "version": STELLAR_SECTION_VERSION,
        "section": {"uuid": " abc ", "supports": [{"uuid": "s1"}, {}]}
        if section is None
        else section,
        **extra,
    }


def test_import_stsec_file():
    section_import = import_stsec(SECTION_FILE)

    section = section_import.section
    assert section["name"] == "aa"
    assert len(section["supports"]) == 3
    assert [obstacle["name"] for obstacle in section["obstacles"]] == [
        "ttt",
        "aaa",
        "ppp",
    ]
    assert section_import.coordinates is None


def test_import_stsec_accepts_text_and_path_as_str():
    text = SECTION_FILE.read_text(encoding="utf-8")

    from_text = import_stsec(text)
    from_str_path = import_stsec(str(SECTION_FILE))

    assert from_text.section == from_str_path.section


def test_import_stsec_fills_defaults_and_trims_uuid():
    section = import_stsec(envelope()).section

    assert section["uuid"] == "abc"
    assert section["obstacles"] == []
    assert section["cables_amount"] == 1
    first, second = section["supports"]
    assert first["uuid"] == "s1"
    assert second["uuid"]
    assert second["spanAngle"] == 0
    assert second["spanLength"] is None


def test_import_stsec_generates_missing_section_uuid():
    section = import_stsec({"supports": []}).section

    assert section["uuid"]


def test_import_stsec_raw_section_without_envelope():
    section_import = import_stsec({"uuid": "raw", "supports": [{}]})

    assert section_import.section["uuid"] == "raw"
    assert section_import.coordinates is None


def test_import_stsec_coordinates():
    coordinates = {"crs": "WGS84", "x": [1.0, None], "y": [2.0, 3.0]}

    section_import = import_stsec(envelope(coordinates=coordinates))

    assert section_import.coordinates == coordinates


@pytest.mark.parametrize(
    "coordinates",
    [
        "nope",
        {"crs": "UTM", "x": [1, 2], "y": [1, 2]},
        {"crs": "WGS84", "x": [1], "y": [1, 2]},
        {"crs": "WGS84", "x": [1, float("nan")], "y": [1, 2]},
    ],
)
def test_import_stsec_rejects_malformed_coordinates(coordinates):
    with pytest.raises(StsecImportError):
        import_stsec(envelope(coordinates=coordinates))


@pytest.mark.parametrize(
    "content",
    [
        [],
        {"cantons": [], "uuid": "x"},
        {"format": "other", "uuid": "x"},
        {"name": "no uuid, no supports"},
        envelope(section=[]),
        {**envelope(), "version": STELLAR_SECTION_VERSION + 1},
        {**envelope(), "version": 0},
        {**envelope(), "version": True},
    ],
)
def test_import_stsec_rejects_invalid_content(content):
    with pytest.raises(StsecImportError):
        import_stsec(content)


def test_import_stsec_rejects_invalid_json():
    with pytest.raises(json.JSONDecodeError):
        import_stsec("{not json")


def test_stsec_to_study_inputs():
    section_import = import_stsec(SECTION_FILE)

    inputs = stsec_to_study_inputs(section_import, {"name": "ASTER600"})

    assert inputs["section"] is section_import.section
    assert inputs["cable"] == {"name": "ASTER600"}
    assert inputs["obstacles"] is section_import.section["obstacles"]
