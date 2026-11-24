# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Hidden mechaphlowers options, overloadable but not exposed in the interface."""

import logging
import warnings

from mechaphlowers.config import options

logger = logging.getLogger("stellar_engine")

# Overloadable options: dotted path in mechaphlowers `options` -> value check
ENGINE_CONFIG_VALIDATORS = {
    "solver.acceleration.banded_jacobian.active": lambda value: isinstance(
        value, bool
    ),
}


class EngineConfigWarning(UserWarning):
    """Hidden engine options were overloaded.

    The class name is matched on the frontend (PythonErrorCode) to surface the
    warning to the user.
    """


def _resolve(key: str):
    *path, name = key.split(".")
    target = options
    for part in path:
        target = getattr(target, part)
    return target, name


def get_engine_config() -> dict:
    """Return the live value of every overloadable option."""
    return {key: getattr(*_resolve(key)) for key in ENGINE_CONFIG_VALIDATORS}


# mechaphlowers defaults, captured before any overload
ENGINE_CONFIG_DEFAULTS = get_engine_config()


def set_engine_config(inputs: dict) -> dict:
    """Overload mechaphlowers options with the validated entries of inputs.

    Every overloadable option is first restored to its default, so the
    result only depends on inputs.

    Args:
        inputs: Dotted option path -> value. Entries whose key is unknown or
            whose value is invalid are ignored with a warning log.

    Returns:
        The overloaded options, empty when nothing was applied.
    """
    for key, value in ENGINE_CONFIG_DEFAULTS.items():
        setattr(*_resolve(key), value)

    if not inputs:
        logger.info("No engine configuration overload")
        return {}

    validated = {}
    for key, value in inputs.items():
        validator = ENGINE_CONFIG_VALIDATORS.get(key)
        if validator is None or not validator(value):
            logger.warning(
                f"Wrong engine configuration loaded: {key}={value!r}, "
                "check or reset it"
            )
            continue
        validated[key] = value

    for key, value in validated.items():
        setattr(*_resolve(key), value)
        logger.warning(f"Engine configuration overloaded: {key}={value!r}")

    if validated:
        details = ", ".join(f"{k}={v!r}" for k, v in validated.items())
        warnings.warn(
            f"Engine configuration overloaded: {details}",
            EngineConfigWarning,
            stacklevel=2,
        )
    return validated
