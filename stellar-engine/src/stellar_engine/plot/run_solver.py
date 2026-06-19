# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


# TODO: investigate to see if logging is imported correctly
import logging

import numpy as np
from mechaphlowers import SectionStudy, units

from stellar_engine.entities.inputs import ClimateCharge, compute_ice_thickness

logger = logging.getLogger("stellar_engine")
# Set logger level to WARNING so info messages are shown
# logger.setLevel(logging.WARNING) # TODO: not sure about the effect of this, but it seems to be necessary to see info messages in the console


def apply_span_loads(study: SectionStudy, span_loads: list):
    """Parse span loads and apply them to the engine, clearing previous loads when needed."""
    n_spans = len(study.balance_engine)
    if not span_loads:
        study.add_loads(np.zeros(n_spans), np.zeros(n_spans))
        return
    load_position_meters, load_mass = parse_span_loads(study, span_loads)
    study.add_loads(load_position_meters, load_mass)


def parse_span_loads(
    study: SectionStudy, span_loads: list
) -> tuple[np.ndarray, np.ndarray]:
    """Convert raw span load dicts into position and mass arrays."""
    load_position_list = []
    load_weight_list_daN = []
    engine = study.balance_engine
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
    study: SectionStudy,
):
    climate = ClimateCharge(**change_state_inputs["climate"])
    logger.debug("python_inputs: %s", change_state_inputs)
    wind_pressure = climate.windPressure
    cable_temperature = climate.cableTemperature
    ice_thickness = compute_ice_thickness(climate, len(study.balance_engine))

    apply_span_loads(study, change_state_inputs["spanLoads"])

    study.solve_adjustment()
    study.solve_change_state(
        ice_thickness=ice_thickness,
        new_temperature=cable_temperature,
        wind_pressure=wind_pressure,
        wind_direction="clockwise",
    )

    return {"success": True}
