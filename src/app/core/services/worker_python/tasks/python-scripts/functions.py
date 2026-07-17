# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import logging
import warnings

from importlib.metadata import version
import sys


# Parameters
RESOLUTION = 100

# configure handler to print to stdout
handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)

# mechaphlowers logger — reset any handlers set by the library on import
mph_logger = logging.getLogger("mechaphlowers")
mph_logger.handlers.clear()
mph_logger.propagate = True
mph_logger.setLevel(logging.WARNING)
mph_logger.addHandler(handler)

# stellar_engine logger
stellar_logger = logging.getLogger("stellar_engine")
stellar_logger.setLevel(logging.WARNING)
stellar_logger.addHandler(handler)

# logger for this file
logger = logging.getLogger(__name__)
logger.setLevel(logging.WARNING)
logger.addHandler(handler)

# Capture Python warnings (e.g. warnings.warn() raised inside mechaphlowers)
# so they can be forwarded to JS and surfaced as a toast, since they don't
# raise an exception and would otherwise be silently lost.
_captured_warnings: list[str] = []


def _capture_warning(message, category, filename, lineno, file=None, line=None):
    _captured_warnings.append(f"{category.__name__}: {message}")


warnings.showwarning = _capture_warning
# "always" ensures every occurrence is captured, since this worker is long-lived
# (default filter only reports the first occurrence per call site).
warnings.simplefilter("always")


def get_and_clear_warnings() -> list[str]:
    """Return captured warnings since the last call and clear the buffer."""
    captured = list(_captured_warnings)
    _captured_warnings.clear()
    return captured


from stellar_engine.pyodide_utils import js_to_python  # noqa: E402


# log utils functions
def set_log_level(js_inputs: dict):
    python_inputs = js_to_python(js_inputs)
    log_level = python_inputs["activateDebugLogs"]

    level = logging.DEBUG if log_level else logging.WARNING
    mph_logger.setLevel(level)
    stellar_logger.setLevel(level)
    logger.setLevel(level)
    logger.info(f"Python version: {sys.version}")
    mph_logger.info(f"mechaphlowers version: {version('mechaphlowers')}")
    stellar_logger.info(f"stellar_engine version: {version('stellar_engine')}")
    return {"success": True}


import mechaphlowers as mph  # noqa: E402


# initialization functions
def init_config():
    mph.options.graphics.resolution = RESOLUTION
    mph.options.input_units.cable_array["electric_resistance_20"] = "ohm/km"


init_config()
