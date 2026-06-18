from datetime import datetime
import logging

logger = logging.getLogger("stellar_engine")

def convert_jsnull(obj) -> object:
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


def default_converter(value, _ignored1, _ignored2):
    """Convert js Date object into python Datetime object"""
    logger.debug("===> default_converter triggered")

    if value.constructor.name == "Date":
        return datetime.fromtimestamp(value.valueOf() / 1000)
    logger.debug(f"===> default_converter returning finished")
    return value