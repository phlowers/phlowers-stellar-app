# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import numpy as np
from mechaphlowers import SectionStudy

from stellar_engine.core import manipulations
from stellar_engine.entities.inputs import (
    SupportManipElement,
    SupportManipInputs,
)


def test_apply_manipulations_all_manips(study_base: SectionStudy):
    study_base.solve_adjustment()
    study_base.solve_change_state()

    # inputs sent by stellar
    inputs = {
        'cableModifParams': [
            {
                'supportRef': 'LEFT',
                'modificationType': 'lengthening',
                'modifiedLengthCable': 10,
                'distanceSupportRef': 0,
                'spanIndex': 0,
            }
        ],
        'supportManipParams': [
            {
                'manip1': {
                    'type': 'crane',
                    'vertDisplacement': 10,
                    'anchoring': 'without_chain',
                    'lateralDistance': 5,
                    'ropeLength': None,
                    'shiftingClampLength': None,
                    'chainName': None,
                    'chainLength': None,
                    'chainWeight': None,
                    'chainSurface': None,
                    'counterWeight': None,
                },
                'manip2': None,
                'supportIndex': 0,
            }
        ],
        'spanManipParams': [
            {
                'referenceSupport': 'LEFT',
                'distanceToRefSupport': 100,
                'cableManipType': 'with_a_crane',
                'cableManipMethod': 'clamp',
                'longitudinalDistance': 1,
                'lateralDistance': 2,
                'altitude': 3,
                'anchoring': 'with_sling',
                'chainLength': None,
                'chainWeight': None,
                'chainSurface': None,
                'counterWeight': None,
                'slingLength': 5,
                'spanIndex': 0,
            }
        ],
    }

    manipulations.apply_manipulations(inputs, study_base)


def test_apply_manipulations_shortening(study_base: SectionStudy):
    study_base.solve_adjustment()
    previous_L_ref = study_base.balance_engine.L_ref

    inputs = {
        'cableModifParams': [
            {
                'supportRef': 'LEFT',
                'modificationType': 'lengthening',
                'modifiedLengthCable': 10,
                'distanceSupportRef': 0,
                'spanIndex': 1,
            }
        ],
        "supportManipParams": [],
        "spanManipParams": [],
    }

    manipulations.apply_manipulations(inputs, study_base)
    expected_L_ref = previous_L_ref + np.array([0, 10, 0])
    np.testing.assert_allclose(
        study_base.balance_engine.L_ref, expected_L_ref, rtol=1e-6
    )


def test_apply_manipulations_span_manip(study_base: SectionStudy):
    study_base.solve_adjustment()

    inputs = {
        'cableModifParams': [],
        "supportManipParams": [],
        "spanManipParams": [
            {
                'referenceSupport': 'LEFT',
                'distanceToRefSupport': 100,
                'cableManipType': 'with_a_crane',
                'cableManipMethod': 'clamp',
                'longitudinalDistance': 1,
                'lateralDistance': 2,
                'altitude': 3,
                'anchoring': 'with_sling',
                'chainLength': None,
                'chainWeight': None,
                'chainSurface': None,
                'counterWeight': None,
                'slingLength': 5,
                'spanIndex': 0,
            }
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
