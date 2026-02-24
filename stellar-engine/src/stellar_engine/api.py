from mechaphlowers import BalanceEngine
from mechaphlowers.core.models.guying import Guying

from stellar_engine.validation import GuyingInputs


def calculate_guying(inputs: dict, engine: BalanceEngine):
    guying_inputs = GuyingInputs(**inputs.to_py())
    guying = Guying(engine)
    guying_results = guying.compute(
        index=guying_inputs.selectedSpanIndex,
        with_pulley=guying_inputs.hasPulley,
        altitude=guying_inputs.altitude,
        horizontal_distance=guying_inputs.horizontalDistance,
        side=guying_inputs.selectedSupport.lower(),
        view="span",
    )

    # hard code units?
    return {
        "tensionInGuy": guying_results.guying_tension.to("daN").m,
        "guyAngle": guying_results.guying_angle_degrees.to("deg").m,
        "chargeVUnderConsole": guying_results.vertical_force.to("daN").m,
        "chargeLIfPulley": guying_results.longitudinal_force.to("daN").m,
        "chargeHUnderConsole": 0,
    }
