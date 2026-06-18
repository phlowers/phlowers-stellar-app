# # format_converters.py file

# # Copyright (c) 2026, RTE (http://www.rte-france.com)
# # This Source Code Form is subject to the terms of the Mozilla Public
# # License, v. 2.0. If a copy of the MPL was not distributed with this
# # file, You can obtain one at http://mozilla.org/MPL/2.0/.
# # SPDX-License-Identifier: MPL-2.0

# from datetime import datetime


# def js_to_python(js_inputs) -> dict:
#     """Convert JavaScript inputs to Python dict, handling null values."""
#     return convert_jsnull(js_inputs.to_py())


# def convert_jsnull(obj):
#     """Recursively convert JavaScript null (jsnull) to Python None.

#     Pyodide's to_py() converts JS null to a special 'jsnull' object instead of None.
#     This function traverses nested structures and replaces all jsnull with None.
#     """
#     # Check if it's jsnull by comparing string representation
#     if str(type(obj)) == "<class 'pyodide.ffi.JsNull'>" or str(obj) == "jsnull":
#         return None
#     elif isinstance(obj, dict):
#         return {k: convert_jsnull(v) for k, v in obj.items()}
#     elif isinstance(obj, list):
#         return [convert_jsnull(item) for item in obj]

#     return obj


# def default_converter(value, _ignored1, _ignored2):
#     """Convert js Date object into python Datetime object"""
#     if value.constructor.name == "Date":
#         return datetime.fromtimestamp(value.valueOf() / 1000)
#     return value
