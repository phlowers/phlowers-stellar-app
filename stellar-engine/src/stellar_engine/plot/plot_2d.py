# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging

from mechaphlowers import (
    SectionStudy,
)

import stellar_engine.plot.obstacles as obst
from stellar_engine.entities.output import (
    get_coordinates,
    get_section_middle_span,
)

logger = logging.getLogger("stellar_engine")


# ideally refresh_projection should only return the new coordinates,
# not the whole sectionOutput, that also contains vhl and other data that do not change
def refresh_projection(
    inputs: dict,
    study: SectionStudy,
    base_study: SectionStudy | None = None,
):

    # base_plt_line: PositionEngine = base_study.position_engine if base_study else None
    logger.debug("===> refresh_projection triggered")
    start_support = inputs["startSupport"]
    end_support = inputs["endSupport"]
    view = inputs["view"]
    project = view == "2d"

    return get_states_coordinates(study, base_study, start_support, end_support, project)

def get_states_coordinates(study, base_study, start_support, end_support, project):
    current_coords = get_coordinates(
        study, project, start_support, end_support
    )
    base_coords = (
        get_coordinates(base_study, project, start_support, end_support)
        if base_study
        else None
    )

    # Extract formatted obstacles/distances computed before serialization
    obstacles = current_coords.pop("obstacles_formatted", [])
    distances = current_coords.pop("distances_formatted", [])

    return {
        "sectionOutput": {"current": current_coords, "base": base_coords},
        "obstacles": obstacles,
        "distances": distances,
    }
