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


def envelope(section: dict | None = None, **extra) -> dict:
    return {
        "format": STELLAR_SECTION_FORMAT,
        "version": STELLAR_SECTION_VERSION,
        "section": {"uuid": " abc ", "supports": [{"uuid": "s1"}, {}]}
        if section is None
        else section,
        **extra,
    }


@pytest.fixture
def section_file(tmp_path: Path) -> Path:
    section = {
        "uuid": "section-uuid",
        "name": "aa",
        "supports": [{"uuid": f"support-{index}"} for index in range(3)],
        "obstacles": [
            {"uuid": f"obstacle-{name}", "name": name}
            for name in ("ttt", "aaa", "ppp")
        ],
    }
    path = tmp_path / "section.stsec"
    path.write_text(json.dumps(envelope(section)), encoding="utf-8")
    return path


def test_import_stsec_file(section_file: Path):
    section_import = import_stsec(section_file)

    section = section_import.section
    assert section["name"] == "aa"
    assert len(section["supports"]) == 3
    assert [obstacle["name"] for obstacle in section["obstacles"]] == [
        "ttt",
        "aaa",
        "ppp",
    ]
    assert section_import.coordinates is None


def test_import_stsec_accepts_text_and_path_as_str(section_file: Path):
    text = section_file.read_text(encoding="utf-8")

    from_text = import_stsec(text)
    from_str_path = import_stsec(str(section_file))

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


def test_import_stsec_does_not_share_default_lists_between_imports():
    first = import_stsec(envelope()).section
    for key in ("obstacles", "floors", "charges", "cable_modifications"):
        first[key].append({"uuid": "leak"})

    second = import_stsec(envelope()).section

    for key in ("obstacles", "floors", "charges", "cable_modifications"):
        assert second[key] == []


@pytest.mark.parametrize("field_measures", [1, True, "x", {"a": 1}, None])
def test_import_stsec_ignores_non_list_field_measures(field_measures):
    section = import_stsec(
        envelope({"supports": [], "field_measures": field_measures})
    ).section

    assert section["field_measures"] == []


def test_import_stsec_keeps_only_plain_object_field_measures():
    section = import_stsec(
        envelope({"supports": [], "field_measures": [{"id": 1}, 3, None]})
    ).section

    assert section["field_measures"] == [{"id": 1}]


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


def test_stsec_to_study_inputs(section_file: Path):
    section_import = import_stsec(section_file)

    inputs = stsec_to_study_inputs(section_import, {"name": "ASTER600"})

    assert inputs["section"] is section_import.section
    assert inputs["cable"] == {"name": "ASTER600"}
    assert inputs["obstacles"] is section_import.section["obstacles"]
