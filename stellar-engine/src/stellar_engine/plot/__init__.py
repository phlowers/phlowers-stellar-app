# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Plot package: Visualization and solver execution utilities."""

from stellar_engine.plot import obstacles
from stellar_engine.plot.plot_2d import refresh_projection
from stellar_engine.plot.plot_settings import get_aspect_ratio
from stellar_engine.plot.run_solver import (
    apply_span_loads,
    change_state,
    parse_span_loads,
)
from stellar_engine.plot.supports_coords import get_support_coordinates

__all__ = [
    "obstacles",
    "refresh_projection",
    "get_support_coordinates",
    "apply_span_loads",
    "parse_span_loads",
    "change_state",
    "get_aspect_ratio",
]
