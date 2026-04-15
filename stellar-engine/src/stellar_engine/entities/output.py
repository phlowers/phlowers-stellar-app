# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import numpy as np
from mechaphlowers import BalanceEngine, PlotEngine, units


def get_coordinates(
    balance_engine: BalanceEngine,
    plt_line: PlotEngine,
    project: bool = False,
    start_support: int = 0,
    end_support: int = 0,
):
    middle_span = get_section_middle_span(start_support, end_support)
    span, supports, insulators = plt_line.section_pts.get_points_for_plot(
        project=project, frame_index=middle_span
    )
    vtl_under_chain = list(balance_engine.balance_model.vhl_under_chain().vhl)
    vtl_under_console = list(
        balance_engine.balance_model.vhl_under_console().vhl
    )
    # vtl = vtl_under_chain.vtl)

    loads_coords = plt_line.get_loads_coords(
        project=project, frame_index=middle_span
    )
    line_angle_rad = balance_engine.section_array.data.line_angle.to_numpy()
    result = {
        "spans": span.coords,
        "insulators": insulators.coords,
        "supports": supports.coords,
        "line_angle": units(line_angle_rad, 'rad').to('grad').m.tolist(),
        "vtl_under_chain": [v.value().tolist() for v in vtl_under_chain],
        "vtl_under_console": [v.value().tolist() for v in vtl_under_console],
        "r_under_chain": balance_engine.balance_model.vhl_under_chain()
        .R.value()
        .tolist(),
        "r_under_console": balance_engine.balance_model.vhl_under_console()
        .R.value()
        .tolist(),
        "ground_altitude": balance_engine.section_array.data.ground_altitude.tolist(),
        "displacement": balance_engine.get_displacement().T.tolist(),
        "load_angle": balance_engine.cable_loads.load_angle.tolist(),
        "span_length": balance_engine.section_array.data.span_length.tolist(),
        "loads_coords": loads_coords,
        "utilization_rate": np.linspace(40, 90, len(balance_engine) - 1),
    }
    result_spans = balance_engine.get_data_spans()
    result.update(result_spans)
    return result


def get_section_middle_span(start_support: int, end_support: int):
    return (start_support + end_support) // 2
