# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from datetime import datetime

from stellar_engine.tools import (
    guying,
    param_calibration,
    temperature,
    papoto,
)
from stellar_engine.plot import plot_2d, supports_coords, run_solver

# duplicate from functions.py


def default_converter(value, _ignored1, _ignored2):
    """Convert js Date object into python Datetime object"""
    if value.constructor.name == "Date":
        return datetime.fromtimestamp(value.valueOf() / 1000)
    return value


def calculate_guying(js_inputs):
    global engine
    # str(type(obj)) == "<class 'pyodide.ffi.JsNull'>"
    # put .to_py() here? or in stellar-engine?
    inputs = js_inputs.to_py()

    return guying.calculate_guying(inputs, engine=engine)


def parameter_15_without_wind(js_inputs):
    global engine
    return param_calibration.parameter_15_without_wind(
        inputs=js_inputs.to_py(), engine=engine
    )


def temperature_calculation(js_inputs):
    global engine
    return temperature.temperature_calculation(
        inputs=js_inputs.to_py(default_converter=default_converter), engine=engine
    )


def calculate_papoto(js_inputs):
    return papoto.calculate_papoto(inputs=js_inputs.to_py())


def get_support_coordinates(js_inputs):
    return supports_coords.get_support_coordinates(js_to_python(js_inputs))


# def change_state(js_input):
#     change_state_inputs = js_to_python(js_inputs)  # type: ignore
#     return run_solver.change_state(change_state_inputs, engine, plt_line, base_engine, base_plt_line)

# def refresh_projection(js_inputs: dict):
#     global plt_line, base_plt_line
#     python_inputs = js_to_python(js_inputs)
#     return plot_2d.refresh_projection(python_inputs, engine, plt_line, base_plt_line)
