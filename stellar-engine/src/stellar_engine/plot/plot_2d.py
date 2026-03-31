# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from mechaphlowers import BalanceEngine, PlotEngine

from stellar_engine.entities.output import get_coordinates


def refresh_projection(
    inputs: dict,
    balance_engine: BalanceEngine,
    plot_engine: PlotEngine,
    base_plt_line: PlotEngine,
):
    start_support = inputs["startSupport"]
    end_support = inputs["endSupport"]
    view = inputs["view"]
    project = view == "2d"

    current_coords = get_coordinates(
        balance_engine, plot_engine, project, start_support, end_support
    )
    # TODO: weird consistency base/current engine
    base_coords = (
        get_coordinates(
            balance_engine, base_plt_line, project, start_support, end_support
        )
        if base_plt_line
        else None
    )

    return {"current": current_coords, "base": base_coords}
