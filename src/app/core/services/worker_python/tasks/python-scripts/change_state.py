from dataclasses import dataclass

import logging

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
    spanLoads: list[SpanLoad]


def change_state(js_inputs: dict):
    global \
        engine, \
        plt_line, \
        base_plt_line, \
        base_engine, \
        js_to_python, \
        apply_span_loads, \
        get_coordinates

    # logger.debug("python_inputs: ", str(js_inputs))
    change_state_inputs = js_to_python(js_inputs)  # type: ignore
    # print("change_state_inputs", change_state_inputs)
    climate = ClimateCharge(**change_state_inputs["climate"])
    # print(change_state_inputs)
    logger.debug("python_inputs: ", change_state_inputs)
    wind_pressure = climate.windPressure
    cable_temperature = climate.cableTemperature
    ice_thickness = climate.iceThickness / 100  # in meters in the engine

    apply_span_loads(change_state_inputs["spanLoads"])

    engine.solve_adjustment()
    engine.solve_change_state(
        ice_thickness=ice_thickness,
        new_temperature=cable_temperature,
        wind_pressure=wind_pressure,
        wind_sense="clockwise",
    )
    section_length = len(engine.section_array.data)
    base_section_length = (
        len(base_engine.section_array.data) if base_engine else section_length
    )
    return {
        "current": get_coordinates(plt_line, False, 0, section_length - 1),
        "base": get_coordinates(base_plt_line, False, 0, base_section_length - 1)
        if base_plt_line
        else None,
    }
