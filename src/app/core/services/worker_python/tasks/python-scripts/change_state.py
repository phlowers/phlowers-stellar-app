from dataclasses import dataclass

import logging

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


def change_state(js_inputs: dict):
    global engine, plt_line, base_plt_line, base_engine, js_to_python

    # logger.debug("python_inputs: ", str(js_inputs))
    change_state_inputs = js_to_python(js_inputs) # type: ignore
    print("change_state_inputs", change_state_inputs)
    climate = ClimateCharge(**change_state_inputs["climate"])
    print(change_state_inputs)
    logger.debug("python_inputs: ", change_state_inputs)
    wind_pressure = climate.windPressure
    cable_temperature = climate.cableTemperature
    ice_thickness = climate.iceThickness / 100  # in meters in the engine

    punctual_load = change_state_inputs["spanLoads"]
    load_position_list = []
    load_weight_list = []
    for index, span in enumerate(punctual_load):
        if span['referenceSupport'] == 'LEFT':
            load_position_list.append(span["loadPosition"])
        elif span['referenceSupport'] == 'RIGHT':
            span_length = engine.section_array.data["span_length"].to_numpy()[index]
            load_position_list.append(span_length - span["loadPosition"])
        else:
            load_position_list.append(0)

        if span['type'] == 'punctual':
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
    section_length = len(engine.section_array.data)
    base_section_length = len(base_engine.section_array.data) if base_engine else section_length
    return {
        "current": get_coordinates(plt_line, False, 0, section_length - 1),
        "base": get_coordinates(base_plt_line, False, 0, base_section_length - 1) if base_plt_line else None
    }