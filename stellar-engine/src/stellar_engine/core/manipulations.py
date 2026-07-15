# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


# TODO: investigate to see if logging is imported correctly
import logging

from mechaphlowers import SectionStudy

from stellar_engine.entities.inputs import (
    ModifyCableInputs,
)

logger = logging.getLogger("stellar_engine")
# Set logger level to WARNING so info messages are shown
# logger.setLevel(logging.WARNING) # TODO: not sure about the effect of this, but it seems to be necessary to see info messages in the console


def modify_cable(
    inputs: dict,
    study: SectionStudy,
):
    modify_cable_inputs = ModifyCableInputs(**inputs)
    logger.debug("python_inputs: %s", modify_cable_inputs)

    if study.manipulation.shortening_span is not None:
        current_modification_array = study.manipulation.shortening_span
        input_dict = {
            span_index: length_modification
            for span_index, length_modification in enumerate(
                current_modification_array
            )
        }
    else:
        input_dict = {}

    if modify_cable_inputs.widthCable == "lengthening":
        input_dict[
            modify_cable_inputs.spanIndex
        ] = -modify_cable_inputs.sizeCable
    elif modify_cable_inputs.widthCable == "shortening":
        input_dict[modify_cable_inputs.spanIndex] = (
            modify_cable_inputs.sizeCable
        )
    study.manipulation.modify_cable(shorten_span=input_dict)
    study.solve_adjustment()  # in the long run: we should not need to run solve_adjustment, modify_cable() should suffice
    print("------MODIFY CABLE------", study.manipulation.shortening_span)
    return {"success": True}
