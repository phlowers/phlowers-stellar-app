import numpy as np
import pandas as pd
from mechaphlowers.entities.arrays import SectionArray, CableArray
import mechaphlowers as mph
from mechaphlowers import BalanceEngine, PlotEngine
from typing import Optional
from dataclasses import dataclass
from typing import List
import math

from importlib.metadata import version

print("mechaphlowers version: ", version("mechaphlowers"))


@dataclass
class Support:
    uuid: str
    number: Optional[float] = None
    name: Optional[str] = None
    spanLength: Optional[float] = None
    spanAngle: Optional[float] = None
    attachmentSet: Optional[str] = None
    attachmentHeight: Optional[float] = None
    heightBelowConsole: Optional[float] = None
    cableType: Optional[str] = None
    armLength: Optional[float] = None
    chainName: Optional[str] = None
    chainLength: Optional[float] = None
    chainWeight: Optional[float] = None
    chainV: Optional[bool] = None
    counterWeight: Optional[float] = None
    supportFootAltitude: Optional[float] = None
    attachmentPosition: Optional[str] = None
    chainSurface: Optional[float] = None


@dataclass
class InitialCondition:
    uuid: str
    name: str
    base_parameters: float
    base_temperature: float
    cable_pretension: float
    min_temperature: float
    max_wind_pressure: float
    max_frost_width: float


@dataclass
class Cable:
    name: str
    data_source: str
    section: float
    diameter: float
    young_modulus: float
    linear_mass: float
    dilatation_coefficient: float
    temperature_reference: float
    stress_strain_a0: float
    stress_strain_a1: float
    stress_strain_a2: float
    stress_strain_a3: float
    stress_strain_a4: float
    stress_strain_b0: float
    stress_strain_b1: float
    stress_strain_b2: float
    stress_strain_b3: float
    stress_strain_b4: float
    is_narcisse: bool


def generate_section_array(supports: list[Support]):
    # Generate a SectionArray
    name = []
    suspension = []
    altitude = []
    crossarm_length = []
    line_angle = []
    insulator_length = []
    span_length = []
    insulator_mass = []
    load_mass = []
    load_position = []

    for index, support in enumerate(supports):
        name.append(support.name or f"Support {index}")
        if index == 0 or index == len(supports) - 1:
            suspension.append(False)
        else:
            suspension.append(True)
        altitude.append(support.attachmentHeight)
        crossarm_length.append(support.armLength or 0)
        insulator_length.append(1)
        span_length.append(support.spanLength)
        line_angle.append(support.spanAngle)
        insulator_mass.append(200)
        load_mass.append(0)
        load_position.append(0)

    section_data = {
        "name": name,
        "suspension": suspension,
        "conductor_attachment_altitude": altitude,
        "crossarm_length": crossarm_length,
        "insulator_length": insulator_length,
        "insulator_mass": insulator_mass,
        "load_mass": load_mass,
        "load_position": load_position,
        "span_length": span_length,
        "line_angle": line_angle,
    }
    return pd.DataFrame(section_data)


def add_obstacle(df, x, y, z, type_obstacle, name_obstacle, support):
    df.x.cumsum()
    new_df = pd.DataFrame(
        {
            "x": [x],
            "y": [y],
            "z": [z],
            "type": [type_obstacle],
            "support": [support],
            "section": ["obstacle"],
        }
    )
    return pd.concat([df, new_df], ignore_index=True)


def split_points_into_their_spans(data: List[List[float]]) -> List[List[List[float]]]:
    spans = []
    new_span = []
    for row in data:
        if math.isnan(row[0]) and math.isnan(row[1]) and math.isnan(row[2]):
            spans.append(new_span)
            new_span = []
        else:
            new_span.append(row)
    return spans


mock_data = """"""


engine = None
plt_line = None


def get_coordinates(plt_line: PlotEngine):
    span_coords = plt_line.section_pts.get_spans("section").points(True)
    insulators_coords = plt_line.section_pts.get_insulators().points(True)
    supports_coords = plt_line.section_pts.get_supports().points(True)
    spans = split_points_into_their_spans(span_coords)
    insulators = split_points_into_their_spans(insulators_coords)
    supports = split_points_into_their_spans(supports_coords)
    result = {
        "spans": spans,
        "insulators": insulators,
        "supports": supports,
    }
    return result


def init_section(js_inputs: dict):
    global engine, plt_line
    python_inputs = js_inputs.to_py()
    # import json

    # js_inputs2 = globals()["js_inputs"].to_py()
    # js_inputs = json.loads(mock_data)
    # js_inputs = globals()["js_inputs"].to_py()
    # print("js_inputs: ", json.dumps(js_inputs))
    input_section = python_inputs["section"]
    input_cable = python_inputs["cable"]
    input_initial_conditions = input_section["initial_conditions"]
    input_initial_condition = (
        None
        if not input_initial_conditions
        else next(
            condition
            for condition in input_initial_conditions
            if condition["uuid"] == input_section["selected_initial_condition_uuid"]
        )
    )
    initial_condition = (
        InitialCondition(**input_initial_condition) if input_initial_condition else None
    )
    cable = Cable(**input_cable)

    if not input_section["supports"]:
        return {"error": "No supports data provided"}

    # Extract supports data from JavaScript inputs
    supports_data = []
    for support_js in input_section["supports"]:
        supports_data.append(Support(**support_js))
    np.random.seed(142)
    df = generate_section_array(supports_data)
    mph.options.graphics.resolution = 10

    section = SectionArray(df)
    # set sagging parameter and temperatur
    section.sagging_parameter = 2000
    section.sagging_temperature = (
        initial_condition.base_temperature if initial_condition else 20
    )

    cable_array = CableArray(
        pd.DataFrame(
            {
                "section": [cable.section],
                "diameter": [cable.diameter],
                "linear_mass": [cable.linear_mass],
                "young_modulus": [60],
                "dilatation_coefficient": [cable.dilatation_coefficient],
                "temperature_reference": [cable.temperature_reference],
                "a0": [cable.stress_strain_a0],
                "a1": [cable.stress_strain_a1],
                "a2": [cable.stress_strain_a2],
                "a3": [cable.stress_strain_a3],
                "a4": [cable.stress_strain_a4],
                "b0": [cable.stress_strain_b0],
                "b1": [cable.stress_strain_b1],
                "b2": [cable.stress_strain_b2],
                "b3": [cable.stress_strain_b3],
                "b4": [cable.stress_strain_b4],
            }
        )
    )

    engine = BalanceEngine(cable_array=cable_array, section_array=section)
    plt_line = PlotEngine.builder_from_balance_engine(engine)
    engine.solve_adjustment()
    engine.solve_change_state()
    return get_coordinates(plt_line)


def change_climate(js_inputs: dict):
    global engine, plt_line
    python_inputs = js_inputs.to_py()
    wind_pressure = python_inputs["windPressure"]
    cable_temperature = python_inputs["cableTemperature"]
    ice_thickness = python_inputs["iceThickness"]
    # section_length = len(engine.section_array.section_length)
    # print("section_length: ", section_length)
    engine.solve_change_state(new_temperature=cable_temperature * np.array([1] * 4))
    engine.solve_change_state(wind_pressure=wind_pressure * np.array([1] * 4))
    # engine.solve_change_state(ice_thickness=ice_thickness * np.array([1] * 4))
    return get_coordinates(plt_line)


# print("im in the main function")
# result = init_section()
