from dataclasses import dataclass

from enum import Enum


class LoadType(Enum):
    PUNCTUAL = "punctual"
    MARKING = "marking"


@dataclass
class SupportLoadInputs:
    support_number: int
    load_type: LoadType
    free_positioning: bool
    point_load_dist: float
    span_load: float


def add_load(js_inputs: dict):
    python_inputs: SupportLoadInputs = js_inputs.to_py()
    print("python_inputs: ", python_inputs)
    return {"coordinates": [132, 35, 80]}
