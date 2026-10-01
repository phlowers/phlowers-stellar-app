# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

MOCK_HORIZONTAL_SIGHT_ANGLE = 100.0
MOCK_VERTICAL_SIGHT_ANGLE = 100.0


def calculate_cable_adjustment(inputs):
    """Compute the sighting angles (grades) at the mid-span sag for cable adjustment.

    MOCK — returns fixed values until the real formula is available (backlog BL-01).

    Expected input keys: spanIndex, spanLength, leftHorizontalAngle, rightHorizontalAngle,
    leftVerticalAngle, rightVerticalAngle, support ('LEFT' | 'RIGHT'),
    tacheometerHorizontalDistance, adjustmentParameter.
    """
    return {
        "horizontalSightAngle": MOCK_HORIZONTAL_SIGHT_ANGLE,
        "verticalSightAngle": MOCK_VERTICAL_SIGHT_ANGLE,
    }
