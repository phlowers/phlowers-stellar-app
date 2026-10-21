# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


# TODO: investigate to see if logging is imported correctly
import logging

from mechaphlowers import SectionStudy

from stellar_engine.entities.inputs import (
    ManipulationInputs,
    ModifyCableInputs,
    SpanManipInputs,
    SupportManipInputs,
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

    if modify_cable_inputs.modificationType == "lengthening":
        input_dict[
            modify_cable_inputs.spanIndex
        ] = -modify_cable_inputs.modifiedLengthCable
    elif modify_cable_inputs.modificationType == "shortening":
        input_dict[modify_cable_inputs.spanIndex] = (
            modify_cable_inputs.modifiedLengthCable
        )

    else:
        raise ValueError(
            f"Unsupported modificationType: {modify_cable_inputs.modificationType}. Expected 'lengthening' or 'shortening'"
        )
    study.manipulation.modify_cable(shorten_span=input_dict)
    study.solve_adjustment()  # in the long run: we should not need to run solve_adjustment, modify_cable() should suffice
    return {"success": True}


# API call
def apply_manipulations(
    inputs: dict,
    study: SectionStudy,
):
    manipulation_inputs = ManipulationInputs(**inputs)
    modify_cable_inputs, support_manip_inputs, span_manip_inputs = (
        manipulation_inputs.cableModifParams,
        manipulation_inputs.supportManipParams,
        manipulation_inputs.spanManipParams,
    )
    if len(modify_cable_inputs) > 0:
        apply_modif_cable(modify_cable_inputs, study)
    if len(support_manip_inputs) > 0:
        apply_support_manip(support_manip_inputs, study)
    if len(span_manip_inputs) > 0:
        apply_span_manip(span_manip_inputs, study)

    return {"success": True}


# TODO: check if multiple calls for manipulations overrides correctly for ALL manipulations
def apply_modif_cable(
    cable_modif_inputs: list[ModifyCableInputs], study: SectionStudy
):
    input_dict = {}
    for cable_modif in cable_modif_inputs:
        if cable_modif.modificationType == "lengthening":
            input_dict[
                cable_modif.spanIndex
            ] = -cable_modif.modifiedLengthCable
        elif cable_modif.modificationType == "shortening":
            input_dict[cable_modif.spanIndex] = cable_modif.modifiedLengthCable
        else:
            raise ValueError(
                f"Unsupported modificationType: {cable_modif.modificationType}. Expected 'lengthening' or 'shortening'"
            )
        study.modify_cable(shorten_span=input_dict)


def apply_support_manip(
    support_manip_inputs: list[SupportManipInputs], study: SectionStudy
):
    # altitude difference given:
    # relative + end of the arm (not attachment)
    modify_support_inputs = {}
    shifting_inputs = {}
    set_rope_or_chain_inputs = {}
    for support_manip in support_manip_inputs:
        span_index = support_manip.supportIndex
        # ------- manip1 --------
        if support_manip.manip1.type == 'crane':
            support_dict = {}
            chain_dict = {}
            if support_manip.manip1.lateralDistance:
                support_dict["y"] = support_manip.manip1.lateralDistance
            if support_manip.manip1.vertDisplacement:
                support_dict["z"] = support_manip.manip1.vertDisplacement
                chain_dict = {
                    "type": "chain",
                    "length": support_manip.manip1.vertDisplacement,
                }
                # TODO: manage case with chain -> use chain mass
                # currently uses default lineic mass from mechaphlowers
            modify_support_inputs[span_index] = support_dict
            set_rope_or_chain_inputs[span_index] = chain_dict

        # skip if None or length set to 0
        elif (
            support_manip.manip1.type == 'shifting'
            and support_manip.manip1.shiftingClampLength
        ):
            shifting_inputs[span_index] = (
                support_manip.manip1.shiftingClampLength
            )
        elif support_manip.manip1.type == 'rope':
            set_rope_or_chain_inputs[span_index] = {
                "type": "rope",
                "length": support_manip.manip1.ropeLength,
            }
            # TODO: manage case where lineic mass is given instead
            # currently uses default lineic mass from mechaphlowers

        # ------- manip2 --------
        # manips 1 and 2 are not supposed to be both shifting
        if (
            support_manip.manip2 is not None
            and support_manip.manip2.type == 'shifting'
            and support_manip.manip2.shiftingClampLength
            and not support_manip.manip1.type == 'shifting'
        ):
            shifting_inputs[span_index] = (
                support_manip.manip2.shiftingClampLength
            )

    study.modify_support(modify_support_inputs)
    study.modify_cable(shift_support=shifting_inputs)
    study.set_rope_or_chain(set_rope_or_chain_inputs)


def apply_span_manip(
    span_manip_inputs: list[SpanManipInputs], study: SectionStudy
):
    input_dict = {}
    for span_manip in span_manip_inputs:
        span_index = span_manip.spanIndex
        # side support reference
        if span_manip.referenceSupport == 'LEFT':
            hanging_cable_point_from_left_support = (
                span_manip.distanceToRefSupport
            )
        elif span_manip.referenceSupport == 'RIGHT':
            current_span_length = study._section_array.data[
                "span_length"
            ].to_numpy()[span_index]
            hanging_cable_point_from_left_support = (
                current_span_length - span_manip.distanceToRefSupport
            )
        else:
            raise ValueError

        # with sling or with chain
        if span_manip.anchoring == 'with_sling':
            insulator_length = span_manip.slingLength
            insulator_mass = 0
        elif span_manip.anchoring == 'with_chain':
            # TODO: manage anchoring "with_chain" case (soon)
            #
            raise NotImplementedError
        else:
            raise ValueError

        if span_manip.cableManipMethod == "pulley":
            # TODO: manage cableManipMethod "pulley" case (later)
            raise NotImplementedError
        current_dict = {
            "x": span_manip.longitudinalDistance,
            "y": span_manip.lateralDistance,
            "z": span_manip.altitude,
            "insulator_length": insulator_length,
            "insulator_mass": insulator_mass,
            "hanging_cable_point_from_left_support": hanging_cable_point_from_left_support,
        }
        input_dict[span_index] = current_dict
    study.set_virtual_support(input_dict)
