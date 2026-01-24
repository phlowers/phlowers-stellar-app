from dataclasses import dataclass

import logging
from typing import List

import numpy as np

logger = logging.getLogger("mechaphlowers")
logger.setLevel(logging.WARNING)  # Set logger level to INFO so info messages are shown


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
    change_state_inputs = js_to_python(js_inputs) # type: ignore
    print("change_state_inputs", change_state_inputs)
    climate = ClimateCharge(**change_state_inputs["climate"])
    # punctual_load = PunctualLoad(**change_state_inputs["punctualLoad"])
    print(change_state_inputs)
    logger.debug("python_inputs: ", change_state_inputs)
    wind_pressure = climate.windPressure
    cable_temperature = climate.cableTemperature
    ice_thickness = climate.iceThickness / 100  # in meters in the engine

    punctual_load = change_state_inputs["spanLoads"]

    print(f"{punctual_load=}")
    # use pandas instead?
    load_position_meters = np.array([span["loadPosition"] for span in punctual_load])
    load_weight = np.array([span["loadWeight"] for span in punctual_load])


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