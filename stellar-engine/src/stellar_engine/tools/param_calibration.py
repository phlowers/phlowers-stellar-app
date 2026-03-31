# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import logging

from mechaphlowers import BalanceEngine, param_calibration

from stellar_engine.entities.inputs import ParameterCalibrationInputs

logger = logging.getLogger(__name__)


def parameter_15_without_wind(inputs: dict, engine: BalanceEngine):
    param_calibr_inputs = ParameterCalibrationInputs(**inputs)
    logger.debug("%s", param_calibr_inputs)
    param_result = param_calibration(
        measured_parameter=param_calibr_inputs.parameterPapoto,
        measured_temperature=param_calibr_inputs.cableTemperatureCalibration,
        section_array=engine.section_array,
        cable_array=engine.cable_array,
        span_index=param_calibr_inputs.span_index,
    )
    return {
        "parameter15CMinusUncertainty": None,
        "parameter15C": param_result,
        "parameter15CPlusUncertainty": None,
    }
