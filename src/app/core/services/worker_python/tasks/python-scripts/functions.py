import numpy as np
import pandas as pd
from mechaphlowers.entities.arrays import SectionArray, CableArray
import mechaphlowers as mph
from mechaphlowers import BalanceEngine, PlotEngine, units
from typing import Optional
from dataclasses import dataclass
from mechaphlowers.entities.shapes import SupportShape
from mechaphlowers.data.measures import PapotoParameterMeasure
from functools import wraps
import logging
from importlib.metadata import version
import sys
import json

RESOLUTION = 100
# init a logger to print to stdout
logger = logging.getLogger("mechaphlowers")
# Set logger level to INFO so info messages are shown
logger.setLevel(logging.WARNING)

# configure handler to print to stdout
handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

logger.info(f"mechaphlowers version: {version('mechaphlowers')}")
import stellar_engine
logger.info(f"stellar_engine version: {version('stellar_engine')}")

def init_config():
    mph.options.graphics.resolution = RESOLUTION
    mph.options.input_units.cable_array["electric_resistance_20"] = "ohm/km"


def convert_jsnull(obj):
    """Recursively convert JavaScript null (jsnull) to Python None.

    Pyodide's to_py() converts JS null to a special 'jsnull' object instead of None.
    This function traverses nested structures and replaces all jsnull with None.
    """
    # Check if it's jsnull by comparing string representation
    if str(type(obj)) == "<class 'pyodide.ffi.JsNull'>" or str(obj) == "jsnull":
        return None
    elif isinstance(obj, dict):
        return {k: convert_jsnull(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_jsnull(item) for item in obj]

    return obj


def js_to_python(js_inputs) -> dict:
    """Convert JavaScript inputs to Python dict, handling null values."""
    return convert_jsnull(js_inputs.to_py())


def set_log_level(js_inputs: dict):
    python_inputs = js_to_python(js_inputs)
    log_level = python_inputs["activateDebugLogs"]

    print("log_level: ", log_level)
    logger.setLevel(logging.DEBUG if log_level else logging.WARNING)
    return {"success": True}

def set_resolution(js_inputs):
    python_inputs = js_to_python(js_inputs)
    resolution = python_inputs["resolution"]
    mph.options.graphics.resolution = resolution
    return {"success": True, "resolution": resolution}


def get_config():
    return {"resolution": RESOLUTION}


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
    towerModel: Optional[str] = None
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
    id: str
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
    is_polynomial: bool
    diameter_heart: float
    section_conductor: float
    section_heart: float
    solar_absorption: float
    emissivity: float
    electric_resistance_20: float
    linear_resistance_temperature_coef: float
    radial_thermal_conductivity: float
    has_magnetic_heart: bool


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
    ground_altitude = []

    for index, support in enumerate(supports):
        name.append(support.name or f"Support {index}")
        if index == 0 or index == len(supports) - 1:
            suspension.append(False)
        else:
            suspension.append(True)
        altitude.append(support.attachmentHeight)
        crossarm_length.append(support.armLength or 0)
        insulator_length.append(support.chainLength or 1)
        span_length.append(support.spanLength)
        line_angle.append(support.spanAngle)
        insulator_mass.append(support.chainWeight or 0)
        load_mass.append(0)
        load_position.append(0)
        ground_altitude.append(support.supportFootAltitude)

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
        "ground_altitude": ground_altitude,
    }
    return pd.DataFrame(section_data)


engine = None
plt_line = None
base_engine = None
base_plt_line = None


def parse_span_loads(span_loads: list) -> tuple[np.ndarray, np.ndarray]:
    """Convert raw span load dicts into position and mass arrays.

    Always returns arrays of size N = engine.support_number, matching the full
    SectionArray (including the last anchor row).  engine.add_loads requires
    "arrays of size matching the number of supports" (mechaphlowers docstring).

    span_loads may have fewer entries than N when the charge was saved before all
    supports existed, or when recheckSpanLoads was not applied before persisting.
    Missing entries default to position=0, mass=0 (no load on that span).
    """
    global engine
    section_size = engine.support_number
    span_lengths = engine.section_array.data["span_length"].to_numpy()
    load_position_list = [0.0] * section_size
    load_weight_list_daN = [0.0] * section_size

    for index, span in enumerate(span_loads[:section_size]):
        try:
            if span['referenceSupport'] == 'LEFT':
                load_position_list[index] = span["loadPosition"]
            elif span['referenceSupport'] == 'RIGHT':
                if 0 <= index < len(span_lengths):
                    span_length = span_lengths[index]
                    load_position_list[index] = span_length - span["loadPosition"]
                else:
                    logging.warning(
                        "Span load index %s is out of bounds for span_length array (size %s). "
                        "Defaulting load position to 0.",
                        index,
                        len(span_lengths),
                    )
            else:
                load_position_list[index] = 0

            if span['type'] == 'punctual':
                # Use a tiny epsilon instead of 0 so the PlotEngine registers
                # the load position and returns coordinates in get_loads_coords.
                # A zero mass causes PlotEngine.get_loads_coords() to return no
                # entry for that span, which prevents the marker from being drawn
                # in createLoadAnnotations.ts (condition: spanIndex in load_coords).
                # TODO: replace this epsilon with a proper PlotEngine API if
                # mechaphlowers ever exposes register_load_position() without mass.
                # See: docs-sphinx/source/user_docs/developer_guide/bugfixes/load_weight_zero_marker_fix.md
                weight = span["loadWeight"]
                load_weight_list_daN[index] = weight if weight != 0 else 1e-6
            else:
                load_weight_list_daN[index] = 0.01
        except KeyError as e:
            logging.warning(
                "Span load at index %s is missing required key %s. "
                "Skipping with defaults (position=0, weight=0).",
                index,
                e,
            )
    load_mass_kg = units(load_weight_list_daN, 'daN').to('kg').magnitude
    return np.array(load_position_list), np.array(load_mass_kg)


def apply_span_loads(span_loads: list):
    """Set span loads on the engine, replacing any previously applied loads.

    Always calls engine.add_loads to ensure stale loads from previous
    calculations are cleared, even when the list is empty or all loads are zero.
    """
    global plt_line, engine
    if not span_loads:
        # Clear any previously applied loads with a zero array of the right size
        n = engine.support_number
        load_position_meters, load_mass = np.zeros(n), np.zeros(n)
    else:
        load_position_meters, load_mass = parse_span_loads(span_loads)
    engine.add_loads(load_position_meters, load_mass)
    plt_line.reset(engine)


def get_section_middle_span(start_support: int, end_support: int):
    return (start_support + end_support) // 2


def get_coordinates(
    plt_line: PlotEngine,
    project: bool = False,
    start_support: int = 0,
    end_support: int = 0,
):
    middle_span = get_section_middle_span(start_support, end_support)
    span, supports, insulators = plt_line.section_pts.get_points_for_plot(
        project=project, frame_index=middle_span
    )
    vtl_under_chain = list(engine.balance_model.vhl_under_chain().vhl)
    vtl_under_console = list(engine.balance_model.vhl_under_console().vhl)
    # vtl = vtl_under_chain.vtl)

    loads_coords = plt_line.get_loads_coords(
        project=project, frame_index=middle_span)
    line_angle_rad = engine.section_array.data.line_angle.to_numpy()
    result = {
        "spans": span.coords,
        "insulators": insulators.coords,
        "supports": supports.coords,
        "line_angle": units(line_angle_rad, 'rad').to('grad').m.tolist(),
        "vtl_under_chain": [v.value().tolist() for v in vtl_under_chain],
        "vtl_under_console": [v.value().tolist() for v in vtl_under_console],
        "r_under_chain": engine.balance_model.vhl_under_chain().R.value().tolist(),
        "r_under_console": engine.balance_model.vhl_under_console().R.value().tolist(),
        "ground_altitude": engine.section_array.data.ground_altitude.tolist(),
        "displacement": engine.get_displacement().T.tolist(),
        "load_angle": engine.cable_loads.load_angle.tolist(),
        "span_length": engine.section_array.data.span_length.tolist(),
        "loads_coords": loads_coords,
    }
    result_spans = engine.get_data_spans()
    result.update(result_spans)
    return result


def init_section(js_inputs: dict):
    global engine, plt_line, base_engine, base_plt_line
    python_inputs = js_to_python(js_inputs)
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
    input_charges = input_section["charges"] if "charges" in input_section else [
    ]
    input_charge = (
        None
        if not input_charges
        else next(
            charge
            for charge in input_charges
            if charge["uuid"] == input_section["selected_charge_uuid"]
        )
    )
    initial_condition = (
        InitialCondition(
            **input_initial_condition) if input_initial_condition else None
    )
    cable = Cable(**input_cable)

    if not input_section["supports"]:
        return {"error": "No supports data provided"}

    # Extract supports data from JavaScript inputs
    supports_data = []
    for support_js in input_section["supports"]:
        supports_data.append(Support(**support_js))
    df = generate_section_array(supports_data)

    section = SectionArray(df)
    section.angles_sense = "clockwise"
    # set sagging parameter and temperatur
    if initial_condition:
        section.sagging_parameter = initial_condition.base_parameters
    section.sagging_temperature = (
        initial_condition.base_temperature if initial_condition else 15
    )

    cable_array = CableArray(
        pd.DataFrame(
            {
                "section": [cable.section],
                "diameter": [cable.diameter],
                "linear_mass": [cable.linear_mass],
                "young_modulus": [cable.young_modulus],
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
                "diameter_heart": [cable.diameter_heart],
                "section_conductor": [cable.section_conductor],
                "section_heart": [cable.section_heart],
                "solar_absorption": [cable.solar_absorption],
                "emissivity": [cable.emissivity],
                "electric_resistance_20": [cable.electric_resistance_20],
                "linear_resistance_temperature_coef": [
                    cable.linear_resistance_temperature_coef
                ],
                "radial_thermal_conductivity": [cable.radial_thermal_conductivity],
                "has_magnetic_heart": [cable.has_magnetic_heart],
                "is_polynomial": [cable.is_polynomial],
            }
        )
    )
    cable_array.add_units(
        {
            "young_modulus": "MPa",
            "dilatation_coefficient": "1/K",
        }
    )

    engine = BalanceEngine(cable_array=cable_array, section_array=section)
    plt_line = PlotEngine(engine)
    engine.solve_adjustment()
    engine.solve_change_state()

    # Create base engine state (before any climate changes)
    # by creating a separate BalanceEngine with same initial params
    base_section = SectionArray(df.copy())
    if initial_condition:
        base_section.sagging_parameter = initial_condition.base_parameters
    base_section.sagging_temperature = (
        initial_condition.base_temperature if initial_condition else 15
    )
    base_section.angles_sense = "clockwise"
    base_engine = BalanceEngine(
        cable_array=cable_array, section_array=base_section)
    base_plt_line = PlotEngine(base_engine)
    base_engine.solve_adjustment()
    base_engine.solve_change_state()

    climate = None
    if input_charge and "data" in input_charge and "climate" in input_charge["data"]:
        climate = input_charge["data"]["climate"]

    has_span_loads = (
        input_charge
        and "data" in input_charge
        and "spanLoads" in input_charge["data"]
        and len(input_charge["data"]["spanLoads"]) > 0
    )

    if has_span_loads:
        apply_span_loads(input_charge["data"]["spanLoads"])
        engine.solve_adjustment()

    if climate:
        engine.solve_change_state(
            # convert cm into m
            ice_thickness=climate["iceThickness"] / 100,
            new_temperature=climate["cableTemperature"],
            wind_pressure=climate["windPressure"],
            wind_sense="clockwise",
        )
    elif has_span_loads:
        engine.solve_change_state()

    section_length = len(engine.section_array.data)
    base_section_length = len(base_engine.section_array.data)
    return {
        "current": get_coordinates(plt_line, False, 0, section_length - 1),
        "base": get_coordinates(base_plt_line, False, 0, base_section_length - 1)
    }

def refresh_projection(js_inputs: dict):
    global plt_line, base_plt_line
    python_inputs = js_to_python(js_inputs)
    start_support = python_inputs["startSupport"]
    end_support = python_inputs["endSupport"]
    view = python_inputs["view"]
    project = view == "2d"

    current_coords = get_coordinates(
        plt_line, project, start_support, end_support)
    base_coords = get_coordinates(
        base_plt_line, project, start_support, end_support) if base_plt_line else None

    return {
        "sectionOutput": {
            "current": current_coords,
            "base": base_coords
        },
        "distances" : []
    }

def add_obstacles(js_inputs: dict):
    get_coordinates_result = get_coordinates(plt_line, False, 0, len(engine.section_array.data) - 1)
    get_coordinates_result["obstacles"] = [
        {
            "name": "obstacle_mock",
            "points": [[80, 20, 0]]
        }]
    result = {
        "current": get_coordinates_result,
    }
    return result


def calculate_obstacles_distances(js_inputs: dict):

    result = [{
        "obstacleUuid": "obstacle_mock",
        "points" : [{
            "pointIndex": 0,
            "linePoint": [87.13, -8.2, 12.76],
            "virtualPointHorizontal": [87.13, -8.2, 0],
            "virtualPointVertical": [80, 20, 12.76],
            "distanceDiagonal": 234,
            "distanceHorizontal": 555,
            "distanceVertical": 666,
        }]
    }]
    return result

init_config()
