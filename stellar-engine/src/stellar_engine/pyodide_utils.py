import logging
from datetime import datetime

from stellar_engine.utils import make_debug_log

logger = logging.getLogger("stellar_engine")

debug_log = make_debug_log(logger, prefix="pyodideUtils")


def convert_jsnull(obj) -> object:
    """Recursively convert JavaScript null (jsnull) to Python None.

    Pyodide's to_py() converts JS null to a special 'jsnull' object instead of None.
    This function traverses nested structures and replaces all jsnull with None.
    """
    # Check if it's jsnull by comparing string representation
    if (
        str(type(obj)) == "<class 'pyodide.ffi.JsNull'>"
        or str(obj) == "jsnull"
    ):
        return None
    elif isinstance(obj, dict):
        return {k: convert_jsnull(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_jsnull(item) for item in obj]

    return obj


def js_to_python(js_inputs) -> dict:
    """Convert JavaScript inputs to Python dict, handling null values."""
    return convert_jsnull(js_inputs.to_py())


@debug_log
def default_converter(value, _ignored1, _ignored2):
    """Convert js Date object into python Datetime object"""
    if value.constructor.name == "Date":
        return datetime.fromtimestamp(value.valueOf() / 1000)
    return value
