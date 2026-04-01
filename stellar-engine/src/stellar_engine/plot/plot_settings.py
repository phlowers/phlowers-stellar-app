# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import mechaphlowers


def set_resolution(inputs):
    resolution = inputs["resolution"]
    mechaphlowers.options.graphics.resolution = resolution
    return {"success": True, "resolution": resolution}
