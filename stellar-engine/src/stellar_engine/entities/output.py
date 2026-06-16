# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import logging

from mechaphlowers import BalanceEngine, PlotEngine, SectionStudy, units
from mechaphlowers.utils import ArrayTools
from stellar_engine.entities.errors import GeneratedPointsNoneError

from stellar_engine.utils import get_section_middle_span

logger = logging.getLogger("mechaphlowers")


# TODO: ideally, we want to separate [generating GroupPoints] and [change frame/fetch data]
def get_coordinates(
    study: SectionStudy,
    project: bool = False,
    start_support: int = 0,
    end_support: int = 0,
):
    base_group_points = study.position_engine.get_group_points()
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
    vtl_under_chain = list(study.balance_engine.balance_model.vhl_under_chain().vhl)
    vtl_under_console = list(
        study.balance_engine.balance_model.vhl_under_console().vhl
    )

    loads_coords = study.position_engine.get_loads_coords(
        project=project, frame_index=middle_span
    )
    line_angle_rad = study.balance_engine.section_array.data.line_angle.to_numpy()
    tension_max, _ = study.balance_engine.span_model.tensions_sup_inf()
    utilization_rate = study.balance_engine.cable_array.utilization_rate(tension_max)
    logger.debug("utilization rate: %s", utilization_rate)

    if span is None:
        raise GeneratedPointsNoneError("Span data is None. Cannot proceed with coordinate extraction.")
    if supports is None:
        raise GeneratedPointsNoneError("Supports data is None. Cannot proceed with coordinate extraction.")
    if insulators is None:
        raise GeneratedPointsNoneError("Insulators data is None. Cannot proceed with coordinate extraction.")

    result = {
        "spans": span.coords,
        "insulators": insulators.coords,
        "supports": supports.coords,
        "line_angle": units(line_angle_rad, "rad").to("grad").m.tolist(),
        "vtl_under_chain": [v.value().tolist() for v in vtl_under_chain],
        "vtl_under_console": [v.value().tolist() for v in vtl_under_console],
        "r_under_chain": study.balance_engine.balance_model.vhl_under_chain()
        .R.value()
        .tolist(),
        "r_under_console": study.balance_engine.balance_model.vhl_under_console()
        .R.value()
        .tolist(),
        "ground_altitude": study.balance_engine.section_array.data.ground_altitude.tolist(),
        "displacement": study.balance_engine.get_displacement().T.tolist(),
        "load_angle": study.balance_engine.cable_loads.load_angle.tolist(),
        "span_length": study.balance_engine.section_array.data.span_length.tolist(),
        "loads_coords": loads_coords,
        "utilization_rate": ArrayTools.decr(utilization_rate.tolist()),
    }
    result_spans = study.balance_engine.get_data_spans()
    result.update(result_spans)
    return result


