from dataclasses import dataclass

import logging
from typing import List

import numpy as np

logger = logging.getLogger("mechaphlowers")
# Set logger level to WARNING so info messages are shown
logger.setLevel(logging.WARNING)


@dataclass
class ClimateCharge:
    windPressure: float
    cableTemperature: float
    symmetryType: str
    iceThickness: float
    frontierSupportNumber: float
    iceThicknessBefore: float
    iceThicknessAfter: float


@dataclass
class SpanLoad:
    loadPosition: float
    loadWeight: float


@dataclass
class ChangeStateInput:
    climate: ClimateCharge
    spanLoads: List[SpanLoad]


def change_state(js_inputs: dict):
    global engine, plt_line, js_to_python

    # logger.debug("python_inputs: ", str(js_inputs))
    change_state_inputs = js_to_python(js_inputs)  # type: ignore
    # print("change_state_inputs", change_state_inputs)
    climate = ClimateCharge(**change_state_inputs["climate"])
    # print(change_state_inputs)
    logger.debug("python_inputs: ", change_state_inputs)
    wind_pressure = climate.windPressure
    cable_temperature = climate.cableTemperature
    ice_thickness = climate.iceThickness / 100  # in meters in the engine

    punctual_load = change_state_inputs["spanLoads"]
    load_position_list = []
    load_weight_list = []
    for index, span in enumerate(punctual_load):
        if span["referenceSupport"] == "LEFT":
            load_position_list.append(span["loadPosition"])
        elif span["referenceSupport"] == "RIGHT":
            span_length = engine.section_array.data["span_length"].to_numpy()[
                index]
            load_position_list.append(span_length - span["loadPosition"])
        else:
            load_position_list.append(0)

        if span["type"] == "punctual":
            load_weight_list.append(span["loadWeight"])
        else:
            # Temporary work around to factor in marking
            load_weight_list.append(0.01)

    load_position_meters = np.array(load_position_list)
    load_weight = np.array(load_weight_list)

    # Small optimization if no loads
    if (load_position_meters != 0).any() and (load_position_meters != 0).any():
        engine.add_loads(load_position_meters, load_weight)
        plt_line = plt_line.generate_reset()

    engine.solve_adjustment()
    engine.solve_change_state(
        ice_thickness=ice_thickness,
        new_temperature=cable_temperature,
        wind_pressure=wind_pressure,
    )
    return get_coordinates(plt_line)
