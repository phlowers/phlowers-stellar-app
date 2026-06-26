# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


# TODO: investigate to see if logging is imported correctly
import logging

from mechaphlowers import SectionStudy
from mechaphlowers.core.models.balance.interfaces import IBalanceModel
from mechaphlowers.utils import arr

from stellar_engine.entities.inputs import ClimateCharge, compute_ice_thickness

logger = logging.getLogger("stellar_engine")
# Set logger level to WARNING so info messages are shown
# logger.setLevel(logging.WARNING) # TODO: not sure about the effect of this, but it seems to be necessary to see info messages in the console


# TODO: correct the bug in mechaphlowers
def reset_balance_model_state(study: SectionStudy) -> None:
    """Workaround: reset balance model state before solve_adjustment to avoid
    contamination from a previous solve_change_state.

    Resets balance_model.parameter to its initial sagging value and zeroes
    nodes.dxdydz so the adjustment solver always starts from a clean geometry.
    Also invalidates the _precompute_merge_indices cache so that
    merge_loads_to_span_model recomputes span-split indices correctly if the
    number of loaded spans changed since the last solve.
    """
    bm: IBalanceModel = study._balance_engine.balance_model
    bm.parameter = bm.parameter_init.copy()
    bm.span_model.set_parameter(arr.incr(bm.parameter_init))
    bm.nodes.dxdydz[:] = 0
    for _attr in (
        "_merge_normal_idx",
        "_merge_left_idx",
        "_merge_right_idx",
        "_merge_not_load_mask",
        "_merge_n_total",
        "_merge_span_index",
        "_merge_span_type",
    ):
        bm.__dict__.pop(_attr, None)


def change_state(
    change_state_inputs: dict,
    study: SectionStudy,
    reload: bool = False,
) -> dict:
    climate = ClimateCharge(**change_state_inputs["climate"])
    logger.debug("python_inputs: %s", change_state_inputs)
    wind_pressure = climate.windPressure
    cable_temperature = climate.cableTemperature
    ice_thickness = compute_ice_thickness(climate, len(study.balance_engine))

    # apply_span_loads(study, change_state_inputs["spanLoads"])
    logger.debug("---------Load case applied to engine---------")
    logger.debug(
        "Wind pressure: %s, Cable temperature: %s, Ice thickness: %s",
        wind_pressure,
        cable_temperature,
        ice_thickness,
    )
    logger.debug("-----------------------------------------------")

    has_span = (study.balance_engine.span_loads.load_weight > 0.001).any()

    if has_span:
        reset_balance_model_state(study)

    if reload:

        study.solve_adjustment()
        study._solve_intermediate()

    study.solve_change_state(
        ice_thickness=ice_thickness,
        new_temperature=cable_temperature,
        wind_pressure=wind_pressure,
        wind_direction="clockwise",
    )

    return {"success": True}
