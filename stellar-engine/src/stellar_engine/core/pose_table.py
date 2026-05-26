# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import numpy as np
import pandas as pd
from mechaphlowers import (
    BalanceEngine,
    SectionArray,
)

from stellar_engine.entities.inputs import (
    PoseTableInputs,
)


# Assumes studio is already open to work and get an balance_engine
def get_pose_table(inputs: dict, balance_engine: BalanceEngine) -> dict:
    table_inputs = PoseTableInputs(**inputs)
    balance_engine_pose_table = build_engine_pose_table(balance_engine)
    sagging_parameter = balance_engine.section_array.sagging_parameter[0]

    last_value = (
        table_inputs.baseTemperature
        + table_inputs.numberValues * table_inputs.stepTemperature
    )
    temperature_array = np.arange(
        start=table_inputs.baseTemperature,
        stop=last_value,
        step=table_inputs.stepTemperature,
        dtype=np.float64,
    )
    parameter_array = []
    Th_array = []
    balance_engine_pose_table.solve_adjustment()
    for temperature in temperature_array:
        balance_engine_pose_table.solve_change_state(
            new_temperature=temperature
        )
        data_spans = balance_engine_pose_table.get_data_spans()
        parameter_array.append(data_spans["parameter"][0])
        Th_array.append(data_spans["T_h"][0])
        # back to initial temperature to avoid memory effect
        # later, should use the properties of SectionStudy here
        balance_engine_pose_table.solve_change_state(
            new_temperature=sagging_parameter
        )
    return {
        "temperatures": temperature_array.tolist(),
        "poseParams": parameter_array,
        "horizontalTensions": Th_array,
    }


def build_engine_pose_table(
    current_balance_engine: BalanceEngine,
) -> BalanceEngine:
    ruling_span_length = get_equivalent_span(current_balance_engine)
    new_section_array = SectionArray(
        pd.DataFrame(
            {
                "name": np.array(["1", "2"]),
                "suspension": np.array([False, False]),
                "conductor_attachment_altitude": np.array([0, 0]),
                "crossarm_length": np.array([0, 0]),
                "line_angle": np.array([0, 0]),
                "insulator_length": np.array([0.01, 0.01]),
                "span_length": np.array([ruling_span_length, np.nan]),
                "insulator_mass": np.array([0, 0]),
            }
        ),
        # Warning: assumes that sagging_parameter/sagging_temperature is the same accross all spans
        sagging_parameter=current_balance_engine.section_array.sagging_parameter[
            0
        ],
        sagging_temperature=current_balance_engine.section_array.sagging_temperature[
            0
        ],
    )

    return BalanceEngine(
        cable_array=current_balance_engine.cable_array,
        section_array=new_section_array,
    )


def get_equivalent_span(balance_engine: BalanceEngine) -> float:
    # Called "equivalent span" in stellar, but called "ruling span" in mechaphlowers
    return balance_engine.get_ruling_span_length()
