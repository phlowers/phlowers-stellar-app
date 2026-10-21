# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import numpy as np
from mechaphlowers import BalanceEngine, SectionStudy

from stellar_engine.core import manipulations
from stellar_engine.entities.inputs import (
    ModifyCableInputs,
    SpanManipInputs,
    SupportManipElement,
    SupportManipInputs,
)


def test_lengthen_cable(balance_engine_base: BalanceEngine):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )
    inputs = {
        'spanIndex': 0,
        'modificationType': 'lengthening',
        'modifiedLengthCable': 10,
        'distanceSupportRef': 0,
        'supportRef': 'LEFT',
    }
    study.solve_adjustment()
    study.solve_change_state()
    # plot_2d.refresh_projection(study)
    spans_coords_0 = study.position_engine.get_group_points().spans.coords
    extract_span_coords_0 = spans_coords_0[0][0:6]
    manipulations.modify_cable(inputs, study)

    spans_coords_1 = study.position_engine.get_group_points().spans.coords
    extract_span_coords_1 = spans_coords_1[0][0:6]

    assert not np.allclose(extract_span_coords_0, extract_span_coords_1)


def test_apply_manipulations_one_of_each(study_base: SectionStudy):
    study_base.solve_adjustment()
    study_base.solve_change_state()

    inputs = {
        'cableModifParams': [
            ModifyCableInputs(
                spanIndex=0,
                modificationType='shortening',
                modifiedLengthCable=1,
                distanceSupportRef=0,
                supportRef='LEFT',
            )
        ],
        'supportManipParams': [
            SupportManipInputs(
                supportIndex=1,
                manip1=SupportManipElement(
                    type='crane',
                    vertDisplacement=1,
                    anchoring='with_chain',
                    lateralDistance=0.5,
                    ropeLength=None,
                    shiftingClampLength=None,
                ),
                manip2=None,
            )
        ],
        'spanManipParams': [
            SpanManipInputs(
                spanIndex=0,
                referenceSupport='LEFT',
                cableManipType='with_a_crane',
                cableManipMethod='clamp',
                distanceToRefSupport=50,
                longitudinalDistance=0,
                lateralDistance=0,
                altitude=10,
                anchoring='with_sling',
                slingLength=1,
            )
        ],
    }

    manipulations.apply_manipulations(inputs, study_base)


def test_apply_manipulations_shortening(study_base: SectionStudy):
    study_base.solve_adjustment()
    previous_L_ref = study_base.balance_engine.L_ref

    inputs = {
        'cableModifParams': [
            ModifyCableInputs(
                spanIndex=1,
                modificationType='shortening',
                modifiedLengthCable=1,
                distanceSupportRef=0,
                supportRef='LEFT',
            )
        ],
        "supportManipParams": [],
        "spanManipParams": [],
    }

    manipulations.apply_manipulations(inputs, study_base)
    expected_L_ref = previous_L_ref + np.array([0, -1, 0])
    np.testing.assert_allclose(
        study_base.balance_engine.L_ref, expected_L_ref, rtol=1e-6
    )


def test_apply_manipulations_span_manip(study_base: SectionStudy):
    study_base.solve_adjustment()

    inputs = {
        'cableModifParams': [],
        "supportManipParams": [],
        "spanManipParams": [
            SpanManipInputs(
                spanIndex=0,
                referenceSupport='LEFT',
                cableManipType='with_a_crane',
                cableManipMethod='clamp',
                distanceToRefSupport=50,
                longitudinalDistance=0,
                lateralDistance=0,
                altitude=10,
                anchoring='with_sling',
                slingLength=1,
            )
        ],
    }

    manipulations.apply_manipulations(inputs, study_base)
    assert len(study_base.balance_engine.section_array.data["name"]) == 5


def test_inputs_validation():
    input_dict = {
        "type": "crane",
        "vertDisplacement": 0,
        "anchoring": "without_chain",
        "lateralDistance": None,
        "ropeLength": None,
        "shiftingClampLength": None,
    }
    SupportManipElement(**input_dict)


def test_inputs_validation_empty_object():
    element_dict = {
        "type": "crane",
        "vertDisplacement": 0,
        "anchoring": "without_chain",
        "lateralDistance": None,
        "ropeLength": None,
        "shiftingClampLength": None,
    }
    support_manip_element = SupportManipElement(**element_dict)
    input_dict = {
        "supportIndex": 0,
        "manip1": support_manip_element,
        "manip2": None,
    }
    SupportManipInputs(**input_dict)
