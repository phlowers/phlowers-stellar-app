# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


# TODO: investigate to see if logging is imported correctly
import logging

import numpy as np
from mechaphlowers import BalanceEngine, PlotEngine, units

from stellar_engine.entities.inputs import ClimateCharge
from stellar_engine.entities.output import get_coordinates

logger = logging.getLogger("mechaphlowers")
# Set logger level to WARNING so info messages are shown
logger.setLevel(logging.WARNING)


def apply_span_loads(
    engine: BalanceEngine, plot_engine: PlotEngine, span_loads: list
):
    """Parse span loads and add them to the engine if any are non-zero."""
    load_position_meters, load_mass = parse_span_loads(engine, span_loads)
    if (load_position_meters != 0).any() and (load_mass != 0).any():
        engine.add_loads(load_position_meters, load_mass)
        # Bug here: plot_engine is not correctly reset
        plot_engine.reset(engine)


def parse_span_loads(
    engine: BalanceEngine, span_loads: list
) -> tuple[np.ndarray, np.ndarray]:
    """Convert raw span load dicts into position and mass arrays."""
    load_position_list = []
    load_weight_list_daN = []
    span_lengths = engine.section_array.data["span_length"].to_numpy()
    for index, span in enumerate(span_loads):
        try:
            if span['referenceSupport'] == 'LEFT':
                load_position_list.append(span["loadPosition"])
            elif span['referenceSupport'] == 'RIGHT':
                if 0 <= index < len(span_lengths):
                    span_length = span_lengths[index]
                    load_position_list.append(
                        span_length - span["loadPosition"]
                    )
                else:
                    logger.warning(
                        "Span load index %s is out of bounds for span_length array (size %s). "
                        "Defaulting load position to 0.",
                        index,
                        len(span_lengths),
                    )
                    load_position_list.append(0)
            else:
                load_position_list.append(0)

            if span['type'] == 'punctual':
                load_weight_list_daN.append(span["loadWeight"])
            else:
                load_weight_list_daN.append(0.01)
        except KeyError as e:
            logger.warning(
                "Span load at index %s is missing required key %s. "
                "Skipping with defaults (position=0, weight=0.01).",
                index,
                e,
            )
            load_position_list.append(0)
            load_weight_list_daN.append(0.01)
    load_mass_kg = units(load_weight_list_daN, 'daN').to('kg').magnitude
    return np.array(load_position_list), np.array(load_mass_kg)


def change_state(
    change_state_inputs: dict,
    balance_engine: BalanceEngine,
    plot_engine: PlotEngine,
    base_balance_engine: BalanceEngine,
    base_plot_engine: PlotEngine,
):
    # logger.debug("python_inputs: ", str(js_inputs))
    # print("change_state_inputs", change_state_inputs)
    climate = ClimateCharge(**change_state_inputs["climate"])
    # print(change_state_inputs)
    logger.debug("python_inputs: ", change_state_inputs)
    wind_pressure = climate.windPressure
    cable_temperature = climate.cableTemperature
    ice_thickness = climate.iceThickness / 100  # in meters in the engine

    apply_span_loads(
        balance_engine, plot_engine, change_state_inputs["spanLoads"]
    )

    balance_engine.solve_adjustment()
    balance_engine.solve_change_state(
        ice_thickness=ice_thickness,
        new_temperature=cable_temperature,
        wind_pressure=wind_pressure,
        wind_sense="clockwise",
    )
    section_length = len(balance_engine.section_array.data)
    base_section_length = (
        len(base_balance_engine.section_array.data)
        if base_balance_engine
        else section_length
    )
    # TODO: weird consistency base/current engine
    return (
        {
            "current": get_coordinates(
                balance_engine, plot_engine, False, 0, section_length - 1
            ),
            "base": get_coordinates(
                balance_engine,
                base_plot_engine,
                False,
                0,
                base_section_length - 1,
            )
            if base_plot_engine
            else None,
        },
        balance_engine,
        plot_engine,
    )
