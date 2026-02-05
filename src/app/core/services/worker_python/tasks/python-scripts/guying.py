from dataclasses import dataclass
from typing import Literal
from mechaphlowers.core.models.guying import Guying


@dataclass
class GuyingInputs:
    horizontalDistance: float
    altitude: float
    hasPulley: bool
    selectedSpanIndex: int
    selectedSupport: Literal['LEFT' , 'RIGHT']


def calculate_guying(js_inputs: dict):
    guying_inputs = GuyingInputs(**js_inputs.to_py())
    guying = Guying(engine)
    guying_results = guying.compute(
        index=guying_inputs.selectedSpanIndex,
        with_pulley=guying_inputs.hasPulley,
        altitude=guying_inputs.altitude,
        horizontal_distance=guying_inputs.horizontalDistance,
        side=guying_inputs.selectedSupport.lower(),
        view="span"
    )

    # hard code units?
    return {
        "tensionInGuy": guying_results.guying_tension.to("daN").m,
        "guyAngle": guying_results.guying_angle_degrees.to("deg").m,
        "chargeVUnderConsole": guying_results.vertical_force.to("daN").m,
        "chargeLIfPulley": guying_results.longitudinal_force.to("daN").m,
        "chargeHUnderConsole": 0,
    }
