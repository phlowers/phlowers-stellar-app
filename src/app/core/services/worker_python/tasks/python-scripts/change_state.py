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
    punctual_load = change_state_inputs["spanLoads"]
    print(change_state_inputs)
    logger.debug("python_inputs: ", change_state_inputs)
    wind_pressure = climate.windPressure
    cable_temperature = climate.cableTemperature
    ice_thickness = climate.iceThickness / 100  # in meters in the engine
    
    load_weight = np.array([load["loadWeight"] for load in punctual_load])
    load_position = np.array([load["loadPosition"] for load in punctual_load])
    print("load_position", load_position)
    print("load_weight", load_weight)
    print("engine.L_ref", engine.L_ref)
    # load_weight = punctual_load.loadWeights
    # load_position_meters = punctual_load.loadPositions
    # Warning unit: N or kg
    spans_nb = engine.support_number
    # load_weight = np.full(spans_nb, 0)
    # load_weight[0] = 10000
    load_position_ratio = load_position / np.append(engine.L_ref, 0)
    # load_position_ratio = np.full(spans_nb, 0)
    print("load_position_ratio", load_position_ratio)
    # load_position_ratio[0] = 0.4
    print("load_position_ratio", load_position_ratio)
    engine.section_array._data["load_mass"] = load_weight
    engine.section_array._data["load_position"] = load_position_ratio
    # engine.reset()
    engine.solve_adjustment()
    engine.solve_change_state(
        ice_thickness=ice_thickness,
        new_temperature=cable_temperature,
        wind_pressure=wind_pressure,
    )
    return get_coordinates(plt_line)