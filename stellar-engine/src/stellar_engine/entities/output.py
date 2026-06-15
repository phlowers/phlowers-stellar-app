# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import logging

from mechaphlowers import BalanceEngine, PlotEngine, units
from mechaphlowers.utils import ArrayTools

logger = logging.getLogger("mechaphlowers")


# TODO: ideally, we want to separate [generating GroupPoints] and [change frame/fetch data]
def get_coordinates(
    balance_engine: BalanceEngine,
    plt_line: PlotEngine,
    project: bool = False,
    start_support: int = 0,
    end_support: int = 0,
):
    base_group_points = plt_line.position_engine.get_group_points()
    # maybe split this in other functions
    # -------function 1: project and invert axis-----------
    middle_span = get_section_middle_span(start_support, end_support)

    if project:
        projected_group_points = base_group_points.change_frame(
            frame_index=middle_span
        )
        coord_dict = projected_group_points.get_all_objects_dict(
            reversed_y_axis=project
        )
        span, supports, insulators = (
            coord_dict["spans"],
            coord_dict["supports"],
            coord_dict["insulators"],
        )
    else:
        span, supports, insulators = (
            base_group_points.spans,
            base_group_points.supports,
            base_group_points.insulators,
        )
    # -------function 2: get data-----------
    vtl_under_chain = list(balance_engine.balance_model.vhl_under_chain().vhl)
    vtl_under_console = list(
        balance_engine.balance_model.vhl_under_console().vhl
    )

    loads_coords = plt_line.get_loads_coords(
        project=project, frame_index=middle_span
    )
    line_angle_rad = balance_engine.section_array.data.line_angle.to_numpy()
    tension_max, _ = balance_engine.span_model.tensions_sup_inf()
    utilization_rate = balance_engine.cable_array.utilization_rate(tension_max)
    logger.debug("utilization rate: %s", utilization_rate)
    result = {
        "spans": span.coords,
        "insulators": insulators.coords,
        "supports": supports.coords,
        "line_angle": units(line_angle_rad, "rad").to("grad").m.tolist(),
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
        "utilization_rate": ArrayTools.decr(utilization_rate.tolist()),
    }
    result_spans = balance_engine.get_data_spans()
    result.update(result_spans)
    return result


def get_section_middle_span(start_support: int, end_support: int):
    return (start_support + end_support) // 2
