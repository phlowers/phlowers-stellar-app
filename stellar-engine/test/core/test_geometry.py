# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import numpy as np
from mechaphlowers import BalanceEngine, SectionStudy

from stellar_engine.core.geometry import measure_distance_angle


def test_measure_distance_angle_from_studio_tab_valid_input(
    balance_engine_base: BalanceEngine,
):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )
    dict_input = {
        'points': [
            {
                'supportUuid': '48a5c129-c9bd-4f93-95df-144686f96916',
                'supportIndex': 0,
                'name': 'aaa',
                'type': 'accessible_building',
                'altitudeType': 'absolute',
                'lateralDistanceType': 'SPAN_AXIS',
                'referenceSupport': 'LEFT',
                'positions': [
                    {'x': 0, 'y': 10, 'z': 10},
                    {'x': 0, 'y': 0, 'z': 10},
                    {'x': 10, 'y': 10, 'z': 10},
                ],
            },
        ],
        'startSupport': 0,
        'endSupport': 1,
        'view': '3d',
    }

    out = measure_distance_angle(
        inputs=dict_input,
        study=study,
        support_index=0,
    )

    out_expected = {
        "distance_1_2": 10.0,
        "distance_2_3": 14.142135623730951,
        "angle_1_2_3": 45.0,
    }

    np.testing.assert_allclose(
        out["distance_1_2"], out_expected["distance_1_2"]
    )
    np.testing.assert_allclose(
        out["distance_2_3"], out_expected["distance_2_3"]
    )
    np.testing.assert_allclose(out["angle_1_2_3"], out_expected["angle_1_2_3"])
