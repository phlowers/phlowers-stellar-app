# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import numpy as np
from mechaphlowers import TangentialSightingParameterMeasure
from mechaphlowers.config import options as cfg

DECIMAL_PRECISION = 1


def calculate_tangent_aiming(inputs):
    measure = TangentialSightingParameterMeasure()
    measure.measure_method(
        angle_to_cable_tangent=inputs["angleToCableTangent"],
        angle_to_left_support=inputs["angleToLeftSupport"],
        angle_to_right_support=inputs["angleToRightSupport"],
        span_length=inputs["spanLength"],
        input_height=inputs["inputHeight"],
        distance=inputs["distance"],
    )

    return {
        "parameter": float(np.round(measure.parameter, DECIMAL_PRECISION)),
        "uncertainty": float(
            np.round(measure.uncertainty(), DECIMAL_PRECISION)
        ),
        # Expressed in percent, like the criterion displayed by the UI
        "criterion": float(
            cfg.measure_uncertainty.max_accepted_uncertainty * 100
        ),
        "checkValidity": bool(measure.check_validity()),
    }
