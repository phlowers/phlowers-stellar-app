# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from mechaphlowers import (
    BalanceEngine,
)
from mechaphlowers.core.models.guying import Guying

from stellar_engine.entities.inputs import (
    GuyingInputs,
)


def calculate_guying(inputs: dict, engine: BalanceEngine):
    guying_inputs = GuyingInputs(**inputs)
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

