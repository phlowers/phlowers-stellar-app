# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


import numpy as np
from mechaphlowers import SupportShape


def get_support_coordinates(inputs): # pyodide.ffi
    coordinates = inputs["coordinates"]
    shape_values = np.array(coordinates)
    shape_set_number = np.array(inputs["attachmentSetNumbers"])

    pyl_shape = SupportShape(
        name="pyl",
        xyz_arms=shape_values,
        set_number=shape_set_number,
    )
    return {
        "shape_points": pyl_shape.support_points,
        "text_display_points": pyl_shape.labels_points,
        "text_to_display": pyl_shape.set_number,
    }
