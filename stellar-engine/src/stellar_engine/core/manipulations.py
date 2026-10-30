# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


# TODO: investigate to see if logging is imported correctly
import logging

from mechaphlowers import SectionStudy

from stellar_engine.entities.errors import SelectorInputError
from stellar_engine.entities.inputs import (
    ModifyCableInputs,
    SpanManipInputs,
    SupportManipElement,
    SupportManipInputs,
)

logger = logging.getLogger("stellar_engine")


# API call
def apply_manipulations(
    inputs: dict,
    study: SectionStudy,
):
    """Python task called to apply manipulations.

    Will apply maniplation on `study` given as argument.

    `input` is a dictionary of three lists. Each list represents a type of manipulation, containing dictionaries.

    ```
    inputs = {
        'cableModifParams': [{...}, {...}],  # see ModifyCableInputs
        'supportManipParams': [{...}],  # see SupportManipInputs
        'spanManipParams': [{...}],  # see SpanManipInputs
    }
    ```

    See inputs.py or test_manipulations.py in order to see the format of the objects.

    """
    logger.debug(f"Applying manipulation: inputs: {inputs}")
    modify_cable_inputs, support_manip_inputs, span_manip_inputs = (
        parse_manip_inputs(inputs)
    )
    shorten_span_dict = apply_modif_cable(modify_cable_inputs)
    support_dict, shift_dict, rope_chain_dict = apply_support_manip(
        support_manip_inputs
    )
    virtual_support_dict = apply_span_manip(span_manip_inputs, study)

    # Do not run manipulations if empty dict in input + no manip stored
    manip = study.manipulation
    if (
        len(support_dict) > 0 or manip._support_overlay
    ):  # should be replaced by a property has_modified_supports
        manip.modify_support(support_dict)
    if len(rope_chain_dict) > 0 or manip._rope_or_chain_overlay:
        manip.set_rope_or_chain(rope_chain_dict)
    if (
        len(shorten_span_dict) > 0
        or len(shift_dict) > 0
        or manip.has_manipulations
    ):
        manip.modify_cable(
            shorten_span=shorten_span_dict, shift_support=shift_dict
        )
    if len(virtual_support_dict) > 0 or manip.has_virtual_support:
        manip.set_virtual_support(virtual_support_dict)
    if manip.has_manipulations:
        study.apply_manipulations()

    return {"success": True}


def parse_manip_inputs(inputs: dict):
    modify_cable_inputs = []
    for cable_modif in inputs["cableModifParams"]:
        modify_cable_inputs.append(ModifyCableInputs.from_dict(cable_modif))
    support_manip_inputs = []
    for support_manip in inputs["supportManipParams"]:
        manip1 = SupportManipElement.from_dict(support_manip["manip1"])
        manip2 = SupportManipElement.from_dict(support_manip["manip2"])
        support_manip_inputs.append(
            SupportManipInputs(support_manip["supportIndex"], manip1, manip2)
        )
    span_manip_inputs = []
    for span_manip in inputs["spanManipParams"]:
        span_manip_inputs.append(SpanManipInputs.from_dict(span_manip))
    return modify_cable_inputs, support_manip_inputs, span_manip_inputs


def apply_modif_cable(cable_modif_inputs: list[ModifyCableInputs]):
    input_dict = {}
    for cable_modif in cable_modif_inputs:
        if cable_modif.modifiedLengthCable == 0:
            pass
        if cable_modif.modificationType == "lengthening":
            input_dict[
                cable_modif.spanIndex
            ] = -cable_modif.modifiedLengthCable
        elif cable_modif.modificationType == "shortening":
            input_dict[cable_modif.spanIndex] = cable_modif.modifiedLengthCable
        else:
            raise SelectorInputError(
                f"Unsupported modificationType: {cable_modif.modificationType}. Expected 'lengthening' or 'shortening'"
            )
    return input_dict


def apply_support_manip(support_manip_inputs: list[SupportManipInputs]):
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
            # not None and not equal to zero
            if support_manip.manip1.lateralDistance:
                support_dict["y"] = support_manip.manip1.lateralDistance
            if support_manip.manip1.vertDisplacement:
                support_dict["z"] = support_manip.manip1.vertDisplacement
            # If no chain altitude taken as a reference is the arm altitude:
            # it will put the attachement altitude higher
            if support_manip.manip1.anchoring == 'without_chain':
                set_rope_or_chain_inputs[span_index] = {
                    "type": "chain",
                    "length": 0,
                    "mass": 0,
                }
            modify_support_inputs[span_index] = support_dict

        # skip if None or length set to 0
        elif (
            support_manip.manip1.type == 'shifting'
            and support_manip.manip1.shiftingClampLength
        ):
            shifting_inputs[span_index] = (
                support_manip.manip1.shiftingClampLength
            )
        elif (
            support_manip.manip1.type == 'rope'
            and support_manip.manip1.ropeLength
        ):
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
    return modify_support_inputs, shifting_inputs, set_rope_or_chain_inputs


def apply_span_manip(
    span_manip_inputs: list[SpanManipInputs], study: SectionStudy
):
    input_dict = {}
    for span_manip in span_manip_inputs:
        if (
            span_manip.distanceToRefSupport == 0
            or span_manip.longitudinalDistance == 0
        ):
            continue
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
            raise SelectorInputError(
                f"Unsupported referenceSupport: {span_manip.referenceSupport}. Expected 'LEFT' or 'RIGHT'"
            )

        # with sling or with chain
        if span_manip.anchoring == 'with_sling':
            insulator_length = span_manip.slingLength
            insulator_mass = 0
        elif span_manip.anchoring == 'with_chain':
            # TODO: manage anchoring "with_chain" case (soon)
            #
            raise NotImplementedError
        else:
            raise SelectorInputError(
                f"Unsupported anchoring value: {span_manip.anchoring}. Expected 'with_sling' or 'with_chain'"
            )

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
    return input_dict
