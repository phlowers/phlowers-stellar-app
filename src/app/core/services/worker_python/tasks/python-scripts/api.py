# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging

from stellar_engine.core import geometry, manipulations, pose_table
from stellar_engine.core import initialize_study as stellar_initialize_study
from stellar_engine.core import loads
from stellar_engine.data import geography
from stellar_engine.tools import (
    guying,
    param_calibration,
    temperature,
    papoto,
)
from stellar_engine.plot import (
    plot_2d,
    plot_settings,
    run_solver,
    supports_coords,
)
import stellar_engine.plot.obstacles as obst

from mechaphlowers import SectionStudy
from mechaphlowers.config import options
from stellar_engine.utils import get_section_middle_span, make_debug_log

from stellar_engine.pyodide_utils import js_to_python, default_converter

logger = logging.getLogger("stellar_engine")
debug_log = make_debug_log(logger, prefix="API")

study: SectionStudy
base_study: SectionStudy


# ---------------------------tools----------------


@debug_log
def calculate_guying(js_inputs):
    global study
    # str(type(obj)) == "<class 'pyodide.ffi.JsNull'>"
    # put .to_py() here? or in stellar-engine?
    inputs = js_inputs.to_py()

    return guying.calculate_guying(inputs, engine=study.balance_engine)


@debug_log
def get_support_coordinates(js_inputs):
    return supports_coords.get_support_coordinates(js_to_python(js_inputs))


@debug_log
def get_pose_table(js_inputs):
    global study
    return pose_table.get_pose_table(
        js_to_python(js_inputs), study.balance_engine
    )


# ---------------------------measures----------------


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
        inputs=js_inputs.to_py(default_converter=default_converter),
        engine=study.balance_engine,
    )


@debug_log
def calculate_papoto(js_inputs):
    return papoto.calculate_papoto(inputs=js_inputs.to_py())


@debug_log
def get_wind_incidence(js_inputs):
    python_inputs = js_to_python(js_inputs)
    return temperature.get_wind_attack_angle(python_inputs)


# ---------------------------study core----------------


@debug_log
def initialize_study(js_inputs):
    global study, base_study

    python_inputs = js_to_python(js_inputs)

    study, base_study = stellar_initialize_study(python_inputs)
    logger.debug(
        f"Study initialized. Study: {study}, Base Study: {base_study}"
    )
    return {"success": True}


@debug_log
def change_state(js_inputs):
    global study
    change_state_inputs: dict = js_to_python(js_inputs)  # type: ignore
    if "reload" in change_state_inputs:
        reload = change_state_inputs["reload"]
    else:
        reload = False
    logger.debug(f"Reload value: {reload}")
    return run_solver.change_state(change_state_inputs, study, reload=reload)


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
def get_equivalent_span():
    global study
    return {
        "equivalentSpan": pose_table.get_equivalent_span(study.balance_engine)
    }


# ---------------------------obstacles----------------


@debug_log
def extract_obstacles_inputs(js_inputs):
    py_inputs = js_inputs.to_py()
    logger.debug(f"js_inputs for obstacle extraction: {py_inputs}")
    middle_span = get_section_middle_span(
        py_inputs["startSupport"], py_inputs["endSupport"]
    )
    project = py_inputs["view"] == "2d"
    return py_inputs["obstacles"], project, middle_span


@debug_log
def add_bulk_obstacles(js_inputs):
    logger.debug(f"js_inputs: {js_inputs.to_py()}")
    obstacles, _, _ = extract_obstacles_inputs(js_inputs)
    global study

    obst.add_bulk_obstacles(
        inputs={"obstacles": obstacles},
        study=study,
    )
    return {"success": True}


@debug_log
def add_single_obstacle(js_inputs):
    py_inputs = js_inputs.to_py()
    logger.debug(f"py_inputs: {py_inputs}")
    obstacle = py_inputs["obstacle"]
    middle_span = get_section_middle_span(
        py_inputs["startSupport"], py_inputs["endSupport"]
    )
    global study

    obst.add_single_obstacle({"obstacles": [obstacle]}, study, middle_span)
    return {"success": True}


@debug_log
def delete_obstacle(js_inputs):
    py_inputs = js_inputs.to_py()
    uuid = py_inputs["uuid"]
    middle_span = get_section_middle_span(
        py_inputs["startSupport"], py_inputs["endSupport"]
    )
    project = py_inputs["view"] == "2D"
    global study
    obst.delete_obstacle(
        uuid, study, project=project, support_index=middle_span
    )
    return {"success": True}


@debug_log
def clear_obstacles():
    global study
    obst.clear_obstacles(study, project=True, support_index=0)

    return {"success": True}


# ---------------------------loads----------------


@debug_log
def delete_all_loads():
    global study
    return loads.apply_span_loads(study, span_loads=[])


@debug_log
def delete_load(js_inputs):
    global study
    python_inputs = js_to_python(js_inputs)
    logger.debug(f"python_inputs for delete load: {python_inputs}")
    return loads.delete_load(python_inputs["supportIndex"], study)


@debug_log
def set_loads(js_inputs):
    global study
    python_inputs = js_to_python(js_inputs)
    logger.debug(f"python_inputs for set_loads: {python_inputs}")
    return loads.apply_span_loads(study, python_inputs["spanLoads"])


# ---------------------------distance measurement----------------


@debug_log
def measure_distance(js_inputs):
    global study
    python_inputs = js_to_python(js_inputs)
    support_index = python_inputs["supportIndex"]
    logger.debug(f"python_inputs for measure_distance: {python_inputs}")
    return geometry.measure_distance_angle(
        inputs=python_inputs, study=study, support_index=support_index
    )


@debug_log
def add_measure_distance_angle_points(js_inputs):
    global study
    python_inputs = js_to_python(js_inputs)
    support_index = python_inputs["supportIndex"]
    logger.debug(
        f"python_inputs for add_measure_distance_angle_points: {python_inputs}"
    )
    return geometry.add_measure_distance_angle_points(
        inputs=python_inputs, study=study, support_index=support_index
    )


@debug_log
def clear_measure_distance_angle_points():
    global study
    logger.debug("Clearing measure distance angle points.")
    return geometry.clear_measure_distance_angle_points(study=study)


# ---------------------------localization----------------


@debug_log
def compute_localization(js_inputs):
    return geography.compute_localization(js_to_python(js_inputs))


@debug_log
def import_lambert(js_inputs):
    return geography.import_lambert(js_to_python(js_inputs))


@debug_log
def import_lambert_and_validate(js_inputs):
    return geography.import_lambert_and_validate(js_to_python(js_inputs))


# --------------------------config----------------


@debug_log
def get_config():
    return {"resolution": options.graphics.resolution}


@debug_log
def set_resolution(js_inputs):
    python_inputs = js_to_python(js_inputs)
    resolution = python_inputs["resolution"]
    options.graphics.resolution = resolution
    return {"success": True, "resolution": resolution}


@debug_log
def shorten_lengthen_cable(js_inputs):
    global study
    logger.debug(js_to_python(js_inputs))
    out = manipulations.modify_cable(js_to_python(js_inputs), study)
    logger.debug(study.balance_engine.L_ref)
    logger.debug(study.position_engine.get_group_points().spans.coords[0][0:6])
    return out
