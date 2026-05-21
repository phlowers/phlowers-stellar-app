# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging
from datetime import datetime

logger = logging.getLogger(__name__)
LOG_INPUTS = True

from stellar_engine.core import pose_table
from stellar_engine.data import geography
from stellar_engine.tools import (
    guying,
    param_calibration,
    temperature,
    papoto,
)
from stellar_engine.plot import plot_settings, supports_coords
import stellar_engine.plot.obstacles as obst

# duplicate from functions.py


def default_converter(value, _ignored1, _ignored2):
    """Convert js Date object into python Datetime object"""
    logger.debug("default_converter triggered")

    if value.constructor.name == "Date":
        return datetime.fromtimestamp(value.valueOf() / 1000)
    return value


def calculate_guying(js_inputs):
    logger.debug("calculate_guying triggered")

    global engine
    # str(type(obj)) == "<class 'pyodide.ffi.JsNull'>"
    # put .to_py() here? or in stellar-engine?
    inputs = js_inputs.to_py()

    return guying.calculate_guying(inputs, engine=engine)


def parameter_15_without_wind(js_inputs):
    logger.debug("parameter_15_without_wind triggered")

    global engine
    return param_calibration.parameter_15_without_wind(
        inputs=js_inputs.to_py(), engine=engine
    )


def temperature_calculation(js_inputs):
    logger.debug("temperature_calculation triggered")
    global engine
    return temperature.temperature_calculation(
        inputs=js_inputs.to_py(default_converter=default_converter), engine=engine
    )


def calculate_papoto(js_inputs):
    logger.debug("calculate_papoto triggered")
    return papoto.calculate_papoto(inputs=js_inputs.to_py())


def get_support_coordinates(js_inputs):
    logger.debug("===> get_support_coordinates triggered")
    return supports_coords.get_support_coordinates(js_to_python(js_inputs))


# def change_state(js_input):
#     change_state_inputs = js_to_python(js_inputs)  # type: ignore
#     return run_solver.change_state(change_state_inputs, engine, plt_line, base_engine, base_plt_line)

# def refresh_projection(js_inputs: dict):
#     global plt_line, base_plt_line
#     python_inputs = js_to_python(js_inputs)
#     return plot_2d.refresh_projection(python_inputs, engine, plt_line, base_plt_line)


def get_aspect_ratio(js_inputs):
    logger.debug("get_aspect_ratio triggered")
    global plt_line
    py_inputs = js_inputs.to_py()
    logger.debug(f"js_inputs for aspect ratio: {py_inputs}")
    # middle_span = get_section_middle_span(py_inputs["startSupport"], py_inputs["endSupport"])
    project = py_inputs["view"] == "2D"
    return plot_settings.get_aspect_ratio(
        py_inputs, plt_line, py_inputs["startSupport"], py_inputs["endSupport"]
    )


def extract_obstacles_inputs(js_inputs):
    logger.debug("===> extract_obstacles_inputs triggered")
    py_inputs = js_inputs.to_py()
    middle_span = get_section_middle_span(
        py_inputs["startSupport"], py_inputs["endSupport"]
    )
    project = py_inputs["view"] == "2D"
    return py_inputs["obstacles"], project, middle_span


def get_wind_incidence(js_inputs):
    python_inputs = js_to_python(js_inputs)
    return temperature.get_wind_attack_angle(python_inputs)


def add_obstacles(js_inputs):
    logger.debug("===> add_obstacles triggered")
    logger.debug(f"js_inputs: {js_inputs.to_py()}")
    obstacles, project, middle_span = extract_obstacles_inputs(js_inputs)
    global engine, plt_line
    return obst.add_obstacles(
        obstacles, engine, plt_line, project=project, support_index=middle_span
    )


def delete_obstacle(js_inputs):
    logger.debug("===> delete_obstacle triggered")
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


def clear_obstacles():
    logger.debug("===> clear_obstacles triggered")
    # TODO: clear_obstacles currently has no inputs — it cannot determine view/span.
    # This function needs to be refactored to accept inputs (startSupport, endSupport, view).
    global engine, plt_line
    return obst.add_obstacles([], engine, plt_line, project=True, support_index=0)


def calculate_obstacles_distances(js_inputs):
    global plt_line
    logger.debug("===> calculate_obstacles_distances triggered")

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


def compute_localization(js_inputs):
    return geography.compute_localization(js_to_python(js_inputs))


def import_lambert(js_inputs):
    return geography.import_lambert(js_to_python(js_inputs))


def import_lambert_and_validate(js_inputs):
    return geography.import_lambert_and_validate(js_to_python(js_inputs))


def get_pose_table(js_inputs):
    global engine
    return pose_table.get_pose_table(js_to_python(js_inputs), engine)