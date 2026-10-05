# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import numpy as np
from mechaphlowers import PapotoParameterMeasure

DECIMAL_PRECISION = 1


def calculate_papoto(inputs):
    spanLength = inputs["spanLength"]
    HL = inputs["HL"]
    H1 = inputs["H1"]
    H2 = inputs["H2"]
    H3 = inputs["H3"]
    HR = inputs["HR"]
    VL = inputs["VL"]
    V1 = inputs["V1"]
    V2 = inputs["V2"]
    V3 = inputs["V3"]
    VR = inputs["VR"]
    papoto = PapotoParameterMeasure()
    papoto(
        a=spanLength,
        HL=HL,
        VL=VL,
        HR=HR,
        VR=VR,
        H1=H1,
        V1=V1,
        H2=H2,
        V2=V2,
        H3=H3,
        V3=V3,
    )

    uncertainty_dict = papoto.uncertainty(draw_number=1000, angle_error=0.01)
    std_parameter = uncertainty_dict["std_parameter_valid_values"]
    return {
        "parameter": float(np.round(papoto.parameter[0], DECIMAL_PRECISION)),
        "parameter_1_2": float(
            np.round(papoto.parameter_1_2[0], DECIMAL_PRECISION)
        ),
        "parameter_2_3": float(
            np.round(papoto.parameter_2_3[0], DECIMAL_PRECISION)
        ),
        "parameter_1_3": float(
            np.round(papoto.parameter_1_3[0], DECIMAL_PRECISION)
        ),
        "checkValidity": bool(papoto.check_validity()[0]),
        "uncertainty": float(
            np.round(float(2 * std_parameter), DECIMAL_PRECISION)
        ),
    }
