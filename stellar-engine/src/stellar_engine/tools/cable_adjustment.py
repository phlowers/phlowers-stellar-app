# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


from mechaphlowers import units
from mechaphlowers.core.models.adjustment_angles.adjustment_model import (
    compute_adjustment_angles,
)

from stellar_engine.entities.errors import SelectorInputError
from stellar_engine.entities.inputs import CableAdjustmentInputs


def calculate_cable_adjustment(inputs: dict):
    """Compute the sighting angles (grades) at the mid-span sag for cable adjustment.

    Expected input keys: spanIndex, spanLength, leftHorizontalAngle, rightHorizontalAngle,
    leftVerticalAngle, rightVerticalAngle, support ('LEFT' | 'RIGHT'),
    tacheometerHorizontalDistance, adjustmentParameter.

    Inputs and output angles are in grad. Converts into rad
    """
    print("AAAAAAAAAAAAAAAAAA")
    print(inputs)
    table_inputs = CableAdjustmentInputs(**inputs)
    if table_inputs.support == 'LEFT':
        side = 'left'
    elif table_inputs.support == 'RIGHT':
        side = 'right'
    else:
        raise SelectorInputError(
            f"Expected 'LEFT' or 'RIGHT'. Got {table_inputs.support}"
        )
    horizontal_angle, vertical_angle = compute_adjustment_angles(
        span_length=table_inputs.spanLength,
        HL=units(table_inputs.leftHorizontalAngle, "grad").to("rad").m,
        VL=units(table_inputs.leftVerticalAngle, "grad").to("rad").m,
        HR=units(table_inputs.rightHorizontalAngle, "grad").to("rad").m,
        VR=units(table_inputs.rightVerticalAngle, "grad").to("rad").m,
        dist_support=table_inputs.tacheometerHorizontalDistance,
        parameter=table_inputs.adjustmentParameter,
        side=side,
    )
    return {
        "horizontalSightAngle": units(horizontal_angle, "rad").to("grad").m,
        "verticalSightAngle": units(vertical_angle, "rad").to("grad").m,
    }
