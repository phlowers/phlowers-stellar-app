# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging

import pytest
from mechaphlowers.config import options

from stellar_engine.core import engine_config

BANDED_JACOBIAN = "solver.acceleration.banded_jacobian.active"


@pytest.fixture(autouse=True)
def restore_banded_jacobian():
    banded_jacobian = options.solver.acceleration.banded_jacobian
    initial = banded_jacobian.active
    yield
    banded_jacobian.active = initial


def test_empty_inputs_change_nothing_and_log_info(caplog):
    initial = options.solver.acceleration.banded_jacobian.active

    with caplog.at_level(logging.INFO, logger="stellar_engine"):
        result = engine_config.set_engine_config({})

    assert result == {}
    assert options.solver.acceleration.banded_jacobian.active is initial
    assert "No engine configuration overload" in caplog.text


@pytest.mark.parametrize("active", [True, False])
def test_valid_entry_is_applied_and_warns(active, caplog):
    with caplog.at_level(logging.WARNING, logger="stellar_engine"):
        with pytest.warns(
            engine_config.EngineConfigWarning, match=BANDED_JACOBIAN
        ):
            result = engine_config.set_engine_config({BANDED_JACOBIAN: active})

    assert result == {BANDED_JACOBIAN: active}
    assert options.solver.acceleration.banded_jacobian.active is active
    assert f"Engine configuration overloaded: {BANDED_JACOBIAN}" in caplog.text


@pytest.mark.parametrize(
    "inputs",
    [
        {BANDED_JACOBIAN: "yes"},
        {BANDED_JACOBIAN: 1},
        {"solver.unknown": True},
    ],
)
def test_invalid_entries_are_ignored_with_warning_log(inputs, recwarn, caplog):
    initial = options.solver.acceleration.banded_jacobian.active

    with caplog.at_level(logging.WARNING, logger="stellar_engine"):
        result = engine_config.set_engine_config(inputs)

    assert result == {}
    assert options.solver.acceleration.banded_jacobian.active is initial
    assert "Wrong engine configuration loaded" in caplog.text
    assert not recwarn.list


def test_valid_entry_is_kept_next_to_an_invalid_one():
    with pytest.warns(engine_config.EngineConfigWarning):
        result = engine_config.set_engine_config(
            {BANDED_JACOBIAN: False, "solver.unknown": 1}
        )

    assert result == {BANDED_JACOBIAN: False}


def test_get_engine_config_returns_live_value():
    options.solver.acceleration.banded_jacobian.active = False

    assert engine_config.get_engine_config() == {BANDED_JACOBIAN: False}


def test_new_config_restores_defaults_first():
    default = engine_config.ENGINE_CONFIG_DEFAULTS[BANDED_JACOBIAN]
    with pytest.warns(engine_config.EngineConfigWarning):
        engine_config.set_engine_config({BANDED_JACOBIAN: not default})

    result = engine_config.set_engine_config({})

    assert result == {}
    assert options.solver.acceleration.banded_jacobian.active is default
