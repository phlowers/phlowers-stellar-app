# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging
from functools import wraps


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
