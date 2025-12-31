from dataclasses import dataclass


@dataclass
class GuyingInputs:
    support_number: int
    horizontalDistance: float
    hasPulley: bool


def calculate_guying(js_inputs: dict):
    python_inputs: GuyingInputs = js_inputs.to_py()
    print("python_inputs: ", python_inputs)
    return {
        "tensionInGuy": 101,
        "guyAngle": 30,
        "chargeVUnderConsole": 102,
        "chargeHUnderConsole": 103,
        "chargeLIfPulley": 104,
    }
