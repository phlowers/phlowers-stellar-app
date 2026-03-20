# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from datetime import datetime

from stellar_engine import api

def default_converter(value, _ignored1, _ignored2):
    """Convert js Date object into python Datetime object
    """
    if value.constructor.name == "Date":
        return datetime.fromtimestamp(value.valueOf()/1000)
    return value

def calculate_guying(js_inputs: dict):
    global engine
    return api.calculate_guying(inputs=js_inputs.to_py(), engine=engine)


def parameter_15_without_wind(js_inputs):
    global engine
    return api.parameter_15_without_wind(inputs=js_inputs.to_py(), engine=engine)


def temperature_calculation(js_inputs):
    global engine
    return api.temperature_calculation(
        inputs=js_inputs.to_py(default_converter=default_converter), 
        engine=engine
    )