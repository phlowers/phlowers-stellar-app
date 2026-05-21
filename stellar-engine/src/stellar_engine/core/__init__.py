# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

"""Core package: core calculations."""

from stellar_engine.core.pose_table import get_equivalent_span, get_pose_table
from stellar_engine.core.section import (
    generate_section_array,
)

__all__ = [
    "generate_section_array",
    "get_pose_table",
    "get_equivalent_span",
]