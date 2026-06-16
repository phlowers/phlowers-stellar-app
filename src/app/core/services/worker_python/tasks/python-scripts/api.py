# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging
from datetime import datetime

from stellar_engine.core import pose_table, initialize_study
from stellar_engine.data import geography
from stellar_engine.entities import output
from stellar_engine.tools import (
    guying,
    param_calibration,
    temperature,
    papoto,
)
from stellar_engine.plot import plot_2d, plot_settings, supports_coords
import stellar_engine.plot.obstacles as obst

from mechaphlowers import SectionStudy
import mechaphlowers as mph
from stellar_engine.utils import get_section_middle_span
from functools import wraps

# duplicate from functions.py

logger = logging.getLogger(__name__)
LOG_INPUTS = True

study: SectionStudy
base_study: SectionStudy


def debug_log(func):
    """Decorator that logs function entry and completion with debug level."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        func_name = func.__name__
        logger.debug(f"===> {func_name} triggered")
        result = func(*args, **kwargs)
        logger.debug(f"===> {func_name} completed")
        return result
    return wrapper

def default_converter(value, _ignored1, _ignored2):
    """Convert js Date object into python Datetime object"""
    logger.debug("===> default_converter triggered")

    if value.constructor.name == "Date":
        return datetime.fromtimestamp(value.valueOf() / 1000)
    logger.debug(f"===> default_converter returning finished")
    return value


@debug_log
def calculate_guying(js_inputs):
    global study
    # str(type(obj)) == "<class 'pyodide.ffi.JsNull'>"
    # put .to_py() here? or in stellar-engine?
    inputs = js_inputs.to_py()

    return guying.calculate_guying(inputs, engine=study.balance_engine)


@debug_log
def parameter_15_without_wind(js_inputs):
    global study
    return param_calibration.parameter_15_without_wind(
        inputs=js_inputs.to_py(), engine=study.balance_engine
    )


@debug_log
def temperature_calculation(js_inputs):
    global study
    return temperature.temperature_calculation(
        inputs=js_inputs.to_py(default_converter=default_converter), engine=study.balance_engine
    )


@debug_log
def calculate_papoto(js_inputs):
    return papoto.calculate_papoto(inputs=js_inputs.to_py())


@debug_log
def get_support_coordinates(js_inputs):
    return supports_coords.get_support_coordinates(js_to_python(js_inputs))


# def change_state(js_input):
#     change_state_inputs = js_to_python(js_inputs)  # type: ignore
#     return run_solver.change_state(change_state_inputs, engine, plt_line, base_engine, base_plt_line)


@debug_log
def refresh_projection(js_inputs: dict):
    global study, base_study
    python_inputs = js_to_python(js_inputs)
    return plot_2d.refresh_projection(python_inputs, study, base_study)


@debug_log
def get_aspect_ratio(js_inputs):
    global study
    py_inputs = js_inputs.to_py()
    logger.debug(f"js_inputs for aspect ratio: {py_inputs}")

    return plot_settings.get_aspect_ratio(
        py_inputs, study, py_inputs["startSupport"], py_inputs["endSupport"]
    )


@debug_log
def extract_obstacles_inputs(js_inputs):
    py_inputs = js_inputs.to_py()
    middle_span = get_section_middle_span(
        py_inputs["startSupport"], py_inputs["endSupport"]
    )
    project = py_inputs["view"] == "2D"
    return py_inputs["obstacles"], project, middle_span


@debug_log
def get_wind_incidence(js_inputs):
    python_inputs = js_to_python(js_inputs)
    return temperature.get_wind_attack_angle(python_inputs)


@debug_log
def add_obstacles(js_inputs):
    logger.debug(f"js_inputs: {js_inputs.to_py()}")
    obstacles, project, middle_span = extract_obstacles_inputs(js_inputs)
    global engine, plt_line
    return obst.add_obstacles(
        obstacles, engine, plt_line, project=project, support_index=middle_span
    )


@debug_log
def delete_obstacle(js_inputs):
    py_inputs = js_inputs.to_py()
    uuid = py_inputs["uuid"]
    middle_span = get_section_middle_span(
        py_inputs["startSupport"], py_inputs["endSupport"]
    )
    project = py_inputs["view"] == "2D"
    global engine, plt_line
    return obst.delete_obstacle(
        uuid, plt_line, project=project, support_index=middle_span
    )


@debug_log
def clear_obstacles():
    # TODO: clear_obstacles currently has no inputs — it cannot determine view/span.
    # This function needs to be refactored to accept inputs (startSupport, endSupport, view).
    global engine, plt_line
    return obst.add_obstacles([], engine, plt_line, project=True, support_index=0)


@debug_log
def calculate_obstacles_distances(js_inputs):
    global plt_line
    obstacles, project, middle_span = extract_obstacles_inputs(js_inputs)

    logger.debug(f"js_inputs for distance calculation: {js_inputs.to_py()}")
    result = obst.compute_distances(
        inputs=obstacles,
        project=project,
        plot_engine=plt_line,
        support_index=middle_span,
    )

    logger.debug(f"Distances result: {result}")
    return result


@debug_log
def compute_localization(js_inputs):
    return geography.compute_localization(js_to_python(js_inputs))


@debug_log
def import_lambert(js_inputs):
    return geography.import_lambert(js_to_python(js_inputs))


@debug_log
def import_lambert_and_validate(js_inputs):
    return geography.import_lambert_and_validate(js_to_python(js_inputs))


@debug_log
def get_equivalent_span():
    global study
    return {"equivalentSpan": pose_table.get_equivalent_span(study.balance_engine)}


@debug_log
def get_pose_table(js_inputs):
    global study
    return pose_table.get_pose_table(js_to_python(js_inputs), study.balance_engine)

@debug_log
def load_initialize_study(js_inputs):
    global study, base_study
    # global engine, plt_line, base_engine, base_plt_line

    python_inputs = js_to_python(js_inputs)

    study, base_study = initialize_study(python_inputs)
    print(f"Study initialized. Study: {study}, Base Study: {base_study}")

    section_length = len(study.balance_engine)
    base_section_length = len(base_study.balance_engine)

    return  {
        "current": output.get_coordinates(
            study, False, 0, section_length - 1
        ),
        "base": output.get_coordinates(
            base_study, False, 0, base_section_length - 1
        ),
    }

    
@debug_log
def get_config():
    return {"resolution": mph.options.graphics.resolution}

@debug_log
def set_resolution(js_inputs):
    python_inputs = js_to_python(js_inputs)
    resolution = python_inputs["resolution"]
    mph.options.graphics.resolution = resolution
    return {"success": True, "resolution": resolution}



