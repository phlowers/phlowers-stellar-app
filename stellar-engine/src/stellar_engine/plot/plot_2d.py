# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging

from mechaphlowers import BalanceEngine, PlotEngine

import stellar_engine.plot.obstacles as obst
from stellar_engine.entities.output import (
    get_coordinates,
    get_section_middle_span,
)

logger = logging.getLogger("mechaphlowers")


# ideally refresh_projection should only return the new coordinates,
# not the whole sectionOutput, that also contains vhl and other data that do not change
def refresh_projection(
    inputs: dict,
    balance_engine: BalanceEngine,
    plot_engine: PlotEngine,
    base_plt_line: PlotEngine,
):
    logger.debug("===> refresh_projection triggered")
    start_support = inputs["startSupport"]
    end_support = inputs["endSupport"]
    view = inputs["view"]
    project = view == "2d"

    current_coords = get_coordinates(
        balance_engine, plot_engine, project, start_support, end_support
    )
    base_coords = (
        get_coordinates(
            balance_engine, base_plt_line, project, start_support, end_support
        )
        if base_plt_line
        else None
    )
    middle_span = get_section_middle_span(start_support, end_support)
    obstacles = obst.get_current_obstacles(
        plot_engine, project=project, support_index=middle_span
    )

    return {
        "sectionOutput": {"current": current_coords, "base": base_coords},
        "obstacles": obstacles,
        "distances": obst.compute_distances(
            # inputs=obstacles,
            inputs={},  # currently unused
            project=project,
            plot_engine=plot_engine,
            support_index=middle_span,
        ),
    }
