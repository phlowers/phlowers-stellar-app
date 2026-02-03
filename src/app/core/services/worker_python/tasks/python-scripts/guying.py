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
    print("python_inputs: ", js_inputs.to_py())
    guying_inputs = GuyingInputs(**js_inputs.to_py())
    guying = Guying(engine)
    guying_results = guying.get_guying_results_span_view(
        span_index=guying_inputs.selectedSpanIndex,
        with_pulley=guying_inputs.hasPulley,
        guying_altitude=guying_inputs.altitude,
        guying_horizontal_distance=guying_inputs.horizontalDistance,
        selected_support=guying_inputs.selectedSupport.lower(),
    )
    print(guying_results)
    print(guying_results.value_dict)
    # TODO: hard code units?
    return {
        "tensionInGuy": guying_results.guying_tension.to("daN").m,
        "guyAngle": guying_results.guying_angle_degrees.to("deg").m,
        "chargeVUnderConsole": guying_results.vertical_force.to("daN").m,
        "chargeLIfPulley": guying_results.longitudinal_force.to("daN").m,
        "chargeHUnderConsole": 0,
    }
